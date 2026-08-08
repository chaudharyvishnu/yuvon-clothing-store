from django.urls import path

from .views import (
    CancelOrderView,
    CheckoutView,
    GuestOrderLookupView,
    InvoiceDownloadView,
    MyOrderDetailView,
    MyOrderListView,
    RazorpayCreateOrderView,
    RazorpayFailureView,
    RazorpayVerifyPaymentView,
    ShippingAddressDetailView,
    ShippingAddressListCreateView,
)

urlpatterns = [
    # ==========================================
    # Checkout
    # ==========================================
    path(
        "checkout/",
        CheckoutView.as_view(),
        name="checkout",
    ),

    # ==========================================
    # Razorpay Payments
    # ==========================================
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

    # ==========================================
    # My Orders
    # ==========================================
    path(
        "my-orders/",
        MyOrderListView.as_view(),
        name="my-orders",
    ),

    path(
        "my-orders/<str:order_number>/",
        MyOrderDetailView.as_view(),
        name="my-order-detail",
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

    # ==========================================
    # Guest Order Tracking
    # ==========================================
    path(
        "guest-order/",
        GuestOrderLookupView.as_view(),
        name="guest-order",
    ),

    # ==========================================
    # Shipping Addresses
    # ==========================================
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
]