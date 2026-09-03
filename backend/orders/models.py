import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


# =========================================================
# Shipping Address
# =========================================================

class ShippingAddress(models.Model):

    ADDRESS_TYPE_CHOICES = (
        ("home", "Home"),
        ("work", "Work"),
        ("other", "Other"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shipping_addresses",
    )

    full_name = models.CharField(
        max_length=150,
    )

    phone = models.CharField(
        max_length=15,
    )

    alternate_phone = models.CharField(
        max_length=15,
        blank=True,
    )

    address_line_1 = models.CharField(
        max_length=255,
    )

    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
    )

    landmark = models.CharField(
        max_length=150,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
    )

    state = models.CharField(
        max_length=100,
    )

    postal_code = models.CharField(
        max_length=10,
    )

    country = models.CharField(
        max_length=100,
        default="India",
    )

    address_type = models.CharField(
        max_length=20,
        choices=ADDRESS_TYPE_CHOICES,
        default="home",
    )

    is_default = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-is_default",
            "-created_at",
        )

        verbose_name = "Shipping Address"
        verbose_name_plural = "Shipping Addresses"

        indexes = [
            models.Index(
                fields=[
                    "user",
                    "is_default",
                ]
            ),
            models.Index(
                fields=[
                    "city",
                    "state",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.full_name} - "
            f"{self.city}, {self.postal_code}"
        )

    def save(
        self,
        *args,
        **kwargs,
    ):
        super().save(
            *args,
            **kwargs,
        )

        if self.is_default:
            ShippingAddress.objects.filter(
                user=self.user,
            ).exclude(
                pk=self.pk,
            ).update(
                is_default=False,
            )


# =========================================================
# Order
# =========================================================

class Order(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("processing", "Processing"),
        ("packed", "Packed"),
        ("shipped", "Shipped"),
        ("in_transit", "In Transit"),
        ("out_for_delivery", "Out For Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),

        # Return / Exchange
        ("return_requested", "Return Requested"),
        ("exchange_requested", "Exchange Requested"),
        ("return_approved", "Return Approved"),
        ("exchange_approved", "Exchange Approved"),
        ("return_in_transit", "Return In Transit"),
        ("returned", "Returned"),
        ("exchanged", "Exchanged"),

        # Refund
        ("refund_pending", "Refund Pending"),
        ("refunded", "Refunded"),
    )

    PAYMENT_METHOD_CHOICES = (
        ("cod", "Cash on Delivery"),
        ("razorpay", "Razorpay"),
        ("upi", "UPI"),
        ("card", "Card"),
        ("net_banking", "Net Banking"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        (
            "partially_refunded",
            "Partially Refunded",
        ),
    )

    # =====================================================
    # Basic Order Details
    # =====================================================

    order_number = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
        db_index=True,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )

    shipping_address = models.ForeignKey(
        ShippingAddress,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )

    # =====================================================
    # Shipping Address Snapshot
    # =====================================================

    full_name = models.CharField(
        max_length=150,
    )

    phone = models.CharField(
        max_length=15,
    )

    alternate_phone = models.CharField(
        max_length=15,
        blank=True,
    )

    address_line_1 = models.CharField(
        max_length=255,
    )

    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
    )

    landmark = models.CharField(
        max_length=150,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
    )

    state = models.CharField(
        max_length=100,
    )

    postal_code = models.CharField(
        max_length=10,
    )

    country = models.CharField(
        max_length=100,
        default="India",
    )

    # =====================================================
    # Price Details
    # =====================================================

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    shipping_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    coupon_code = models.CharField(
        max_length=50,
        blank=True,
    )

    # =====================================================
    # Order Status
    # =====================================================

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    # =====================================================
    # Payment
    # =====================================================

    payment_method = models.CharField(
        max_length=30,
        choices=PAYMENT_METHOD_CHOICES,
        default="cod",
    )

    payment_status = models.CharField(
        max_length=30,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    # =====================================================
    # Notes
    # =====================================================

    customer_note = models.TextField(
        blank=True,
    )

    admin_note = models.TextField(
        blank=True,
    )

    # =====================================================
    # Shipping / Courier
    # =====================================================

    courier_company_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    courier_name = models.CharField(
        max_length=150,
        blank=True,
    )

    courier_service = models.CharField(
        max_length=150,
        blank=True,
    )

    tracking_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    awb_code = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    # =====================================================
    # Shiprocket IDs
    # =====================================================

    shiprocket_order_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shiprocket_shipment_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shipment_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shipping_order_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shipping_status = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    shipping_status_code = models.CharField(
        max_length=50,
        blank=True,
    )

    # =====================================================
    # Tracking / Documents
    # =====================================================

    tracking_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    shipping_label_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    manifest_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    # =====================================================
    # Pickup
    # =====================================================

    pickup_token = models.CharField(
        max_length=255,
        blank=True,
    )

    pickup_scheduled = models.BooleanField(
        default=False,
    )

    pickup_scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    estimated_delivery = models.DateField(
        null=True,
        blank=True,
    )

    # =====================================================
    # Package Information
    # =====================================================

    package_weight = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        default=0.500,
        validators=[
            MinValueValidator(0),
        ],
        help_text="Shipment weight in kilograms.",
    )

    package_length = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=10,
        validators=[
            MinValueValidator(0),
        ],
        help_text="Package length in centimetres.",
    )

    package_breadth = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=10,
        validators=[
            MinValueValidator(0),
        ],
        help_text="Package breadth in centimetres.",
    )

    package_height = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=5,
        validators=[
            MinValueValidator(0),
        ],
        help_text="Package height in centimetres.",
    )

    # =====================================================
    # Shipping API Responses
    # =====================================================

    shipping_response = models.JSONField(
        default=dict,
        blank=True,
    )

    tracking_response = models.JSONField(
        default=dict,
        blank=True,
    )

    serviceability_response = models.JSONField(
        default=dict,
        blank=True,
    )

    awb_response = models.JSONField(
        default=dict,
        blank=True,
    )

    pickup_response = models.JSONField(
        default=dict,
        blank=True,
    )

    # =====================================================
    # Timeline
    # =====================================================

    placed_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    shipment_created_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    awb_assigned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    shipped_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    in_transit_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    out_for_delivery_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:

        ordering = (
            "-placed_at",
        )

        verbose_name = "Order"
        verbose_name_plural = "Orders"

        indexes = [
            models.Index(
                fields=[
                    "status",
                    "placed_at",
                ]
            ),
            models.Index(
                fields=[
                    "payment_status",
                    "placed_at",
                ]
            ),
            models.Index(
                fields=[
                    "user",
                    "placed_at",
                ]
            ),
            models.Index(
                fields=[
                    "shipping_status",
                    "placed_at",
                ]
            ),
            models.Index(
                fields=[
                    "awb_code",
                ]
            ),
            models.Index(
                fields=[
                    "shiprocket_shipment_id",
                ]
            ),
        ]

    def __str__(self):
        return self.order_number

    def save(
        self,
        *args,
        **kwargs,
    ):
        if not self.order_number:
            self.order_number = (
                self.generate_order_number()
            )

        super().save(
            *args,
            **kwargs,
        )

    @staticmethod
    def generate_order_number():

        unique_code = (
            uuid.uuid4()
            .hex[:10]
            .upper()
        )

        return (
            f"YUV-{unique_code}"
        )

    # =====================================================
    # Helpers
    # =====================================================

    @property
    def total_items(self):
        return sum(
            item.quantity
            for item in self.items.all()
        )

    @property
    def full_address(self):

        address_parts = [
            self.address_line_1,
            self.address_line_2,
            self.landmark,
            self.city,
            self.state,
            self.postal_code,
            self.country,
        ]

        return ", ".join(
            str(part)
            for part in address_parts
            if part
        )

    @property
    def is_paid(self):

        return (
            self.payment_status
            == "paid"
        )

    @property
    def is_cancellable(self):

        return (
            self.status
            in {
                "pending",
                "confirmed",
                "processing",
                "packed",
            }
            and not self.has_shipment
        )

    @property
    def has_shipment(self):

        return bool(
            self.shiprocket_shipment_id
            or self.shipment_id
            or self.awb_code
            or self.tracking_id
        )

    @property
    def has_awb(self):

        return bool(
            self.awb_code
        )

    @property
    def can_track(self):

        return bool(
            self.awb_code
            or self.tracking_id
            or self.tracking_url
        )

    @property
    def is_delivered(self):

        return (
            self.status
            == "delivered"
        )

    @property
    def is_cancelled(self):

        return (
            self.status
            == "cancelled"
        )

    @property
    def has_return_request(self):

        return self.return_requests.exclude(
            status__in=[
                "rejected",
                "cancelled",
                "completed",
            ]
        ).exists()

    @property
    def shiprocket_reference_id(self):

        return (
            self.shiprocket_shipment_id
            or self.shipment_id
            or ""
        )


# =========================================================
# Order Item
# =========================================================

class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
    )

    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
    )

    # =====================================================
    # Product Snapshot
    # =====================================================

    product_name = models.CharField(
        max_length=255,
    )

    product_sku = models.CharField(
        max_length=100,
        blank=True,
    )

    variant_sku = models.CharField(
        max_length=100,
        blank=True,
    )

    color = models.CharField(
        max_length=100,
        blank=True,
    )

    size = models.CharField(
        max_length=50,
        blank=True,
    )

    product_image = models.CharField(
        max_length=1000,
        blank=True,
    )

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
        ],
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
        ],
    )

    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:

        ordering = (
            "id",
        )

        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

        indexes = [
            models.Index(
                fields=[
                    "order",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.product_name} "
            f"x {self.quantity}"
        )

    def save(
        self,
        *args,
        **kwargs,
    ):

        self.total_price = (
            self.unit_price
            * self.quantity
        )

        super().save(
            *args,
            **kwargs,
        )


# =========================================================
# Payment
# =========================================================

class Payment(models.Model):

    STATUS_CHOICES = (
        ("created", "Created"),
        ("pending", "Pending"),
        ("authorized", "Authorized"),
        ("captured", "Captured"),
        ("failed", "Failed"),
        ("partially_refunded", "Partially Refunded"),
        ("refunded", "Refunded"),
    )

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="payment",
    )

    payment_method = models.CharField(
        max_length=30,
        choices=Order.PAYMENT_METHOD_CHOICES,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
        ],
    )

    currency = models.CharField(
        max_length=10,
        default="INR",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="created",
        db_index=True,
    )

    transaction_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    gateway_order_id = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        db_index=True,
    )

    gateway_payment_id = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        db_index=True,
    )

    gateway_signature = models.CharField(
        max_length=255,
        blank=True,
    )

    # =====================================================
    # Refund
    # =====================================================

    refunded_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    refund_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    refunded_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # =====================================================
    # Payment Failure Details
    # =====================================================

    failure_code = models.CharField(
        max_length=100,
        blank=True,
    )

    failure_description = models.TextField(
        blank=True,
    )

    failure_source = models.CharField(
        max_length=100,
        blank=True,
    )

    failure_step = models.CharField(
        max_length=100,
        blank=True,
    )

    failure_reason = models.CharField(
        max_length=150,
        blank=True,
    )

    # =====================================================
    # Raw Gateway Response
    # =====================================================

    gateway_response = models.JSONField(
        default=dict,
        blank=True,
    )

    refund_response = models.JSONField(
        default=dict,
        blank=True,
    )

    # =====================================================
    # Timeline
    # =====================================================

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        ordering = (
            "-created_at",
        )

        verbose_name = "Payment"
        verbose_name_plural = "Payments"

        indexes = [
            models.Index(
                fields=[
                    "status",
                    "created_at",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.order.order_number} - "
            f"{self.status}"
        )

    @property
    def is_successful(self):

        return (
            self.status
            == "captured"
        )

    @property
    def is_refunded(self):

        return (
            self.status
            == "refunded"
        )


# =========================================================
# Return / Exchange Request
# =========================================================

class ReturnRequest(models.Model):

    REQUEST_TYPE_CHOICES = (
        ("return", "Return"),
        ("exchange", "Exchange"),
    )

    STATUS_CHOICES = (
        ("requested", "Requested"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("pickup_scheduled", "Pickup Scheduled"),
        ("picked_up", "Picked Up"),
        ("in_transit", "In Transit"),
        ("received", "Received"),
        ("inspection_pending", "Inspection Pending"),
        ("inspection_completed", "Inspection Completed"),
        ("refund_pending", "Refund Pending"),
        ("refunded", "Refunded"),
        ("exchange_pending", "Exchange Pending"),
        ("exchange_shipped", "Exchange Shipped"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    REASON_CHOICES = (
        ("wrong_size", "Wrong Size"),
        ("wrong_product", "Wrong Product"),
        ("damaged", "Damaged Product"),
        ("defective", "Defective Product"),
        ("quality_issue", "Quality Issue"),
        ("not_as_expected", "Not As Expected"),
        ("colour_issue", "Colour Issue"),
        ("fit_issue", "Fit Issue"),
        ("changed_mind", "Changed Mind"),
        ("other", "Other"),
    )

    return_number = models.CharField(
        max_length=40,
        unique=True,
        editable=False,
        db_index=True,
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="return_requests",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="return_requests",
        null=True,
        blank=True,
    )

    request_type = models.CharField(
        max_length=20,
        choices=REQUEST_TYPE_CHOICES,
        default="return",
        db_index=True,
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="requested",
        db_index=True,
    )

    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES,
        default="other",
    )

    reason_details = models.TextField(
        blank=True,
    )

    customer_note = models.TextField(
        blank=True,
    )

    admin_note = models.TextField(
        blank=True,
    )

    # =====================================================
    # Return Pickup / Courier
    # =====================================================

    courier_name = models.CharField(
        max_length=150,
        blank=True,
    )

    courier_service = models.CharField(
        max_length=150,
        blank=True,
    )

    courier_company_id = models.CharField(
        max_length=100,
        blank=True,
    )

    awb_code = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    tracking_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    tracking_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    pickup_scheduled = models.BooleanField(
        default=False,
    )

    pickup_scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # =====================================================
    # Shiprocket Return Shipment
    # =====================================================

    shiprocket_order_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shiprocket_shipment_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    shipping_status = models.CharField(
        max_length=100,
        blank=True,
    )

    shipping_response = models.JSONField(
        default=dict,
        blank=True,
    )

    tracking_response = models.JSONField(
        default=dict,
        blank=True,
    )

    # =====================================================
    # Refund
    # =====================================================

    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    refund_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    refund_status = models.CharField(
        max_length=50,
        blank=True,
    )

    refund_response = models.JSONField(
        default=dict,
        blank=True,
    )

    refunded_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # =====================================================
    # Admin Processing
    # =====================================================

    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="processed_return_requests",
        null=True,
        blank=True,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    received_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        ordering = (
            "-created_at",
        )

        verbose_name = "Return / Exchange Request"
        verbose_name_plural = "Return / Exchange Requests"

        indexes = [
            models.Index(
                fields=[
                    "order",
                    "status",
                ]
            ),
            models.Index(
                fields=[
                    "request_type",
                    "status",
                ]
            ),
            models.Index(
                fields=[
                    "user",
                    "created_at",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.return_number} - "
            f"{self.get_request_type_display()}"
        )

    def save(
        self,
        *args,
        **kwargs,
    ):

        if not self.return_number:

            unique_code = (
                uuid.uuid4()
                .hex[:10]
                .upper()
            )

            self.return_number = (
                f"RTN-{unique_code}"
            )

        super().save(
            *args,
            **kwargs,
        )

    @property
    def is_return(self):

        return (
            self.request_type
            == "return"
        )

    @property
    def is_exchange(self):

        return (
            self.request_type
            == "exchange"
        )

    @property
    def is_closed(self):

        return (
            self.status
            in {
                "completed",
                "rejected",
                "cancelled",
            }
        )


# =========================================================
# Return / Exchange Item
# =========================================================

class ReturnItem(models.Model):

    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="items",
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.PROTECT,
        related_name="return_items",
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
        ],
    )

    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    # =====================================================
    # Exchange Variant
    # =====================================================

    replacement_variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.SET_NULL,
        related_name="replacement_return_items",
        null=True,
        blank=True,
    )

    replacement_color = models.CharField(
        max_length=100,
        blank=True,
    )

    replacement_size = models.CharField(
        max_length=50,
        blank=True,
    )

    # =====================================================
    # Inspection
    # =====================================================

    inspection_status = models.CharField(
        max_length=50,
        blank=True,
    )

    inspection_note = models.TextField(
        blank=True,
    )

    is_accepted = models.BooleanField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        ordering = (
            "id",
        )

        verbose_name = "Return / Exchange Item"
        verbose_name_plural = "Return / Exchange Items"

        indexes = [
            models.Index(
                fields=[
                    "return_request",
                ]
            ),
            models.Index(
                fields=[
                    "order_item",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.return_request.return_number} - "
            f"{self.order_item.product_name}"
        )

    @property
    def product_name(self):

        return (
            self.order_item.product_name
        )

    @property
    def original_unit_price(self):

        return (
            self.order_item.unit_price
        )