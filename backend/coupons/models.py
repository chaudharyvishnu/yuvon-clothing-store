from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ("percentage", "Percentage"),
        ("fixed", "Fixed Amount"),
    )

    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPE_CHOICES,
        default="percentage",
    )

    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    minimum_order_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    maximum_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Optional cap for percentage discounts.",
    )

    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True, db_index=True)

    total_usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Leave blank for unlimited total usage.",
    )

    per_user_usage_limit = models.PositiveIntegerField(
        default=1,
    )

    first_order_only = models.BooleanField(default=False)

    used_count = models.PositiveIntegerField(
        default=0,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
        indexes = [
            models.Index(
                fields=["is_active", "valid_from", "valid_until"]
            ),
        ]

    def __str__(self):
        return self.code

    def clean(self):
        errors = {}

        self.code = str(self.code or "").strip().upper()

        if not self.code:
            errors["code"] = "Coupon code is required."

        if (
            self.valid_from
            and self.valid_until
            and self.valid_until <= self.valid_from
        ):
            errors["valid_until"] = (
                "Valid-until date must be after valid-from date."
            )

        if (
            self.discount_type == "percentage"
            and self.discount_value > Decimal("100.00")
        ):
            errors["discount_value"] = (
                "Percentage discount cannot be greater than 100."
            )

        if (
            self.total_usage_limit is not None
            and self.total_usage_limit < 1
        ):
            errors["total_usage_limit"] = (
                "Total usage limit must be at least 1."
            )

        if self.per_user_usage_limit < 1:
            errors["per_user_usage_limit"] = (
                "Per-user usage limit must be at least 1."
            )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.code = str(self.code or "").strip().upper()
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_currently_valid(self):
        now = timezone.now()

        if not self.is_active:
            return False

        if now < self.valid_from or now > self.valid_until:
            return False

        if (
            self.total_usage_limit is not None
            and self.used_count >= self.total_usage_limit
        ):
            return False

        return True

    def get_validation_error(self, *, subtotal, user=None):
        now = timezone.now()
        subtotal = Decimal(str(subtotal or 0))

        if not self.is_active:
            return "This coupon is inactive."

        if now < self.valid_from:
            return "This coupon is not active yet."

        if now > self.valid_until:
            return "This coupon has expired."

        if subtotal < self.minimum_order_amount:
            return (
                "Minimum order amount for this coupon is "
                f"Rs. {self.minimum_order_amount:.2f}."
            )

        if (
            self.total_usage_limit is not None
            and self.used_count >= self.total_usage_limit
        ):
            return "This coupon has reached its usage limit."

        if user and user.is_authenticated:
            user_usage_count = self.usages.filter(user=user).count()

            if user_usage_count >= self.per_user_usage_limit:
                return (
                    "You have already used this coupon "
                    "the maximum allowed number of times."
                )

            if self.first_order_only:
                has_previous_order = user.orders.exclude(
                    status="cancelled",
                ).exists()

                if has_previous_order:
                    return (
                        "This coupon is valid only on the first order."
                    )

        elif self.first_order_only:
            return "Please log in to use this first-order coupon."

        return ""

    def calculate_discount(self, subtotal):
        subtotal = Decimal(str(subtotal or 0))

        if subtotal <= 0:
            return Decimal("0.00")

        if self.discount_type == "percentage":
            discount = (
                subtotal
                * self.discount_value
                / Decimal("100.00")
            )
        else:
            discount = self.discount_value

        if self.maximum_discount_amount is not None:
            discount = min(
                discount,
                self.maximum_discount_amount,
            )

        discount = min(discount, subtotal)

        return discount.quantize(Decimal("0.01"))


class CouponUsage(models.Model):
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.PROTECT,
        related_name="usages",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="coupon_usages",
        null=True,
        blank=True,
    )

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="coupon_usage",
    )

    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-used_at",)
        verbose_name = "Coupon Usage"
        verbose_name_plural = "Coupon Usages"
        indexes = [
            models.Index(fields=["coupon", "user"]),
            models.Index(fields=["used_at"]),
        ]

    def __str__(self):
        return (
            f"{self.coupon.code} - "
            f"{self.order.order_number}"
        )
