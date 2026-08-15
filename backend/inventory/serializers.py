from rest_framework import serializers

from products.models import ProductVariant

from .models import (
    InventorySettings,
    InventoryTransaction,
    LowStockAlert,
)


class InventorySerializer(serializers.ModelSerializer):
    """
    Inventory representation backed by ProductVariant.

    ProductVariant.stock is the single source of truth for stock.
    """

    variant_id = serializers.IntegerField(
        source="id",
        read_only=True,
    )

    product_id = serializers.IntegerField(
        read_only=True,
    )

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    product_sku = serializers.CharField(
        source="product.sku",
        read_only=True,
        allow_null=True,
    )

    variant_sku = serializers.CharField(
        source="sku",
        read_only=True,
        allow_null=True,
    )

    available_stock = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()
    low_stock_threshold = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant

        fields = (
            "variant_id",
            "product_id",
            "product_name",
            "product_sku",
            "variant_sku",
            "color",
            "color_code",
            "size",
            "stock",
            "available_stock",
            "low_stock_threshold",
            "is_low_stock",
            "is_out_of_stock",
            "is_active",
        )

        read_only_fields = fields

    def _get_threshold(self):
        threshold = self.context.get(
            "low_stock_threshold"
        )

        if threshold is None:
            threshold = (
                InventorySettings.load()
                .low_stock_threshold
            )

        return max(
            0,
            int(threshold),
        )

    def get_available_stock(
        self,
        obj,
    ):
        return max(
            0,
            int(
                obj.stock or 0
            ),
        )

    def get_low_stock_threshold(
        self,
        obj,
    ):
        return self._get_threshold()

    def get_is_low_stock(
        self,
        obj,
    ):
        stock = self.get_available_stock(
            obj
        )

        return (
            0
            < stock
            <= self._get_threshold()
        )

    def get_is_out_of_stock(
        self,
        obj,
    ):
        return (
            self.get_available_stock(
                obj
            )
            == 0
        )


# =========================================================
# Inventory Transaction
# =========================================================

class InventoryTransactionSerializer(
    serializers.ModelSerializer
):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    product_sku = serializers.CharField(
        source="product.sku",
        read_only=True,
        allow_null=True,
    )

    variant_sku = serializers.CharField(
        source="variant.sku",
        read_only=True,
        allow_null=True,
    )

    variant_color = serializers.CharField(
        source="variant.color",
        read_only=True,
        allow_null=True,
    )

    variant_size = serializers.CharField(
        source="variant.size",
        read_only=True,
        allow_null=True,
    )

    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display",
        read_only=True,
    )

    created_by_email = serializers.EmailField(
        source="created_by.email",
        read_only=True,
        allow_null=True,
    )

    is_stock_in = serializers.BooleanField(
        read_only=True,
    )

    is_stock_out = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = InventoryTransaction

        fields = (
            "id",
            "variant",
            "variant_sku",
            "variant_color",
            "variant_size",

            "product",
            "product_name",
            "product_sku",

            "order",
            "order_item",

            "transaction_type",
            "transaction_type_display",

            "quantity_change",
            "stock_before",
            "stock_after",

            "is_stock_in",
            "is_stock_out",

            "reference",
            "note",
            "metadata",

            "created_by",
            "created_by_email",

            "created_at",
        )

        read_only_fields = fields


# =========================================================
# Stock Adjustment
# =========================================================

class StockAdjustmentSerializer(
    serializers.Serializer
):
    variant_id = serializers.IntegerField(
        min_value=1,
    )

    adjustment_type = serializers.ChoiceField(
        choices=(
            (
                "add",
                "Add Stock",
            ),
            (
                "remove",
                "Remove Stock",
            ),
            (
                "set",
                "Set Stock",
            ),
        )
    )

    quantity = serializers.IntegerField(
        min_value=0,
    )

    transaction_type = serializers.ChoiceField(
        choices=(
            InventoryTransaction
            .TRANSACTION_TYPE_CHOICES
        ),
        required=False,
    )

    reference = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    note = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    metadata = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_variant_id(
        self,
        value,
    ):
        variant = (
            ProductVariant.objects
            .select_related(
                "product"
            )
            .filter(
                pk=value
            )
            .first()
        )

        if variant is None:
            raise serializers.ValidationError(
                "Product variant was not found."
            )

        self.context[
            "variant_object"
        ] = variant

        return value

    def validate(
        self,
        attrs,
    ):
        variant = self.context.get(
            "variant_object"
        )

        adjustment_type = attrs[
            "adjustment_type"
        ]

        quantity = attrs[
            "quantity"
        ]

        if (
            adjustment_type
            in {
                "add",
                "remove",
            }
            and quantity < 1
        ):
            raise serializers.ValidationError(
                {
                    "quantity": (
                        "Quantity must be at least 1 "
                        "for add or remove."
                    )
                }
            )

        current_stock = max(
            0,
            int(
                getattr(
                    variant,
                    "stock",
                    0,
                )
                or 0
            ),
        )

        if (
            adjustment_type
            == "remove"
            and quantity
            > current_stock
        ):
            raise serializers.ValidationError(
                {
                    "quantity": (
                        "Cannot remove more than "
                        "the current stock."
                    )
                }
            )

        if (
            "transaction_type"
            not in attrs
        ):
            attrs[
                "transaction_type"
            ] = (
                "manual_decrease"
                if adjustment_type
                == "remove"
                else "manual_increase"
            )

        return attrs

    def get_stock_change(
        self,
    ):
        if not hasattr(
            self,
            "validated_data",
        ):
            raise AssertionError(
                "Call is_valid() before "
                "get_stock_change()."
            )

        variant = self.context[
            "variant_object"
        ]

        current_stock = max(
            0,
            int(
                variant.stock
                or 0
            ),
        )

        adjustment_type = (
            self.validated_data[
                "adjustment_type"
            ]
        )

        quantity = (
            self.validated_data[
                "quantity"
            ]
        )

        if adjustment_type == "add":
            quantity_change = quantity

        elif adjustment_type == "remove":
            quantity_change = -quantity

        else:
            quantity_change = (
                quantity
                - current_stock
            )

        return {
            "variant":
                variant,

            "stock_before":
                current_stock,

            "stock_after":
                (
                    current_stock
                    + quantity_change
                ),

            "quantity_change":
                quantity_change,
        }


# =========================================================
# Inventory Settings
# =========================================================

class InventorySettingsSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = InventorySettings

        fields = (
            "id",
            "low_stock_threshold",
            "allow_negative_stock",
            "auto_restore_on_cancel",
            "auto_restore_on_return",
            "auto_restore_on_refund",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "updated_at",
        )


# =========================================================
# Low Stock Alert
# =========================================================

class LowStockAlertSerializer(
    serializers.ModelSerializer
):
    product_id = serializers.IntegerField(
        source="variant.product_id",
        read_only=True,
    )

    product_name = serializers.CharField(
        source="variant.product.name",
        read_only=True,
    )

    product_sku = serializers.CharField(
        source="variant.product.sku",
        read_only=True,
        allow_null=True,
    )

    variant_sku = serializers.CharField(
        source="variant.sku",
        read_only=True,
        allow_null=True,
    )

    color = serializers.CharField(
        source="variant.color",
        read_only=True,
        allow_null=True,
    )

    size = serializers.CharField(
        source="variant.size",
        read_only=True,
        allow_null=True,
    )

    is_low_stock = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = LowStockAlert

        fields = (
            "id",
            "variant",

            "product_id",
            "product_name",
            "product_sku",

            "variant_sku",
            "color",
            "size",

            "current_stock",
            "threshold",
            "is_low_stock",
            "is_active",

            "notified_at",
            "resolved_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = fields


# =========================================================
# Inventory Summary
# =========================================================

class InventorySummarySerializer(
    serializers.Serializer
):
    total_products = serializers.IntegerField(
        read_only=True,
    )

    total_variants = serializers.IntegerField(
        read_only=True,
    )

    active_variants = serializers.IntegerField(
        read_only=True,
    )

    total_stock = serializers.IntegerField(
        read_only=True,
    )

    low_stock_variants = serializers.IntegerField(
        read_only=True,
    )

    out_of_stock_variants = serializers.IntegerField(
        read_only=True,
    )

    low_stock_threshold = serializers.IntegerField(
        read_only=True,
    )