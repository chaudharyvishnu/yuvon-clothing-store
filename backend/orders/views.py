from decimal import Decimal

import razorpay

from django.conf import settings
from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from coupons.models import CouponUsage
from products.models import ProductVariant

from inventory.models import (
    InventorySettings,
    InventoryTransaction,
    LowStockAlert,
)

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from .models import Order, Payment, ShippingAddress
from .serializers import (
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminOrderStatusSerializer,
    AdminOrderUpdateSerializer,
    CheckoutSerializer,
    OrderSerializer,
    ShippingAddressSerializer,
)


# =========================================================
# Razorpay Helpers
# =========================================================

def get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID:
        raise ValueError(
            "RAZORPAY_KEY_ID is not configured."
        )

    if not settings.RAZORPAY_KEY_SECRET:
        raise ValueError(
            "RAZORPAY_KEY_SECRET is not configured."
        )

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )


def clean_phone(value):
    return "".join(
        character
        for character in str(value or "")
        if character.isdigit()
    )


def get_customer_order(
    request,
    order_number,
    lock=False,
):
    queryset = Order.objects

    if lock:
        queryset = queryset.select_for_update()

    queryset = queryset.select_related(
        "user",
        "shipping_address",
    ).prefetch_related(
        "items",
        "items__product",
        "items__variant",
    )

    if (
        request.user
        and request.user.is_authenticated
    ):
        return get_object_or_404(
            queryset,
            order_number=order_number,
            user=request.user,
        )

    phone = clean_phone(
        request.data.get("phone")
    )

    if len(phone) != 10:
        return None

    return queryset.filter(
        order_number=order_number,
        phone=phone,
    ).first()


# =========================================================
# Inventory Helpers
# =========================================================

def sync_low_stock_alert(variant):
    """
    Keep LowStockAlert aligned with the
    variant's current stock.
    """

    settings_obj = InventorySettings.load()

    threshold = int(
        settings_obj.low_stock_threshold
        or 0
    )

    current_stock = max(
        0,
        int(
            variant.stock
            or 0
        ),
    )

    alert = (
        LowStockAlert.objects
        .filter(
            variant=variant
        )
        .first()
    )

    if current_stock <= threshold:
        if alert is None:
            LowStockAlert.objects.create(
                variant=variant,
                current_stock=current_stock,
                threshold=threshold,
                is_active=True,
            )

        else:
            alert.current_stock = current_stock
            alert.threshold = threshold
            alert.is_active = True
            alert.resolved_at = None

            alert.save(
                update_fields=[
                    "current_stock",
                    "threshold",
                    "is_active",
                    "resolved_at",
                    "updated_at",
                ]
            )

    elif alert is not None:
        alert.current_stock = current_stock
        alert.threshold = threshold
        alert.is_active = False
        alert.resolved_at = timezone.now()

        alert.save(
            update_fields=[
                "current_stock",
                "threshold",
                "is_active",
                "resolved_at",
                "updated_at",
            ]
        )


def restore_cancelled_order_resources(order):
    """
    Restore stock and coupon usage exactly once
    after order cancellation.
    """

    order_items = (
        order.items
        .select_related(
            "variant",
            "product",
        )
    )

    for item in order_items:
        if item.variant_id is None:
            continue

        already_restored = (
            InventoryTransaction.objects
            .filter(
                order=order,
                order_item=item,
                transaction_type="order_cancelled",
            )
            .exists()
        )

        if already_restored:
            continue

        variant = (
            ProductVariant.objects
            .select_for_update()
            .select_related(
                "product"
            )
            .filter(
                pk=item.variant_id
            )
            .first()
        )

        if variant is None:
            continue

        quantity = max(
            0,
            int(
                item.quantity
                or 0
            ),
        )

        if quantity == 0:
            continue

        stock_before = int(
            variant.stock
            or 0
        )

        variant.stock = (
            stock_before
            + quantity
        )

        variant.save(
            update_fields=[
                "stock",
            ]
        )

        InventoryTransaction.objects.create(
            variant=variant,
            product=variant.product,
            order=order,
            order_item=item,
            transaction_type="order_cancelled",
            quantity_change=quantity,
            stock_before=stock_before,
            reference=order.order_number,
            note=(
                "Stock restored after "
                "order cancellation."
            ),
            metadata={
                "source":
                    "order_cancellation",
            },
        )

        sync_low_stock_alert(
            variant
        )

    # -----------------------------------------------------
    # Coupon usage rollback
    # -----------------------------------------------------

    coupon_usage = (
        CouponUsage.objects
        .select_for_update()
        .select_related(
            "coupon"
        )
        .filter(
            order=order
        )
        .first()
    )

    if coupon_usage is not None:
        coupon_id = (
            coupon_usage.coupon_id
        )

        coupon_usage.delete()

        coupon_model = (
            CouponUsage
            ._meta
            .get_field(
                "coupon"
            )
            .remote_field
            .model
        )

        coupon_model.objects.filter(
            pk=coupon_id,
            used_count__gt=0,
        ).update(
            used_count=(
                F("used_count")
                - 1
            )
        )


# =========================================================
# COD Payment Helper
# =========================================================

def sync_cod_payment_after_delivery(order):
    """
    When a COD order reaches delivered status,
    mark both Order and Payment as paid/captured.

    This helper is intentionally idempotent:
    running it again will not create another Payment
    or duplicate the payment amount.
    """

    if order.payment_method != "cod":
        return

    if order.status != "delivered":
        return

    if order.payment_status == "paid":
        return

    now = timezone.now()

    payment, _ = (
        Payment.objects
        .select_for_update()
        .get_or_create(
            order=order,
            defaults={
                "payment_method":
                    "cod",
                "amount":
                    order.total_amount,
                "currency":
                    "INR",
                "status":
                    "pending",
            },
        )
    )

    # Important:
    # Save Payment first while Order is still pending.
    # This prevents the Payment fallback signal from
    # producing a duplicate payment-success notification.
    payment.payment_method = "cod"
    payment.amount = order.total_amount
    payment.currency = "INR"
    payment.status = "captured"

    if payment.paid_at is None:
        payment.paid_at = now

    payment.failure_code = ""
    payment.failure_description = ""
    payment.failure_source = ""
    payment.failure_step = ""
    payment.failure_reason = ""

    payment.save(
        update_fields=[
            "payment_method",
            "amount",
            "currency",
            "status",
            "paid_at",
            "failure_code",
            "failure_description",
            "failure_source",
            "failure_step",
            "failure_reason",
            "updated_at",
        ]
    )

    order.payment_status = "paid"

    order.save(
        update_fields=[
            "payment_status",
            "updated_at",
        ]
    )


# =========================================================
# Checkout / Order Creation
# =========================================================

class CheckoutView(
    generics.CreateAPIView
):
    """
    POST /api/orders/checkout/

    Guest aur logged-in, dono customers
    order create kar sakte hain.
    """

    serializer_class = (
        CheckoutSerializer
    )

    permission_classes = [
        permissions.AllowAny,
    ]

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        order = serializer.save()

        response_serializer = (
            OrderSerializer(
                order,
                context={
                    "request":
                        request,
                },
            )
        )

        return Response(
            {
                "message": (
                    "Order placed successfully."
                ),
                "order":
                    response_serializer.data,
            },
            status=(
                status
                .HTTP_201_CREATED
            ),
        )


# =========================================================
# Razorpay Create Order
# =========================================================

class RazorpayCreateOrderView(APIView):
    """
    POST /api/orders/payments/razorpay/create-order/
    """

    permission_classes = [
        permissions.AllowAny,
    ]

    @transaction.atomic
    def post(
        self,
        request,
    ):
        order_number = str(
            request.data.get(
                "order_number",
                "",
            )
        ).strip()

        if not order_number:
            return Response(
                {
                    "order_number": (
                        "Order number is required."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        order = get_customer_order(
            request,
            order_number,
            lock=True,
        )

        if order is None:
            return Response(
                {
                    "detail": (
                        "Order was not found or the "
                        "provided phone number is invalid."
                    )
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        if (
            order.payment_method
            != "razorpay"
        ):
            return Response(
                {
                    "detail": (
                        "This order does not use "
                        "Razorpay as its payment method."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if order.status == "cancelled":
            return Response(
                {
                    "detail": (
                        "A cancelled order "
                        "cannot be paid."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            order.payment_status
            == "paid"
        ):
            return Response(
                {
                    "detail": (
                        "This order has already "
                        "been paid."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        payment, _ = (
            Payment.objects
            .select_for_update()
            .get_or_create(
                order=order,
                defaults={
                    "payment_method":
                        "razorpay",
                    "amount":
                        order.total_amount,
                    "currency":
                        "INR",
                    "status":
                        "created",
                },
            )
        )

        payment.payment_method = (
            "razorpay"
        )

        payment.amount = (
            order.total_amount
        )

        payment.currency = "INR"

        amount_in_paise = int(
            Decimal(
                order.total_amount
            )
            * 100
        )

        if amount_in_paise <= 0:
            return Response(
                {
                    "detail": (
                        "Order amount must be "
                        "greater than zero."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        try:
            client = (
                get_razorpay_client()
            )

            razorpay_order = (
                client.order.create(
                    {
                        "amount":
                            amount_in_paise,

                        "currency":
                            "INR",

                        "receipt":
                            order.order_number,

                        "notes": {
                            "order_number":
                                order.order_number,

                            "customer_phone":
                                order.phone,
                        },
                    }
                )
            )

        except ValueError as error:
            return Response(
                {
                    "detail":
                        str(error),
                },
                status=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
            )

        except Exception as error:
            payment.status = "failed"

            payment.failure_description = (
                str(error)
            )

            payment.gateway_response = {
                "error":
                    str(error),
            }

            payment.save(
                update_fields=[
                    "status",
                    "failure_description",
                    "gateway_response",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail": (
                        "Unable to create "
                        "Razorpay order."
                    )
                },
                status=(
                    status
                    .HTTP_502_BAD_GATEWAY
                ),
            )

        payment.status = "created"

        payment.gateway_order_id = (
            razorpay_order.get(
                "id"
            )
        )

        payment.gateway_payment_id = None
        payment.gateway_signature = ""
        payment.transaction_id = ""

        payment.failure_code = ""
        payment.failure_description = ""
        payment.failure_source = ""
        payment.failure_step = ""
        payment.failure_reason = ""

        payment.gateway_response = (
            razorpay_order
        )

        payment.save(
            update_fields=[
                "payment_method",
                "amount",
                "currency",
                "status",
                "gateway_order_id",
                "gateway_payment_id",
                "gateway_signature",
                "transaction_id",
                "failure_code",
                "failure_description",
                "failure_source",
                "failure_step",
                "failure_reason",
                "gateway_response",
                "updated_at",
            ]
        )

        return Response(
            {
                "key_id":
                    settings.RAZORPAY_KEY_ID,

                "razorpay_order_id":
                    razorpay_order.get(
                        "id"
                    ),

                "order_number":
                    order.order_number,

                "amount":
                    razorpay_order.get(
                        "amount"
                    ),

                "currency":
                    razorpay_order.get(
                        "currency",
                        "INR",
                    ),

                "name":
                    "Yuvon",

                "description": (
                    f"Payment for order "
                    f"{order.order_number}"
                ),

                "prefill": {
                    "name":
                        order.full_name,

                    "contact":
                        order.phone,
                },
            },
            status=(
                status
                .HTTP_201_CREATED
            ),
        )


# =========================================================
# Razorpay Verify Payment
# =========================================================

class RazorpayVerifyPaymentView(APIView):
    """
    POST /api/orders/payments/razorpay/verify/
    """

    permission_classes = [
        permissions.AllowAny,
    ]

    @transaction.atomic
    def post(
        self,
        request,
    ):
        order_number = str(
            request.data.get(
                "order_number",
                "",
            )
        ).strip()

        razorpay_order_id = str(
            request.data.get(
                "razorpay_order_id",
                "",
            )
        ).strip()

        razorpay_payment_id = str(
            request.data.get(
                "razorpay_payment_id",
                "",
            )
        ).strip()

        razorpay_signature = str(
            request.data.get(
                "razorpay_signature",
                "",
            )
        ).strip()

        required_fields = {
            "order_number":
                order_number,

            "razorpay_order_id":
                razorpay_order_id,

            "razorpay_payment_id":
                razorpay_payment_id,

            "razorpay_signature":
                razorpay_signature,
        }

        missing_fields = [
            field_name
            for (
                field_name,
                field_value
            )
            in required_fields.items()
            if not field_value
        ]

        if missing_fields:
            return Response(
                {
                    "detail": (
                        "Missing required field(s): "
                        + ", ".join(
                            missing_fields
                        )
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        order = get_customer_order(
            request,
            order_number,
            lock=True,
        )

        if order is None:
            return Response(
                {
                    "detail": (
                        "Order was not found or the "
                        "provided phone number is invalid."
                    )
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        if (
            order.payment_method
            != "razorpay"
        ):
            return Response(
                {
                    "detail": (
                        "This order does not "
                        "use Razorpay."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        payment = get_object_or_404(
            Payment.objects
            .select_for_update(),
            order=order,
        )

        if (
            order.payment_status
            == "paid"
        ):
            serializer = (
                OrderSerializer(
                    order,
                    context={
                        "request":
                            request,
                    },
                )
            )

            return Response(
                {
                    "message": (
                        "Payment was already "
                        "verified."
                    ),
                    "order":
                        serializer.data,
                },
                status=(
                    status
                    .HTTP_200_OK
                ),
            )

        if (
            not payment.gateway_order_id
            or (
                payment.gateway_order_id
                != razorpay_order_id
            )
        ):
            return Response(
                {
                    "detail": (
                        "Razorpay order ID "
                        "does not match this order."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        verification_data = {
            "razorpay_order_id":
                razorpay_order_id,

            "razorpay_payment_id":
                razorpay_payment_id,

            "razorpay_signature":
                razorpay_signature,
        }

        try:
            client = (
                get_razorpay_client()
            )

            client.utility.verify_payment_signature(
                verification_data
            )

            razorpay_payment = (
                client.payment.fetch(
                    razorpay_payment_id
                )
            )

        except (
            razorpay.errors
            .SignatureVerificationError
        ):
            payment.status = "failed"

            payment.gateway_payment_id = (
                razorpay_payment_id
            )

            payment.gateway_signature = (
                razorpay_signature
            )

            payment.failure_description = (
                "Razorpay signature "
                "verification failed."
            )

            payment.gateway_response = {
                "verification_data":
                    verification_data,
            }

            payment.save(
                update_fields=[
                    "status",
                    "gateway_payment_id",
                    "gateway_signature",
                    "failure_description",
                    "gateway_response",
                    "updated_at",
                ]
            )

            order.payment_status = (
                "failed"
            )

            order.save(
                update_fields=[
                    "payment_status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail": (
                        "Payment signature "
                        "verification failed."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        except ValueError as error:
            return Response(
                {
                    "detail":
                        str(error),
                },
                status=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
            )

        except Exception:
            return Response(
                {
                    "detail": (
                        "Unable to verify payment. "
                        "Please try again."
                    ),
                },
                status=(
                    status
                    .HTTP_502_BAD_GATEWAY
                ),
            )

        gateway_amount = (
            razorpay_payment.get(
                "amount"
            )
        )

        expected_amount = int(
            Decimal(
                order.total_amount
            )
            * 100
        )

        if (
            gateway_amount
            != expected_amount
        ):
            payment.status = "failed"

            payment.failure_description = (
                "Paid amount does not match "
                "the order amount."
            )

            payment.gateway_response = (
                razorpay_payment
            )

            payment.save(
                update_fields=[
                    "status",
                    "failure_description",
                    "gateway_response",
                    "updated_at",
                ]
            )

            order.payment_status = (
                "failed"
            )

            order.save(
                update_fields=[
                    "payment_status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail": (
                        "Payment amount does not "
                        "match the order amount."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        gateway_status = (
            razorpay_payment.get(
                "status",
                "",
            )
        )

        if gateway_status != "captured":
            return Response(
                {
                    "detail": (
                        "Payment has not been "
                        "captured yet."
                    ),
                    "payment_status":
                        gateway_status,
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        payment.status = gateway_status

        payment.transaction_id = (
            razorpay_payment_id
        )

        payment.gateway_payment_id = (
            razorpay_payment_id
        )

        payment.gateway_signature = (
            razorpay_signature
        )

        payment.gateway_response = (
            razorpay_payment
        )

        payment.paid_at = (
            timezone.now()
        )

        payment.failure_code = ""
        payment.failure_description = ""
        payment.failure_source = ""
        payment.failure_step = ""
        payment.failure_reason = ""

        payment.save(
            update_fields=[
                "status",
                "transaction_id",
                "gateway_payment_id",
                "gateway_signature",
                "gateway_response",
                "paid_at",
                "failure_code",
                "failure_description",
                "failure_source",
                "failure_step",
                "failure_reason",
                "updated_at",
            ]
        )

        order.payment_status = "paid"

        if order.status == "pending":
            order.status = "confirmed"

        order.save(
            update_fields=[
                "payment_status",
                "status",
                "updated_at",
            ]
        )

        serializer = OrderSerializer(
            order,
            context={
                "request":
                    request,
            },
        )

        return Response(
            {
                "message": (
                    "Payment verified "
                    "successfully."
                ),
                "order":
                    serializer.data,
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Razorpay Payment Failure
# =========================================================

class RazorpayFailureView(APIView):
    """
    POST /api/orders/payments/razorpay/failure/
    """

    permission_classes = [
        permissions.AllowAny,
    ]

    @transaction.atomic
    def post(
        self,
        request,
    ):
        order_number = str(
            request.data.get(
                "order_number",
                "",
            )
        ).strip()

        if not order_number:
            return Response(
                {
                    "order_number": (
                        "Order number is required."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        order = get_customer_order(
            request,
            order_number,
            lock=True,
        )

        if order is None:
            return Response(
                {
                    "detail": (
                        "Order was not found or the "
                        "provided phone number is invalid."
                    )
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        if (
            order.payment_status
            == "paid"
        ):
            return Response(
                {
                    "detail": (
                        "A paid order cannot "
                        "be marked failed."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        error_data = (
            request.data.get(
                "error",
                {},
            )
        )

        if not isinstance(
            error_data,
            dict,
        ):
            error_data = {}

        payment, _ = (
            Payment.objects
            .select_for_update()
            .get_or_create(
                order=order,
                defaults={
                    "payment_method":
                        "razorpay",

                    "amount":
                        order.total_amount,

                    "currency":
                        "INR",
                },
            )
        )

        payment.status = "failed"

        payment.failure_code = str(
            error_data.get(
                "code",
                "",
            )
        )

        payment.failure_description = str(
            error_data.get(
                "description",
                "",
            )
        )

        payment.failure_source = str(
            error_data.get(
                "source",
                "",
            )
        )

        payment.failure_step = str(
            error_data.get(
                "step",
                "",
            )
        )

        payment.failure_reason = str(
            error_data.get(
                "reason",
                "",
            )
        )

        payment.gateway_response = (
            request.data
        )

        payment.save(
            update_fields=[
                "status",
                "failure_code",
                "failure_description",
                "failure_source",
                "failure_step",
                "failure_reason",
                "gateway_response",
                "updated_at",
            ]
        )

        order.payment_status = "failed"

        order.save(
            update_fields=[
                "payment_status",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": (
                    "Payment failure "
                    "recorded successfully."
                )
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Logged-in Customer Orders
# =========================================================

class MyOrderListView(
    generics.ListAPIView
):
    serializer_class = (
        OrderSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            Order.objects
            .filter(
                user=self.request.user,
            )
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
            .order_by(
                "-placed_at"
            )
        )


class MyOrderDetailView(
    generics.RetrieveAPIView
):
    serializer_class = (
        OrderSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    lookup_field = (
        "order_number"
    )

    lookup_url_kwarg = (
        "order_number"
    )

    def get_queryset(self):
        return (
            Order.objects
            .filter(
                user=self.request.user,
            )
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )


# =========================================================
# Invoice PDF Download
# =========================================================

class InvoiceDownloadView(APIView):
    """
    GET /api/orders/my-orders/<order_number>/invoice/
    """

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get(
        self,
        request,
        order_number,
    ):
        order = get_object_or_404(
            Order.objects
            .filter(
                user=request.user,
                order_number=order_number,
            )
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )

        response = HttpResponse(
            content_type=(
                "application/pdf"
            ),
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; filename='
            f'"invoice-{order.order_number}.pdf"'
        )

        document = SimpleDocTemplate(
            response,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title=(
                f"Invoice "
                f"{order.order_number}"
            ),
            author="Yuvon",
        )

        styles = (
            getSampleStyleSheet()
        )

        styles.add(
            ParagraphStyle(
                name="InvoiceTitle",
                parent=styles[
                    "Title"
                ],
                alignment=TA_CENTER,
                fontSize=22,
                leading=26,
                spaceAfter=8,
            )
        )

        styles.add(
            ParagraphStyle(
                name="InvoiceRight",
                parent=styles[
                    "Normal"
                ],
                alignment=TA_RIGHT,
                fontSize=9,
                leading=13,
            )
        )

        styles.add(
            ParagraphStyle(
                name="InvoiceSmall",
                parent=styles[
                    "Normal"
                ],
                fontSize=9,
                leading=13,
            )
        )

        story = [
            Paragraph(
                "YUVON",
                styles[
                    "InvoiceTitle"
                ],
            ),
            Paragraph(
                "Tax Invoice",
                styles[
                    "Heading2"
                ],
            ),
            Spacer(
                1,
                5 * mm,
            ),
        ]

        placed_at = (
            getattr(
                order,
                "placed_at",
                None,
            )
            or getattr(
                order,
                "created_at",
                None,
            )
        )

        order_date = (
            timezone
            .localtime(
                placed_at
            )
            .strftime(
                "%d %b %Y, %I:%M %p"
            )
            if placed_at
            else "-"
        )

        customer_name = (
            getattr(
                order,
                "full_name",
                "",
            )
            or (
                request.user
                .get_full_name()
                if hasattr(
                    request.user,
                    "get_full_name",
                )
                else ""
            )
        )

        customer_email = (
            getattr(
                order,
                "email",
                "",
            )
            or getattr(
                request.user,
                "email",
                "",
            )
        )

        customer_phone = getattr(
            order,
            "phone",
            "",
        )

        address_parts = [
            order.address_line_1,
            order.address_line_2,
            order.landmark,
            order.city,
            order.state,
            order.postal_code,
            order.country,
        ]

        address_parts = [
            str(value)
            for value in address_parts
            if value
        ]

        billing_text = (
            "<br/>".join(
                filter(
                    None,
                    [
                        (
                            f"<b>{customer_name}</b>"
                            if customer_name
                            else ""
                        ),
                        customer_email,
                        customer_phone,
                        *address_parts,
                    ],
                )
            )
            or (
                "Customer details "
                "unavailable"
            )
        )

        payment_method = str(
            getattr(
                order,
                "payment_method",
                "COD",
            )
            or "COD"
        ).upper()

        payment_status = str(
            getattr(
                order,
                "payment_status",
                "pending",
            )
            or "pending"
        ).title()

        header_table = Table(
            [
                [
                    Paragraph(
                        (
                            f"<b>Bill To</b>"
                            f"<br/>{billing_text}"
                        ),
                        styles[
                            "InvoiceSmall"
                        ],
                    ),
                    Paragraph(
                        (
                            f"<b>Invoice No:</b> "
                            f"{order.order_number}<br/>"
                            f"<b>Order Date:</b> "
                            f"{order_date}<br/>"
                            f"<b>Order Status:</b> "
                            f"{str(order.status).title()}<br/>"
                            f"<b>Payment:</b> "
                            f"{payment_method} / "
                            f"{payment_status}"
                        ),
                        styles[
                            "InvoiceRight"
                        ],
                    ),
                ]
            ],
            colWidths=[
                95 * mm,
                65 * mm,
            ],
        )

        header_table.setStyle(
            TableStyle(
                [
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#D1D5DB"
                        ),
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.25,
                        colors.HexColor(
                            "#E5E7EB"
                        ),
                    ),
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, -1),
                        colors.HexColor(
                            "#F9FAFB"
                        ),
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                ]
            )
        )

        story.extend(
            [
                header_table,
                Spacer(
                    1,
                    7 * mm,
                ),
            ]
        )

        item_rows = [
            [
                "#",
                "Product",
                "Variant",
                "Qty",
                "Price",
                "Amount",
            ]
        ]

        calculated_subtotal = Decimal(
            "0.00"
        )

        for (
            index,
            item,
        ) in enumerate(
            order.items.all(),
            start=1,
        ):
            product = getattr(
                item,
                "product",
                None,
            )

            variant = getattr(
                item,
                "variant",
                None,
            )

            product_name = (
                getattr(
                    item,
                    "product_name",
                    "",
                )
                or getattr(
                    product,
                    "name",
                    "",
                )
                or "Product"
            )

            variant_parts = []

            for source in (
                item,
                variant,
            ):
                if not source:
                    continue

                for (
                    field_name,
                    label,
                ) in (
                    (
                        "size",
                        "Size",
                    ),
                    (
                        "color",
                        "Color",
                    ),
                ):
                    value = getattr(
                        source,
                        field_name,
                        "",
                    )

                    display_value = (
                        f"{label}: "
                        f"{value}"
                    )

                    if (
                        value
                        and (
                            display_value
                            not in variant_parts
                        )
                    ):
                        variant_parts.append(
                            display_value
                        )

            quantity = Decimal(
                str(
                    getattr(
                        item,
                        "quantity",
                        1,
                    )
                    or 1
                )
            )

            unit_price = Decimal(
                str(
                    getattr(
                        item,
                        "price",
                        None,
                    )
                    or getattr(
                        item,
                        "unit_price",
                        None,
                    )
                    or 0
                )
            )

            line_total_value = (
                getattr(
                    item,
                    "total_price",
                    None,
                )
                or getattr(
                    item,
                    "subtotal",
                    None,
                )
            )

            line_total = (
                Decimal(
                    str(
                        line_total_value
                    )
                )
                if (
                    line_total_value
                    is not None
                )
                else (
                    unit_price
                    * quantity
                )
            )

            calculated_subtotal += (
                line_total
            )

            item_rows.append(
                [
                    str(index),
                    Paragraph(
                        str(
                            product_name
                        ),
                        styles[
                            "InvoiceSmall"
                        ],
                    ),
                    Paragraph(
                        (
                            ", ".join(
                                variant_parts
                            )
                            or "-"
                        ),
                        styles[
                            "InvoiceSmall"
                        ],
                    ),
                    str(
                        int(
                            quantity
                        )
                    ),
                    (
                        f"Rs. "
                        f"{unit_price:.2f}"
                    ),
                    (
                        f"Rs. "
                        f"{line_total:.2f}"
                    ),
                ]
            )

        items_table = Table(
            item_rows,
            colWidths=[
                9 * mm,
                60 * mm,
                38 * mm,
                14 * mm,
                24 * mm,
                27 * mm,
            ],
            repeatRows=1,
        )

        items_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            "#111827"
                        ),
                    ),
                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.white,
                    ),
                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),
                    (
                        "FONTSIZE",
                        (0, 0),
                        (-1, -1),
                        8.5,
                    ),
                    (
                        "ALIGN",
                        (0, 0),
                        (0, -1),
                        "CENTER",
                    ),
                    (
                        "ALIGN",
                        (3, 1),
                        (-1, -1),
                        "RIGHT",
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.35,
                        colors.HexColor(
                            "#D1D5DB"
                        ),
                    ),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [
                            colors.white,
                            colors.HexColor(
                                "#F9FAFB"
                            ),
                        ],
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                ]
            )
        )

        story.extend(
            [
                items_table,
                Spacer(
                    1,
                    7 * mm,
                ),
            ]
        )

        subtotal = Decimal(
            str(
                getattr(
                    order,
                    "subtotal",
                    calculated_subtotal,
                )
                or calculated_subtotal
            )
        )

        discount = Decimal(
            str(
                getattr(
                    order,
                    "discount_amount",
                    0,
                )
                or 0
            )
        )

        shipping = Decimal(
            str(
                getattr(
                    order,
                    "shipping_charge",
                    0,
                )
                or 0
            )
        )

        tax = Decimal(
            str(
                getattr(
                    order,
                    "tax_amount",
                    0,
                )
                or 0
            )
        )

        total = Decimal(
            str(
                getattr(
                    order,
                    "total_amount",
                    0,
                )
                or 0
            )
        )

        totals_data = [
            [
                "Subtotal",
                (
                    f"Rs. "
                    f"{subtotal:.2f}"
                ),
            ],
        ]

        if discount:
            totals_data.append(
                [
                    "Discount",
                    (
                        f"- Rs. "
                        f"{discount:.2f}"
                    ),
                ]
            )

        if shipping:
            totals_data.append(
                [
                    "Shipping",
                    (
                        f"Rs. "
                        f"{shipping:.2f}"
                    ),
                ]
            )

        if tax:
            totals_data.append(
                [
                    "Tax",
                    (
                        f"Rs. "
                        f"{tax:.2f}"
                    ),
                ]
            )

        totals_data.append(
            [
                "Grand Total",
                (
                    f"Rs. "
                    f"{total:.2f}"
                ),
            ]
        )

        totals_table = Table(
            totals_data,
            colWidths=[
                42 * mm,
                35 * mm,
            ],
            hAlign="RIGHT",
        )

        totals_table.setStyle(
            TableStyle(
                [
                    (
                        "ALIGN",
                        (0, 0),
                        (-1, -1),
                        "RIGHT",
                    ),
                    (
                        "FONTNAME",
                        (0, -1),
                        (-1, -1),
                        "Helvetica-Bold",
                    ),
                    (
                        "FONTSIZE",
                        (0, 0),
                        (-1, -1),
                        10,
                    ),
                    (
                        "LINEABOVE",
                        (0, -1),
                        (-1, -1),
                        1,
                        colors.HexColor(
                            "#111827"
                        ),
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                ]
            )
        )

        story.extend(
            [
                totals_table,
                Spacer(
                    1,
                    10 * mm,
                ),
                Paragraph(
                    (
                        "Thank you for "
                        "shopping with Yuvon."
                    ),
                    styles[
                        "InvoiceSmall"
                    ],
                ),
            ]
        )

        document.build(
            story
        )

        return response


# =========================================================
# Guest Order Lookup
# =========================================================

class GuestOrderLookupView(APIView):
    permission_classes = [
        permissions.AllowAny,
    ]

    def post(
        self,
        request,
    ):
        order_number = str(
            request.data.get(
                "order_number",
                "",
            )
        ).strip()

        phone = clean_phone(
            request.data.get(
                "phone"
            )
        )

        if not order_number:
            return Response(
                {
                    "order_number": (
                        "Order number is required."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if len(phone) != 10:
            return Response(
                {
                    "phone": (
                        "Please enter a valid "
                        "10-digit phone number."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        order = (
            Order.objects
            .filter(
                order_number__iexact=(
                    order_number
                ),
                phone=phone,
            )
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
            .first()
        )

        if order is None:
            return Response(
                {
                    "detail": (
                        "Order was not found with "
                        "the provided order number "
                        "and phone number."
                    )
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        serializer = OrderSerializer(
            order,
            context={
                "request":
                    request,
            },
        )

        return Response(
            serializer.data,
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Shipping Addresses
# =========================================================

class ShippingAddressListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = (
        ShippingAddressSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            ShippingAddress.objects
            .filter(
                user=self.request.user,
            )
            .order_by(
                "-is_default",
                "-created_at",
            )
        )

    def perform_create(
        self,
        serializer,
    ):
        serializer.save(
            user=self.request.user,
        )


class ShippingAddressDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        ShippingAddressSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            ShippingAddress.objects
            .filter(
                user=self.request.user,
            )
        )


# =========================================================
# Cancel Order
# =========================================================

class CancelOrderView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    cancellable_statuses = {
        "pending",
        "confirmed",
        "processing",
    }

    @transaction.atomic
    def post(
        self,
        request,
        order_number,
    ):
        order = get_object_or_404(
            Order.objects
            .select_for_update(),
            order_number=order_number,
            user=request.user,
        )

        if (
            order.status
            not in self.cancellable_statuses
        ):
            return Response(
                {
                    "detail": (
                        "This order cannot be "
                        "cancelled at its current "
                        f"status: {order.status}."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            order.payment_status
            == "paid"
        ):
            return Response(
                {
                    "detail": (
                        "A paid order cannot "
                        "be cancelled until the "
                        "refund flow is completed."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        order.status = "cancelled"

        order.cancelled_at = (
            timezone.now()
        )

        order.save(
            update_fields=[
                "status",
                "cancelled_at",
                "updated_at",
            ]
        )

        restore_cancelled_order_resources(
            order
        )

        serializer = OrderSerializer(
            order,
            context={
                "request":
                    request,
            },
        )

        return Response(
            {
                "message": (
                    "Order cancelled "
                    "successfully."
                ),
                "order":
                    serializer.data,
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Admin Order Management
# =========================================================

class AdminOrderPagination(
    PageNumberPagination
):
    page_size = 25
    page_size_query_param = (
        "page_size"
    )
    max_page_size = 100


class AdminOrderListView(
    generics.ListAPIView
):
    """
    GET /api/orders/admin/orders/

    Supported query parameters:
    - search
    - status
    - payment_status
    - payment_method
    - city
    - state
    - date_from
    - date_to
    - ordering
    - page
    - page_size
    """

    serializer_class = (
        AdminOrderListSerializer
    )

    permission_classes = [
        permissions.IsAdminUser,
    ]

    pagination_class = (
        AdminOrderPagination
    )

    allowed_ordering = {
        "placed_at",
        "-placed_at",
        "updated_at",
        "-updated_at",
        "total_amount",
        "-total_amount",
        "estimated_delivery",
        "-estimated_delivery",
    }

    def get_queryset(self):
        queryset = (
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )

        search = (
            self.request
            .query_params
            .get(
                "search",
                "",
            )
            .strip()
        )

        order_status = (
            self.request
            .query_params
            .get(
                "status",
                "",
            )
            .strip()
        )

        payment_status = (
            self.request
            .query_params
            .get(
                "payment_status",
                "",
            )
            .strip()
        )

        payment_method = (
            self.request
            .query_params
            .get(
                "payment_method",
                "",
            )
            .strip()
        )

        city = (
            self.request
            .query_params
            .get(
                "city",
                "",
            )
            .strip()
        )

        state_name = (
            self.request
            .query_params
            .get(
                "state",
                "",
            )
            .strip()
        )

        date_from = (
            self.request
            .query_params
            .get(
                "date_from",
                "",
            )
            .strip()
        )

        date_to = (
            self.request
            .query_params
            .get(
                "date_to",
                "",
            )
            .strip()
        )

        ordering = (
            self.request
            .query_params
            .get(
                "ordering",
                "-placed_at",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    order_number__icontains=(
                        search
                    )
                )
                | Q(
                    full_name__icontains=(
                        search
                    )
                )
                | Q(
                    phone__icontains=(
                        search
                    )
                )
                | Q(
                    alternate_phone__icontains=(
                        search
                    )
                )
                | Q(
                    tracking_id__icontains=(
                        search
                    )
                )
                | Q(
                    user__email__icontains=(
                        search
                    )
                )
                | Q(
                    user__username__icontains=(
                        search
                    )
                )
            )

        if order_status:
            queryset = queryset.filter(
                status=order_status
            )

        if payment_status:
            queryset = queryset.filter(
                payment_status=(
                    payment_status
                )
            )

        if payment_method:
            queryset = queryset.filter(
                payment_method=(
                    payment_method
                )
            )

        if city:
            queryset = queryset.filter(
                city__iexact=city
            )

        if state_name:
            queryset = queryset.filter(
                state__iexact=(
                    state_name
                )
            )

        if date_from:
            queryset = queryset.filter(
                placed_at__date__gte=(
                    date_from
                )
            )

        if date_to:
            queryset = queryset.filter(
                placed_at__date__lte=(
                    date_to
                )
            )

        if (
            ordering
            not in self.allowed_ordering
        ):
            ordering = "-placed_at"

        return queryset.order_by(
            ordering
        )


class AdminOrderDetailView(
    generics.RetrieveAPIView
):
    serializer_class = (
        AdminOrderDetailSerializer
    )

    permission_classes = [
        permissions.IsAdminUser,
    ]

    lookup_field = (
        "order_number"
    )

    lookup_url_kwarg = (
        "order_number"
    )

    def get_queryset(self):
        return (
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )


class AdminOrderUpdateView(
    generics.UpdateAPIView
):
    """
    PATCH /api/orders/admin/orders/<order_number>/update/

    Updates:
    - status
    - payment status
    - admin note
    - courier information
    - tracking information
    - estimated delivery

    COD orders automatically become paid
    when their status becomes delivered.
    """

    serializer_class = (
        AdminOrderUpdateSerializer
    )

    permission_classes = [
        permissions.IsAdminUser,
    ]

    lookup_field = (
        "order_number"
    )

    lookup_url_kwarg = (
        "order_number"
    )

    http_method_names = [
        "patch",
        "put",
        "options",
    ]

    def get_queryset(self):
        return (
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )

    @transaction.atomic
    def update(
        self,
        request,
        *args,
        **kwargs,
    ):
        instance = (
            self.get_object()
        )

        previous_status = (
            instance.status
        )

        partial = kwargs.pop(
            "partial",
            request.method == "PATCH",
        )

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(
            raise_exception=True
        )

        order = serializer.save()

        # -------------------------------------------------
        # Cancellation resource restore
        # -------------------------------------------------

        if (
            previous_status
            != "cancelled"
            and order.status
            == "cancelled"
        ):
            restore_cancelled_order_resources(
                order
            )

        # -------------------------------------------------
        # COD delivered => paid
        # -------------------------------------------------

        sync_cod_payment_after_delivery(
            order
        )

        response_serializer = (
            AdminOrderDetailSerializer(
                order,
                context={
                    "request":
                        request,
                },
            )
        )

        return Response(
            {
                "message": (
                    "Order updated "
                    "successfully."
                ),
                "order":
                    response_serializer.data,
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


class AdminOrderStatusUpdateView(
    generics.UpdateAPIView
):
    """
    PATCH /api/orders/admin/orders/<order_number>/status/

    Example:
    {
        "status": "shipped"
    }

    Important:
    - Cancellation restores stock exactly once.
    - COD becomes paid automatically on delivery.
    """

    serializer_class = (
        AdminOrderStatusSerializer
    )

    permission_classes = [
        permissions.IsAdminUser,
    ]

    lookup_field = (
        "order_number"
    )

    lookup_url_kwarg = (
        "order_number"
    )

    http_method_names = [
        "patch",
        "options",
    ]

    def get_queryset(self):
        return (
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            )
        )

    @transaction.atomic
    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        order = (
            self.get_object()
        )

        previous_status = (
            order.status
        )

        serializer = self.get_serializer(
            order,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        order = serializer.save()

        # -------------------------------------------------
        # Cancellation resource restore
        # -------------------------------------------------

        if (
            previous_status
            != "cancelled"
            and order.status
            == "cancelled"
        ):
            restore_cancelled_order_resources(
                order
            )

        # -------------------------------------------------
        # COD delivered => paid
        # -------------------------------------------------

        sync_cod_payment_after_delivery(
            order
        )

        response_serializer = (
            AdminOrderDetailSerializer(
                order,
                context={
                    "request":
                        request,
                },
            )
        )

        return Response(
            {
                "message": (
                    "Order status updated "
                    "successfully."
                ),
                "order":
                    response_serializer.data,
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Admin Dashboard Summary
# =========================================================

class AdminDashboardSummaryView(APIView):
    """
    GET /api/orders/admin/orders/dashboard/
    """

    permission_classes = [
        permissions.IsAdminUser,
    ]

    def get(
        self,
        request,
    ):
        queryset = (
            Order.objects.all()
        )

        today = (
            timezone.localdate()
        )

        status_counts = {
            row["status"]:
                row["count"]

            for row in (
                queryset
                .values(
                    "status"
                )
                .annotate(
                    count=Count(
                        "id"
                    )
                )
            )
        }

        payment_status_counts = {
            row["payment_status"]:
                row["count"]

            for row in (
                queryset
                .values(
                    "payment_status"
                )
                .annotate(
                    count=Count(
                        "id"
                    )
                )
            )
        }

        paid_revenue = (
            queryset
            .filter(
                payment_status="paid",
            )
            .aggregate(
                total=Sum(
                    "total_amount"
                )
            )[
                "total"
            ]
            or Decimal(
                "0.00"
            )
        )

        today_summary = (
            queryset
            .filter(
                placed_at__date=today,
            )
            .aggregate(
                orders=Count(
                    "id"
                ),
                revenue=Sum(
                    "total_amount",
                    filter=Q(
                        payment_status="paid"
                    ),
                ),
            )
        )

        return Response(
            {
                "total_orders":
                    queryset.count(),

                "status_counts":
                    status_counts,

                "payment_status_counts":
                    payment_status_counts,

                "paid_revenue":
                    paid_revenue,

                "today": {
                    "orders": (
                        today_summary[
                            "orders"
                        ]
                        or 0
                    ),
                    "paid_revenue": (
                        today_summary[
                            "revenue"
                        ]
                        or Decimal(
                            "0.00"
                        )
                    ),
                },
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Backward Compatibility
# =========================================================

AdminOrderDashboardView = (
    AdminDashboardSummaryView
)