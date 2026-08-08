from django.urls import path

from .views import (
    InventoryDetailView,
    InventoryListView,
    InventorySettingsView,
    InventorySummaryView,
    InventoryTransactionListView,
    LowStockAlertListView,
    LowStockInventoryListView,
    OutOfStockInventoryListView,
    StockAdjustmentView,
)


app_name = "inventory"


urlpatterns = [
    # Inventory dashboard and stock lists
    path(
        "",
        InventoryListView.as_view(),
        name="inventory-list",
    ),
    path(
        "summary/",
        InventorySummaryView.as_view(),
        name="inventory-summary",
    ),
    path(
        "low-stock/",
        LowStockInventoryListView.as_view(),
        name="low-stock-list",
    ),
    path(
        "out-of-stock/",
        OutOfStockInventoryListView.as_view(),
        name="out-of-stock-list",
    ),

    # Stock changes and movement history
    path(
        "adjust/",
        StockAdjustmentView.as_view(),
        name="stock-adjustment",
    ),
    path(
        "transactions/",
        InventoryTransactionListView.as_view(),
        name="inventory-transaction-list",
    ),

    # Low-stock alerts and inventory configuration
    path(
        "alerts/",
        LowStockAlertListView.as_view(),
        name="low-stock-alert-list",
    ),
    path(
        "settings/",
        InventorySettingsView.as_view(),
        name="inventory-settings",
    ),

    # Keep this dynamic route last so it does not capture static paths.
    path(
        "<int:variant_id>/",
        InventoryDetailView.as_view(),
        name="inventory-detail",
    ),
]
