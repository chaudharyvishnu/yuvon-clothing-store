from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from categories.models import Category, Department, SubCategory


# =========================================================
# Brand
# =========================================================

class Brand(models.Model):
    name = models.CharField(
        max_length=100,
    )

    slug = models.SlugField(
        unique=True,
    )

    logo = models.ImageField(
        upload_to="brands/",
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = [
            "name",
        ]

        indexes = [
            models.Index(
                fields=[
                    "is_active",
                    "name",
                ],
                name="products_brand_active_name_idx",
            ),
        ]

    def __str__(self):
        return self.name


# =========================================================
# Product
# =========================================================

class Product(models.Model):
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
    )

    subcategory = models.ForeignKey(
        SubCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    name = models.CharField(
        max_length=200,
    )

    slug = models.SlugField(
        unique=True,
    )

    sku = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(
                Decimal("0.00")
            ),
        ],
    )

    old_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(
                Decimal("0.00")
            ),
        ],
    )

    main_image = models.ImageField(
        upload_to="products/main/",
        blank=True,
        null=True,
    )

    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(
                Decimal("0.00")
            ),
            MaxValueValidator(
                Decimal("5.00")
            ),
        ],
    )

    total_reviews = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_featured = models.BooleanField(
        default=False,
    )

    is_best_seller = models.BooleanField(
        default=False,
    )

    is_trending = models.BooleanField(
        default=False,
    )

    is_new_arrival = models.BooleanField(
        default=False,
    )

    is_clearance_sale = models.BooleanField(
        default=False,
    )

    is_offer = models.BooleanField(
        default=False,
    )

    meta_title = models.CharField(
        max_length=200,
        blank=True,
    )

    meta_description = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "is_active",
                    "-created_at",
                ],
                name="products_active_created_idx",
            ),
            models.Index(
                fields=[
                    "department",
                    "is_active",
                ],
                name="products_dept_active_idx",
            ),
            models.Index(
                fields=[
                    "category",
                    "is_active",
                ],
                name="products_cat_active_idx",
            ),
            models.Index(
                fields=[
                    "subcategory",
                    "is_active",
                ],
                name="products_subcat_active_idx",
            ),
            models.Index(
                fields=[
                    "is_featured",
                    "is_active",
                ],
                name="products_featured_active_idx",
            ),
            models.Index(
                fields=[
                    "is_best_seller",
                    "is_active",
                ],
                name="products_bestseller_active_idx",
            ),
            models.Index(
                fields=[
                    "is_trending",
                    "is_active",
                ],
                name="products_trending_active_idx",
            ),
            models.Index(
                fields=[
                    "is_new_arrival",
                    "is_active",
                ],
                name="products_new_active_idx",
            ),
            models.Index(
                fields=[
                    "is_offer",
                    "is_active",
                ],
                name="products_offer_active_idx",
            ),
            models.Index(
                fields=[
                    "is_clearance_sale",
                    "is_active",
                ],
                name="products_clearance_active_idx",
            ),
        ]

    def clean(self):
        super().clean()

        errors = {}

        # Old price should represent the original higher price.
        if (
            self.old_price is not None
            and self.price is not None
            and self.old_price < self.price
        ):
            errors[
                "old_price"
            ] = (
                "Old price cannot be lower "
                "than the selling price."
            )

        # Category should belong to selected department.
        if (
            self.department_id
            and self.category_id
            and self.category.department_id
            != self.department_id
        ):
            errors[
                "category"
            ] = (
                "Selected category does not "
                "belong to this department."
            )

        # Subcategory should belong to selected category.
        if (
            self.category_id
            and self.subcategory_id
            and self.subcategory.category_id
            != self.category_id
        ):
            errors[
                "subcategory"
            ] = (
                "Selected subcategory does not "
                "belong to this category."
            )

        if errors:
            raise ValidationError(
                errors
            )

    @property
    def discount_amount(self):
        if (
            self.old_price is None
            or self.old_price <= self.price
        ):
            return Decimal("0.00")

        return (
            self.old_price
            - self.price
        )

    @property
    def discount_percentage(self):
        if (
            self.old_price is None
            or self.old_price <= 0
            or self.old_price <= self.price
        ):
            return 0

        percentage = (
            (
                self.old_price
                - self.price
            )
            / self.old_price
        ) * Decimal("100")

        return round(
            percentage,
            2,
        )

    @property
    def total_stock(self):
        return sum(
            variant.stock
            for variant
            in self.variants.filter(
                is_active=True
            )
        )

    @property
    def in_stock(self):
        return self.variants.filter(
            is_active=True,
            stock__gt=0,
        ).exists()

    def __str__(self):
        return self.name


# =========================================================
# Product Images
# =========================================================

class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="products/gallery/",
    )

    alt_text = models.CharField(
        max_length=150,
        blank=True,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    class Meta:
        ordering = [
            "order",
            "id",
        ]

        indexes = [
            models.Index(
                fields=[
                    "product",
                    "order",
                ],
                name="product_image_order_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.product.name} "
            f"image #{self.pk or 'new'}"
        )


# =========================================================
# Product Variants
# =========================================================

class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )

    color = models.CharField(
        max_length=50,
    )

    color_code = models.CharField(
        max_length=20,
        blank=True,
    )

    size = models.CharField(
        max_length=20,
    )

    stock = models.PositiveIntegerField(
        default=0,
    )

    sku = models.CharField(
        max_length=120,
        unique=True,
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = [
            "product",
            "color",
            "size",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "product",
                    "color",
                    "size",
                ],
                name=(
                    "unique_product_color_size"
                ),
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "product",
                    "is_active",
                    "stock",
                ],
                name="product_variant_stock_idx",
            ),
        ]

    @property
    def in_stock(self):
        return (
            self.is_active
            and self.stock > 0
        )

    def clean(self):
        super().clean()

        self.color = (
            self.color or ""
        ).strip()

        self.size = (
            self.size or ""
        ).strip()

        self.color_code = (
            self.color_code or ""
        ).strip()

        if not self.color:
            raise ValidationError(
                {
                    "color":
                        "Color is required."
                }
            )

        if not self.size:
            raise ValidationError(
                {
                    "size":
                        "Size is required."
                }
            )

    def __str__(self):
        return (
            f"{self.product.name} - "
            f"{self.color} - "
            f"{self.size}"
        )