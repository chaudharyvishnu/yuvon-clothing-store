from django.urls import path

from .views import (
    ActiveCouponListView,
    AdminCouponDetailView,
    AdminCouponListCreateView,
    AdminCouponToggleView,
    AdminCouponUsageListView,
    CouponApplyView,
)

app_name = "coupons"

urlpatterns = [
    # =========================================================
    # Customer Coupon APIs
    # =========================================================

    path(
        "active/",
        ActiveCouponListView.as_view(),
        name="active-coupon-list",
    ),

    path(
        "apply/",
        CouponApplyView.as_view(),
        name="coupon-apply",
    ),

    # =========================================================
    # Admin Coupon APIs
    # =========================================================

    path(
        "admin/",
        AdminCouponListCreateView.as_view(),
        name="admin-coupon-list-create",
    ),

    path(
        "admin/usages/",
        AdminCouponUsageListView.as_view(),
        name="admin-coupon-usage-list",
    ),

    path(
        "admin/<int:pk>/",
        AdminCouponDetailView.as_view(),
        name="admin-coupon-detail",
    ),

    path(
        "admin/<int:pk>/toggle/",
        AdminCouponToggleView.as_view(),
        name="admin-coupon-toggle",
    ),
]