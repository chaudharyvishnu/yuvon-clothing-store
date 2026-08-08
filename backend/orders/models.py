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
        ordering = ("-is_default", "-created_at")
        verbose_name = "Shipping Address"
        verbose_name_plural = "Shipping Addresses"
        indexes = [
            models.Index(fields=["user", "is_default"]),
            models.Index(fields=["city", "state"]),
        ]

    def __str__(self):
        return (
            f"{self.full_name} - "
            f"{self.city}, {self.postal_code}"
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

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
        ("out_for_delivery", "Out For Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("returned", "Returned"),
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
        ("partially_refunded", "Partially Refunded"),
    )

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

    # Address snapshot:
    # Address baad me edit/delete ho tab bhi order ka address safe rahega.
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

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

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

    customer_note = models.TextField(
        blank=True,
    )

    admin_note = models.TextField(
        blank=True,
    )

    # Courier Details
    courier_name = models.CharField(
        max_length=100,
        blank=True,
    )

    tracking_id = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    estimated_delivery = models.DateField(
        null=True,
        blank=True,
    )

    shipped_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    placed_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
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
        ordering = ("-placed_at",)
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        indexes = [
            models.Index(fields=["status", "placed_at"]),
            models.Index(fields=["payment_status", "placed_at"]),
            models.Index(fields=["user", "placed_at"]),
        ]

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()

        super().save(*args, **kwargs)

    @staticmethod
    def generate_order_number():
        unique_code = uuid.uuid4().hex[:10].upper()

        return f"YUV-{unique_code}"

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
            part
            for part in address_parts
            if part
        )

    @property
    def is_paid(self):
        return self.payment_status == "paid"

    @property
    def is_cancellable(self):
        return (
            self.status
            in {
                "pending",
                "confirmed",
                "processing",
            }
            and not self.is_paid
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

    # Product snapshot:
    # Product name/price future me change ho tab order unchanged rahe.
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
        max_length=500,
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
        ordering = ("id",)
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"
        indexes = [
            models.Index(fields=["order"]),
        ]

    def __str__(self):
        return (
            f"{self.product_name} "
            f"x {self.quantity}"
        )

    def save(self, *args, **kwargs):
        self.total_price = (
            self.unit_price * self.quantity
        )

        super().save(*args, **kwargs)


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

    gateway_response = models.JSONField(
        default=dict,
        blank=True,
    )

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
        ordering = ("-created_at",)
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.order.order_number} - "
            f"{self.status}"
        )

    @property
    def is_successful(self):
        return self.status =="captured"
        

    @property
    def is_refunded(self):
        return self.status == "refunded"

