from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404

from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product, ProductVariant

from .models import InventorySettings, InventoryTransaction, LowStockAlert
from .serializers import (
    InventorySerializer,
    InventorySettingsSerializer,
    InventorySummarySerializer,
    InventoryTransactionSerializer,
    LowStockAlertSerializer,
    StockAdjustmentSerializer,
)


class IsAdminOrStaff(permissions.BasePermission):
    """Allow access only to authenticated staff or superusers."""

    message = "Admin or staff access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        )


class InventoryQuerysetMixin:
    """Shared ProductVariant queryset and serializer context."""

    def get_queryset(self):
        queryset = ProductVariant.objects.select_related(
            "product",
            "product__brand",
            "product__category",
        )

        is_active = self.request.query_params.get("is_active")
        product_id = self.request.query_params.get("product")
        brand_id = self.request.query_params.get("brand")
        category_id = self.request.query_params.get("category")
        stock_status = self.request.query_params.get("stock_status")

        if is_active is not None:
            normalized = str(is_active).strip().lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)

        if product_id:
            queryset = queryset.filter(product_id=product_id)

        if brand_id:
            queryset = queryset.filter(product__brand_id=brand_id)

        if category_id:
            queryset = queryset.filter(product__category_id=category_id)

        settings_obj = InventorySettings.load()
        threshold = settings_obj.low_stock_threshold

        if stock_status == "in_stock":
            queryset = queryset.filter(stock__gt=0)
        elif stock_status == "low_stock":
            queryset = queryset.filter(stock__gt=0, stock__lte=threshold)
        elif stock_status == "out_of_stock":
            queryset = queryset.filter(stock=0)

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["low_stock_threshold"] = (
            InventorySettings.load().low_stock_threshold
        )
        return context


class InventoryListView(InventoryQuerysetMixin, generics.ListAPIView):
    """
    GET /api/inventory/

    List product variants with their current stock.
    """

    serializer_class = InventorySerializer
    permission_classes = (IsAdminOrStaff,)
    filter_backends = (
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    search_fields = (
        "product__name",
        "product__sku",
        "sku",
        "color",
        "size",
    )
    ordering_fields = (
        "stock",
        "product__name",
        "sku",
        "id",
    )
    ordering = ("product__name", "id")


class InventoryDetailView(InventoryQuerysetMixin, generics.RetrieveAPIView):
    """
    GET /api/inventory/<variant_id>/

    Return stock details for one product variant.
    """

    serializer_class = InventorySerializer
    permission_classes = (IsAdminOrStaff,)
    lookup_url_kwarg = "variant_id"


class LowStockInventoryListView(InventoryQuerysetMixin, generics.ListAPIView):
    """
    GET /api/inventory/low-stock/

    List active variants whose stock is above zero but at or below the
    configured low-stock threshold.
    """

    serializer_class = InventorySerializer
    permission_classes = (IsAdminOrStaff,)
    filter_backends = (
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    search_fields = (
        "product__name",
        "product__sku",
        "sku",
        "color",
        "size",
    )
    ordering_fields = ("stock", "product__name", "sku")
    ordering = ("stock", "product__name")

    def get_queryset(self):
        threshold = InventorySettings.load().low_stock_threshold
        return (
            super()
            .get_queryset()
            .filter(
                is_active=True,
                product__is_active=True,
                stock__gt=0,
                stock__lte=threshold,
            )
        )


class OutOfStockInventoryListView(
    InventoryQuerysetMixin,
    generics.ListAPIView,
):
    """
    GET /api/inventory/out-of-stock/

    List active variants with zero stock.
    """

    serializer_class = InventorySerializer
    permission_classes = (IsAdminOrStaff,)
    filter_backends = (
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    search_fields = (
        "product__name",
        "product__sku",
        "sku",
        "color",
        "size",
    )
    ordering_fields = ("product__name", "sku", "id")
    ordering = ("product__name", "id")

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                is_active=True,
                product__is_active=True,
                stock=0,
            )
        )


class InventorySummaryView(APIView):
    """
    GET /api/inventory/summary/

    Return inventory dashboard totals.
    """

    permission_classes = (IsAdminOrStaff,)

    def get(self, request):
        settings_obj = InventorySettings.load()
        threshold = settings_obj.low_stock_threshold

        active_variants = ProductVariant.objects.filter(
            is_active=True,
            product__is_active=True,
        )

        totals = active_variants.aggregate(
            active_variants=Count("id"),
            total_stock=Coalesce(Sum("stock"), 0),
        )

        data = {
            "total_products": Product.objects.count(),
            "total_variants": ProductVariant.objects.count(),
            "active_variants": totals["active_variants"],
            "total_stock": totals["total_stock"],
            "low_stock_variants": active_variants.filter(
                stock__gt=0,
                stock__lte=threshold,
            ).count(),
            "out_of_stock_variants": active_variants.filter(
                stock=0,
            ).count(),
            "low_stock_threshold": threshold,
        }

        serializer = InventorySummarySerializer(data)
        return Response(serializer.data)


class InventoryTransactionListView(generics.ListAPIView):
    """
    GET /api/inventory/transactions/

    List inventory movement history.
    """

    serializer_class = InventoryTransactionSerializer
    permission_classes = (IsAdminOrStaff,)
    filter_backends = (
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    search_fields = (
        "product__name",
        "product__sku",
        "variant__sku",
        "reference",
        "note",
    )
    ordering_fields = (
        "created_at",
        "quantity_change",
        "stock_before",
        "stock_after",
    )
    ordering = ("-created_at",)

    def get_queryset(self):
        queryset = InventoryTransaction.objects.select_related(
            "variant",
            "product",
            "order",
            "order_item",
            "created_by",
        )

        variant_id = self.request.query_params.get("variant")
        product_id = self.request.query_params.get("product")
        order_id = self.request.query_params.get("order")
        transaction_type = self.request.query_params.get(
            "transaction_type"
        )
        stock_direction = self.request.query_params.get("direction")

        if variant_id:
            queryset = queryset.filter(variant_id=variant_id)

        if product_id:
            queryset = queryset.filter(product_id=product_id)

        if order_id:
            queryset = queryset.filter(order_id=order_id)

        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)

        if stock_direction == "in":
            queryset = queryset.filter(quantity_change__gt=0)
        elif stock_direction == "out":
            queryset = queryset.filter(quantity_change__lt=0)

        return queryset


class StockAdjustmentView(APIView):
    """
    POST /api/inventory/adjust/

    Add, remove, or set stock for a product variant and record the movement.
    """

    permission_classes = (IsAdminOrStaff,)

    @transaction.atomic
    def post(self, request):
        serializer = StockAdjustmentSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        change = serializer.get_stock_change()
        variant = ProductVariant.objects.select_for_update().select_related(
            "product"
        ).get(pk=change["variant"].pk)

        # Recalculate after locking so concurrent adjustments cannot overwrite
        # one another.
        current_stock = max(0, int(variant.stock or 0))
        adjustment_type = serializer.validated_data["adjustment_type"]
        quantity = serializer.validated_data["quantity"]

        if adjustment_type == "add":
            quantity_change = quantity
        elif adjustment_type == "remove":
            quantity_change = -quantity
        else:
            quantity_change = quantity - current_stock

        settings_obj = InventorySettings.load()
        new_stock = current_stock + quantity_change

        if new_stock < 0 and not settings_obj.allow_negative_stock:
            return Response(
                {
                    "quantity": [
                        "This adjustment would make stock negative."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity_change == 0:
            return Response(
                {
                    "quantity": [
                        "The requested stock value is already set."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant.stock = new_stock
        variant.save(update_fields=["stock"])

        inventory_transaction = InventoryTransaction.objects.create(
            variant=variant,
            product=variant.product,
            transaction_type=serializer.validated_data[
                "transaction_type"
            ],
            quantity_change=quantity_change,
            stock_before=current_stock,
            reference=serializer.validated_data.get("reference", ""),
            note=serializer.validated_data.get("note", ""),
            metadata=serializer.validated_data.get("metadata", {}),
            created_by=request.user,
        )

        self._sync_low_stock_alert(
            variant=variant,
            threshold=settings_obj.low_stock_threshold,
        )

        return Response(
            {
                "message": "Stock updated successfully.",
                "inventory": InventorySerializer(
                    variant,
                    context={
                        "request": request,
                        "low_stock_threshold": (
                            settings_obj.low_stock_threshold
                        ),
                    },
                ).data,
                "transaction": InventoryTransactionSerializer(
                    inventory_transaction,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _sync_low_stock_alert(*, variant, threshold):
        current_stock = max(0, int(variant.stock or 0))
        should_alert = current_stock <= threshold

        alert = LowStockAlert.objects.filter(variant=variant).first()

        if should_alert:
            if alert is None:
                LowStockAlert.objects.create(
                    variant=variant,
                    current_stock=current_stock,
                    threshold=threshold,
                    is_active=True,
                )
                return

            alert.current_stock = current_stock
            alert.threshold = threshold
            alert.is_active = True
            alert.resolved_at = None
            alert.save(
                update_fields=(
                    "current_stock",
                    "threshold",
                    "is_active",
                    "resolved_at",
                    "updated_at",
                )
            )
            return

        if alert is not None:
            alert.current_stock = current_stock
            alert.threshold = threshold
            alert.save(
                update_fields=(
                    "current_stock",
                    "threshold",
                    "updated_at",
                )
            )
            if alert.is_active:
                alert.resolve()


class LowStockAlertListView(generics.ListAPIView):
    """
    GET /api/inventory/alerts/

    List stored low-stock alerts.
    """

    serializer_class = LowStockAlertSerializer
    permission_classes = (IsAdminOrStaff,)
    filter_backends = (
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    search_fields = (
        "variant__product__name",
        "variant__product__sku",
        "variant__sku",
    )
    ordering_fields = (
        "current_stock",
        "threshold",
        "created_at",
        "updated_at",
    )
    ordering = ("current_stock", "-updated_at")

    def get_queryset(self):
        queryset = LowStockAlert.objects.select_related(
            "variant",
            "variant__product",
        )

        is_active = self.request.query_params.get("is_active")

        if is_active is not None:
            normalized = str(is_active).strip().lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)

        return queryset


class InventorySettingsView(APIView):
    """
    GET/PATCH /api/inventory/settings/

    Read or update singleton inventory settings.
    """

    permission_classes = (IsAdminOrStaff,)

    def get(self, request):
        settings_obj = InventorySettings.load()
        serializer = InventorySettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = InventorySettings.load()
        serializer = InventorySettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": "Inventory settings updated successfully.",
                "settings": serializer.data,
            }
        )
