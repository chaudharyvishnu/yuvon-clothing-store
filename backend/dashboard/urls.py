from django.urls import path

from .views import (
    AdminDashboardView,
    DashboardChartsView,
    DashboardCouponsView,
    DashboardCustomersView,
    DashboardDetailsView,
    DashboardOrdersView,
    DashboardOverviewView,
    DashboardPaymentsView,
    DashboardProductsView,
    DashboardRecentActivityView,
    DashboardReviewsView,
    DashboardSalesView,
    DashboardSummaryView,
)


app_name = "dashboard"


urlpatterns = [

    # =========================================================
    # Fast Dashboard Summary
    # =========================================================

    path(
        "summary/",
        DashboardSummaryView.as_view(),
        name="summary",
    ),


    # =========================================================
    # Dashboard Details
    # =========================================================

    path(
        "details/",
        DashboardDetailsView.as_view(),
        name="details",
    ),


    # =========================================================
    # Complete Dashboard
    # =========================================================

    path(
        "",
        AdminDashboardView.as_view(),
        name="dashboard",
    ),


    # =========================================================
    # Overview
    # =========================================================

    path(
        "overview/",
        DashboardOverviewView.as_view(),
        name="overview",
    ),


    # =========================================================
    # Sales
    # =========================================================

    path(
        "sales/",
        DashboardSalesView.as_view(),
        name="sales",
    ),


    # =========================================================
    # Orders
    # =========================================================

    path(
        "orders/",
        DashboardOrdersView.as_view(),
        name="orders",
    ),


    # =========================================================
    # Payments
    # =========================================================

    path(
        "payments/",
        DashboardPaymentsView.as_view(),
        name="payments",
    ),


    # =========================================================
    # Products & Inventory
    # =========================================================

    path(
        "products/",
        DashboardProductsView.as_view(),
        name="products",
    ),


    # =========================================================
    # Customers
    # =========================================================

    path(
        "customers/",
        DashboardCustomersView.as_view(),
        name="customers",
    ),


    # =========================================================
    # Coupons
    # =========================================================

    path(
        "coupons/",
        DashboardCouponsView.as_view(),
        name="coupons",
    ),


    # =========================================================
    # Reviews
    # =========================================================

    path(
        "reviews/",
        DashboardReviewsView.as_view(),
        name="reviews",
    ),


    # =========================================================
    # Charts
    # =========================================================

    path(
        "charts/",
        DashboardChartsView.as_view(),
        name="charts",
    ),


    # =========================================================
    # Recent Activity
    # =========================================================

    path(
        "recent-activity/",
        DashboardRecentActivityView.as_view(),
        name="recent-activity",
    ),

]