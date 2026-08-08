from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class InventoryTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ("purchase", "Purchase / Stock In"),
        ("sale", "Sale / Stock Out"),
        ("order_cancelled", "Order Cancelled / Stock Restore"),
        ("return", "Customer Return / Stock Restore"),
        ("refund", "Refund / Stock Restore"),
        ("manual_increase", "Manual Stock Increase"),
        ("manual_decrease", "Manual Stock Decrease"),
        ("damaged", "Damaged Stock"),
        ("correction", "Stock Correction"),
    )

    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="inventory_transactions",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="inventory_transactions",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        related_name="inventory_transactions",
        null=True,
        blank=True,
    )
    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.SET_NULL,
        related_name="inventory_transactions",
        null=True,
        blank=True,
    )
    transaction_type = models.CharField(
        max_length=30,
        choices=TRANSACTION_TYPE_CHOICES,
        db_index=True,
    )
    quantity_change = models.IntegerField(
        help_text=(
            "Positive value increases stock; "
            "negative value decreases stock."
        ),
    )
    stock_before = models.PositiveIntegerField()
    stock_after = models.PositiveIntegerField(editable=False)
    reference = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )
    note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="inventory_transactions_created",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Inventory Transaction"
        verbose_name_plural = "Inventory Transactions"
        indexes = [
            models.Index(fields=["variant", "created_at"]),
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["transaction_type", "created_at"]),
            models.Index(fields=["order", "created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(quantity_change=0),
                name="inventory_quantity_change_nonzero",
            ),
        ]

    def __str__(self):
        sign = "+" if self.quantity_change > 0 else ""
        return (
            f"{self.variant} | "
            f"{sign}{self.quantity_change} | "
            f"{self.get_transaction_type_display()}"
        )

    @property
    def is_stock_in(self):
        return self.quantity_change > 0

    @property
    def is_stock_out(self):
        return self.quantity_change < 0

    def clean(self):
        errors = {}

        if self.quantity_change == 0:
            errors["quantity_change"] = (
                "Quantity change cannot be zero."
            )

        expected_stock_after = (
            int(self.stock_before)
            + int(self.quantity_change)
        )

        inventory_settings = InventorySettings.load()

        if (
            expected_stock_after < 0
            and not inventory_settings.allow_negative_stock
        ):
            errors["quantity_change"] = (
                "This transaction would make stock negative."
            )

        if (
            self.variant_id
            and self.product_id
            and self.variant.product_id != self.product_id
        ):
            errors["product"] = (
                "Selected product does not match "
                "the selected variant."
            )

        if (
            self.order_item_id
            and self.order_id
            and self.order_item.order_id != self.order_id
        ):
            errors["order_item"] = (
                "Selected order item does not belong "
                "to the selected order."
            )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.variant_id and not self.product_id:
            self.product_id = self.variant.product_id

        if self.order_item_id and not self.order_id:
            self.order_id = self.order_item.order_id

        self.stock_after = (
            int(self.stock_before)
            + int(self.quantity_change)
        )

        self.full_clean()
        super().save(*args, **kwargs)


class InventorySettings(models.Model):
    low_stock_threshold = models.PositiveIntegerField(default=5)
    allow_negative_stock = models.BooleanField(default=False)
    auto_restore_on_cancel = models.BooleanField(default=True)
    auto_restore_on_return = models.BooleanField(default=True)
    auto_restore_on_refund = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Inventory Setting"
        verbose_name_plural = "Inventory Settings"

    def __str__(self):
        return "Inventory Settings"

    def save(self, *args, **kwargs):
        if not self.pk:
            self.pk = 1

        if InventorySettings.objects.exclude(pk=self.pk).exists():
            raise ValidationError(
                "Only one InventorySettings record is allowed."
            )

        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class LowStockAlert(models.Model):
    variant = models.OneToOneField(
        "products.ProductVariant",
        on_delete=models.CASCADE,
        related_name="low_stock_alert",
    )
    current_stock = models.PositiveIntegerField(default=0)
    threshold = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True, db_index=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_active", "current_stock")
        verbose_name = "Low Stock Alert"
        verbose_name_plural = "Low Stock Alerts"
        indexes = [
            models.Index(fields=["is_active", "current_stock"]),
        ]

    def __str__(self):
        return (
            f"{self.variant} - "
            f"Stock: {self.current_stock}"
        )

    @property
    def is_low_stock(self):
        return self.current_stock <= self.threshold

    def mark_notified(self):
        self.notified_at = timezone.now()
        self.save(
            update_fields=[
                "notified_at",
                "updated_at",
            ]
        )

    def resolve(self):
        self.is_active = False
        self.resolved_at = timezone.now()
        self.save(
            update_fields=[
                "is_active",
                "resolved_at",
                "updated_at",
            ]
        )

    def reopen(self, current_stock=None):
        if current_stock is not None:
            self.current_stock = max(0, int(current_stock))

        self.is_active = True
        self.resolved_at = None
        self.save(
            update_fields=[
                "current_stock",
                "is_active",
                "resolved_at",
                "updated_at",
            ]
        )
