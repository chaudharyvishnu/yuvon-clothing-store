"""
Inventory service layer.

Place this file at:
    backend/inventory/services.py
"""

from dataclasses import dataclass
from typing import Iterable, Optional

from django.db import transaction
from django.db.models import F

from products.models import ProductVariant


class InventoryError(Exception):
    """Base exception for inventory operations."""


class VariantNotFoundError(InventoryError):
    """Raised when a requested product variant does not exist."""


class InsufficientStockError(InventoryError):
    """Raised when requested quantity is greater than available stock."""

    def __init__(
        self,
        *,
        variant_id,
        requested_quantity,
        available_quantity,
        product_name="Product",
    ):
        self.variant_id = variant_id
        self.requested_quantity = requested_quantity
        self.available_quantity = available_quantity
        self.product_name = product_name

        super().__init__(
            f"Only {available_quantity} item(s) are available "
            f"for {product_name}."
        )


@dataclass(frozen=True)
class StockChangeResult:
    variant_id: int
    previous_stock: int
    changed_by: int
    current_stock: int


def _normalize_quantity(quantity):
    try:
        normalized = int(quantity)
    except (TypeError, ValueError) as exc:
        raise InventoryError(
            "Stock quantity must be a valid integer."
        ) from exc

    if normalized < 1:
        raise InventoryError(
            "Stock quantity must be at least 1."
        )

    return normalized


def _get_locked_variant(variant_id):
    variant = (
        ProductVariant.objects
        .select_for_update()
        .select_related("product")
        .filter(
            pk=variant_id,
            is_active=True,
        )
        .first()
    )

    if variant is None:
        raise VariantNotFoundError(
            f"Active product variant with ID {variant_id} was not found."
        )

    return variant


def _variant_product_name(variant):
    product = getattr(
        variant,
        "product",
        None,
    )

    return (
        getattr(product, "name", "")
        or getattr(variant, "name", "")
        or "Product"
    )


def validate_variant_stock(
    *,
    variant_id,
    quantity,
):
    """
    Check whether a variant has enough stock.

    This function does not change stock.
    """
    quantity = _normalize_quantity(
        quantity
    )

    variant = (
        ProductVariant.objects
        .select_related("product")
        .filter(
            pk=variant_id,
            is_active=True,
        )
        .first()
    )

    if variant is None:
        raise VariantNotFoundError(
            f"Active product variant with ID {variant_id} was not found."
        )

    available_stock = max(
        0,
        int(variant.stock or 0),
    )

    if available_stock < quantity:
        raise InsufficientStockError(
            variant_id=variant.pk,
            requested_quantity=quantity,
            available_quantity=available_stock,
            product_name=_variant_product_name(
                variant
            ),
        )

    return True


@transaction.atomic
def deduct_variant_stock(
    *,
    variant_id,
    quantity,
):
    """
    Atomically deduct stock from one variant.
    """
    quantity = _normalize_quantity(
        quantity
    )

    variant = _get_locked_variant(
        variant_id
    )

    previous_stock = max(
        0,
        int(variant.stock or 0),
    )

    if previous_stock < quantity:
        raise InsufficientStockError(
            variant_id=variant.pk,
            requested_quantity=quantity,
            available_quantity=previous_stock,
            product_name=_variant_product_name(
                variant
            ),
        )

    ProductVariant.objects.filter(
        pk=variant.pk,
    ).update(
        stock=F("stock") - quantity
    )

    variant.refresh_from_db(
        fields=["stock"]
    )

    return StockChangeResult(
        variant_id=variant.pk,
        previous_stock=previous_stock,
        changed_by=-quantity,
        current_stock=int(
            variant.stock or 0
        ),
    )


@transaction.atomic
def deduct_stock_for_items(
    items: Iterable,
):
    """
    Atomically deduct stock for multiple cart/order items.
    """
    prepared_items = []

    for item in items:
        if isinstance(item, dict):
            variant_id = (
                item.get("variant_id")
                or getattr(
                    item.get("variant"),
                    "id",
                    None,
                )
            )
            quantity = item.get(
                "quantity",
                1,
            )
        else:
            variant_id = (
                getattr(
                    item,
                    "variant_id",
                    None,
                )
                or getattr(
                    getattr(
                        item,
                        "variant",
                        None,
                    ),
                    "id",
                    None,
                )
            )
            quantity = getattr(
                item,
                "quantity",
                1,
            )

        if not variant_id:
            continue

        prepared_items.append(
            (
                int(variant_id),
                _normalize_quantity(
                    quantity
                ),
            )
        )

    combined = {}

    for variant_id, quantity in prepared_items:
        combined[variant_id] = (
            combined.get(
                variant_id,
                0,
            )
            + quantity
        )

    results = []

    for variant_id in sorted(
        combined
    ):
        results.append(
            deduct_variant_stock(
                variant_id=variant_id,
                quantity=combined[
                    variant_id
                ],
            )
        )

    return results


@transaction.atomic
def restore_variant_stock(
    *,
    variant_id,
    quantity,
):
    """
    Atomically restore stock to one variant.
    """
    quantity = _normalize_quantity(
        quantity
    )

    variant = (
        ProductVariant.objects
        .select_for_update()
        .filter(
            pk=variant_id,
        )
        .first()
    )

    if variant is None:
        raise VariantNotFoundError(
            f"Product variant with ID {variant_id} was not found."
        )

    previous_stock = max(
        0,
        int(variant.stock or 0),
    )

    ProductVariant.objects.filter(
        pk=variant.pk,
    ).update(
        stock=F("stock") + quantity
    )

    variant.refresh_from_db(
        fields=["stock"]
    )

    return StockChangeResult(
        variant_id=variant.pk,
        previous_stock=previous_stock,
        changed_by=quantity,
        current_stock=int(
            variant.stock or 0
        ),
    )


@transaction.atomic
def restore_stock_for_order(
    order,
    *,
    previous_status: Optional[str] = None,
):
    """
    Restore stock for a cancelled, returned, or refunded order.

    Pass previous_status whenever possible to avoid duplicate restoration.
    """
    restorable_statuses = {
        "cancelled",
        "returned",
        "refunded",
    }

    current_status = str(
        getattr(
            order,
            "status",
            "",
        )
    ).strip().lower()

    if current_status not in restorable_statuses:
        raise InventoryError(
            "Stock can only be restored for cancelled, "
            "returned, or refunded orders."
        )

    if (
        previous_status
        and str(
            previous_status
        ).strip().lower()
        in restorable_statuses
    ):
        return []

    order_items = (
        order.items
        .select_related("variant")
        .all()
    )

    combined = {}

    for item in order_items:
        variant_id = getattr(
            item,
            "variant_id",
            None,
        )

        if not variant_id:
            continue

        quantity = _normalize_quantity(
            getattr(
                item,
                "quantity",
                1,
            )
        )

        combined[variant_id] = (
            combined.get(
                variant_id,
                0,
            )
            + quantity
        )

    results = []

    for variant_id in sorted(
        combined
    ):
        results.append(
            restore_variant_stock(
                variant_id=variant_id,
                quantity=combined[
                    variant_id
                ],
            )
        )

    return results


@transaction.atomic
def adjust_variant_stock(
    *,
    variant_id,
    adjustment,
):
    """
    Manually increase or decrease stock.
    """
    try:
        adjustment = int(
            adjustment
        )
    except (TypeError, ValueError) as exc:
        raise InventoryError(
            "Stock adjustment must be a valid integer."
        ) from exc

    if adjustment == 0:
        raise InventoryError(
            "Stock adjustment cannot be zero."
        )

    variant = (
        ProductVariant.objects
        .select_for_update()
        .select_related("product")
        .filter(
            pk=variant_id,
        )
        .first()
    )

    if variant is None:
        raise VariantNotFoundError(
            f"Product variant with ID {variant_id} was not found."
        )

    previous_stock = max(
        0,
        int(variant.stock or 0),
    )

    current_stock = (
        previous_stock
        + adjustment
    )

    if current_stock < 0:
        raise InsufficientStockError(
            variant_id=variant.pk,
            requested_quantity=abs(
                adjustment
            ),
            available_quantity=previous_stock,
            product_name=_variant_product_name(
                variant
            ),
        )

    variant.stock = current_stock
    variant.save(
        update_fields=["stock"]
    )

    return StockChangeResult(
        variant_id=variant.pk,
        previous_stock=previous_stock,
        changed_by=adjustment,
        current_stock=current_stock,
    )
