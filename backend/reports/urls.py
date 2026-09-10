from django.urls import path

from .views import (
    AdminSalesReportExportView,
    AdminSalesReportView,
)


app_name = "reports"


urlpatterns = [

    # =====================================================
    # Sales Report - JSON
    # =====================================================

    path(
        "sales/",
        AdminSalesReportView.as_view(),
        name="sales-report",
    ),

    # =====================================================
    # Sales Report - Excel Download
    # =====================================================

    path(
        "sales/export/",
        AdminSalesReportExportView.as_view(),
        name="sales-report-export",
    ),
]