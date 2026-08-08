from django.contrib import admin

from .models import (
    InventoryTransaction,
    InventorySettings,
    LowStockAlert,
)


# =========================================================
# Inventory Transaction
# =========================================================

@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "variant",
        "transaction_type",
        "quantity_change",
        "stock_before",
        "stock_after",
        "order",
        "created_by",
        "created_at",
    )

    list_filter = (
        "transaction_type",
        "created_at",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "variant__sku",
        "reference",
        "order__order_number",
    )

    readonly_fields = (
        "stock_after",
        "created_at",
    )

    autocomplete_fields = (
        "product",
        "variant",
        "order",
        "order_item",
        "created_by",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25


# =========================================================
# Inventory Settings
# =========================================================

@admin.register(InventorySettings)
class InventorySettingsAdmin(admin.ModelAdmin):
    list_display = (
        "low_stock_threshold",
        "allow_negative_stock",
        "auto_restore_on_cancel",
        "auto_restore_on_return",
        "auto_restore_on_refund",
        "updated_at",
    )

    readonly_fields = (
        "updated_at",
    )

    def has_add_permission(self, request):
        return not InventorySettings.objects.exists()


# =========================================================
# Low Stock Alerts
# =========================================================

@admin.register(LowStockAlert)
class LowStockAlertAdmin(admin.ModelAdmin):
    list_display = (
        "variant",
        "current_stock",
        "threshold",
        "is_active",
        "notified_at",
        "resolved_at",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "variant__sku",
        "variant__product__name",
    )

    autocomplete_fields = (
        "variant",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "notified_at",
        "resolved_at",
    )

    ordering = (
        "current_stock",
    )

    list_per_page = 25