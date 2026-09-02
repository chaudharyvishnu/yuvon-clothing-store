from django.urls import path

from .views import (
    AdminDashboardSummaryView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderShippingView,
    AdminOrderStatusUpdateView,
    AdminOrderUpdateView,

    # Shiprocket Admin Views
    AdminShiprocketAssignAWBView,
    AdminShiprocketCreateOrderView,
    AdminShiprocketLabelView,
    AdminShiprocketManifestView,
    AdminShiprocketPickupView,
    AdminShiprocketServiceabilityView,
    AdminShiprocketTrackingView,

    CancelOrderView,
    CheckoutView,
    GuestOrderLookupView,
    InvoiceDownloadView,
    MyOrderDetailView,
    MyOrderListView,
    MyOrderTrackingView,
    RazorpayCreateOrderView,
    RazorpayFailureView,
    RazorpayVerifyPaymentView,
    ShippingAddressDetailView,
    ShippingAddressListCreateView,
)

from .shipping_labels import AdminShippingLabelView


urlpatterns = [
    # =====================================================
    # Checkout
    # =====================================================
    path(
        "checkout/",
        CheckoutView.as_view(),
        name="checkout",
    ),

    # =====================================================
    # Razorpay Payments
    # =====================================================
    path(
        "payments/razorpay/create-order/",
        RazorpayCreateOrderView.as_view(),
        name="razorpay-create-order",
    ),
    path(
        "payments/razorpay/verify/",
        RazorpayVerifyPaymentView.as_view(),
        name="razorpay-verify-payment",
    ),
    path(
        "payments/razorpay/failure/",
        RazorpayFailureView.as_view(),
        name="razorpay-failure",
    ),

    # =====================================================
    # Customer Orders
    # =====================================================
    path(
        "my-orders/",
        MyOrderListView.as_view(),
        name="my-orders",
    ),
    path(
        "my-orders/<str:order_number>/cancel/",
        CancelOrderView.as_view(),
        name="cancel-order",
    ),
    path(
        "my-orders/<str:order_number>/invoice/",
        InvoiceDownloadView.as_view(),
        name="download-invoice",
    ),
    path(
        "my-orders/<str:order_number>/tracking/",
        MyOrderTrackingView.as_view(),
        name="my-order-tracking",
    ),
    path(
        "my-orders/<str:order_number>/",
        MyOrderDetailView.as_view(),
        name="my-order-detail",
    ),

    # =====================================================
    # Guest Order Lookup
    # =====================================================
    path(
        "guest-order/",
        GuestOrderLookupView.as_view(),
        name="guest-order",
    ),

    # =====================================================
    # Shipping Addresses
    # =====================================================
    path(
        "addresses/",
        ShippingAddressListCreateView.as_view(),
        name="shipping-address-list",
    ),
    path(
        "addresses/<int:pk>/",
        ShippingAddressDetailView.as_view(),
        name="shipping-address-detail",
    ),

    # =====================================================
    # Admin Dashboard / Orders
    #
    # IMPORTANT:
    # Static routes dynamic <order_number> route se
    # pehle rehni chahiye.
    # =====================================================
    path(
        "admin/orders/dashboard/",
        AdminDashboardSummaryView.as_view(),
        name="admin-order-dashboard",
    ),
    path(
        "admin/orders/",
        AdminOrderListView.as_view(),
        name="admin-order-list",
    ),

    # =====================================================
    # Admin Order Update
    # =====================================================
    path(
        "admin/orders/<str:order_number>/update/",
        AdminOrderUpdateView.as_view(),
        name="admin-order-update",
    ),
    path(
        "admin/orders/<str:order_number>/status/",
        AdminOrderStatusUpdateView.as_view(),
        name="admin-order-status-update",
    ),

    # =====================================================
    # Admin Shipping Details
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shipping/",
        AdminOrderShippingView.as_view(),
        name="admin-order-shipping",
    ),

    # =====================================================
    # Shiprocket - Serviceability
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/serviceability/",
        AdminShiprocketServiceabilityView.as_view(),
        name="admin-shiprocket-serviceability",
    ),

    # =====================================================
    # Shiprocket - Create Order / Shipment
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/create-order/",
        AdminShiprocketCreateOrderView.as_view(),
        name="admin-shiprocket-create-order",
    ),

    # =====================================================
    # Shiprocket - Assign AWB
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/assign-awb/",
        AdminShiprocketAssignAWBView.as_view(),
        name="admin-shiprocket-assign-awb",
    ),

    # =====================================================
    # Shiprocket - Schedule Pickup
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/pickup/",
        AdminShiprocketPickupView.as_view(),
        name="admin-shiprocket-pickup",
    ),

    # =====================================================
    # Shiprocket - Generate Label
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/label/",
        AdminShiprocketLabelView.as_view(),
        name="admin-shiprocket-label",
    ),

    # =====================================================
    # Shiprocket - Generate Manifest
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/manifest/",
        AdminShiprocketManifestView.as_view(),
        name="admin-shiprocket-manifest",
    ),

    # =====================================================
    # Shiprocket - Refresh Tracking
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shiprocket/tracking/",
        AdminShiprocketTrackingView.as_view(),
        name="admin-shiprocket-tracking",
    ),

    # =====================================================
    # Existing Internal Shipping Label
    # =====================================================
    path(
        "admin/orders/<str:order_number>/shipping-label/",
        AdminShippingLabelView.as_view(),
        name="admin-order-shipping-label",
    ),

    # =====================================================
    # Admin Order Detail
    #
    # Dynamic route ALWAYS last.
    # =====================================================
    path(
        "admin/orders/<str:order_number>/",
        AdminOrderDetailView.as_view(),
        name="admin-order-detail",
    ),
]