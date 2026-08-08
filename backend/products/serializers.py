from decimal import Decimal

from django.db.models import Avg, Count
from rest_framework import serializers

from .models import (
    Brand,
    Product,
    ProductImage,
    ProductVariant,
)


# =========================================================
# Brand
# =========================================================

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = (
            "id",
            "name",
            "slug",
            "is_active",
        )


# =========================================================
# Product Images
# =========================================================

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = (
            "id",
            "image",
            "image_url",
            "alt_text",
            "order",
        )

    def get_image_url(self, obj):
        if not obj.image:
            return None

        request = self.context.get("request")

        try:
            image_url = obj.image.url
        except ValueError:
            return None

        if request:
            return request.build_absolute_uri(
                image_url
            )

        return image_url


# =========================================================
# Product Variants
# =========================================================

class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "color",
            "color_code",
            "size",
            "stock",
            "sku",
            "is_active",
            "is_in_stock",
        )

    def get_is_in_stock(self, obj):
        return (
            obj.is_active
            and int(obj.stock or 0) > 0
        )


# =========================================================
# Product Base Serializer
# =========================================================

class ProductBaseSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(
        source="brand.name",
        read_only=True,
    )

    brand_slug = serializers.CharField(
        source="brand.slug",
        read_only=True,
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    department_slug = serializers.CharField(
        source="department.slug",
        read_only=True,
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    subcategory_name = serializers.CharField(
        source="subcategory.name",
        read_only=True,
        allow_null=True,
    )

    subcategory_slug = serializers.CharField(
        source="subcategory.slug",
        read_only=True,
        allow_null=True,
    )

    main_image_url = serializers.SerializerMethodField()

    discount_percentage = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    is_in_stock = serializers.SerializerMethodField()

    available_sizes = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()

    rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    rating_breakdown = serializers.SerializerMethodField()

    # -----------------------------------------------------
    # Main image
    # -----------------------------------------------------

    def get_main_image_url(self, obj):
        if not obj.main_image:
            return None

        request = self.context.get("request")

        try:
            image_url = obj.main_image.url
        except ValueError:
            return None

        if request:
            return request.build_absolute_uri(
                image_url
            )

        return image_url

    # -----------------------------------------------------
    # Discount
    # -----------------------------------------------------

    def get_discount_percentage(self, obj):
        price = obj.price
        old_price = obj.old_price

        if not price or not old_price:
            return 0

        price = Decimal(str(price))
        old_price = Decimal(str(old_price))

        if old_price <= price:
            return 0

        discount = (
            (old_price - price)
            / old_price
        ) * Decimal("100")

        return int(round(discount))

    # -----------------------------------------------------
    # Variants
    # -----------------------------------------------------

    def get_active_variants(self, obj):
        prefetched_variants = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("variants")

        if prefetched_variants is not None:
            return [
                variant
                for variant in prefetched_variants
                if variant.is_active
            ]

        return list(
            obj.variants.filter(
                is_active=True,
            )
        )

    def get_total_stock(self, obj):
        variants = self.get_active_variants(obj)

        return sum(
            max(
                int(variant.stock or 0),
                0,
            )
            for variant in variants
        )

    def get_is_in_stock(self, obj):
        return self.get_total_stock(obj) > 0

    def get_available_sizes(self, obj):
        variants = self.get_active_variants(obj)

        sizes = {
            variant.size.strip()
            for variant in variants
            if (
                variant.size
                and int(variant.stock or 0) > 0
            )
        }

        return sorted(sizes)

    def get_available_colors(self, obj):
        variants = self.get_active_variants(obj)
        colors = {}

        for variant in variants:
            if not variant.color:
                continue

            color_name = variant.color.strip()
            color_key = color_name.lower()

            if color_key not in colors:
                colors[color_key] = {
                    "name": color_name,
                    "code": (
                        variant.color_code
                        or "#111827"
                    ),
                    "has_stock": False,
                }

            if int(variant.stock or 0) > 0:
                colors[color_key][
                    "has_stock"
                ] = True

        return list(colors.values())

    # -----------------------------------------------------
    # Approved reviews
    # -----------------------------------------------------

    def get_approved_reviews(self, obj):
        prefetched_reviews = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("reviews")

        if prefetched_reviews is not None:
            return [
                review
                for review in prefetched_reviews
                if review.status == "approved"
            ]

        return obj.reviews.filter(
            status="approved",
        )

    def get_rating(self, obj):
        annotated_rating = getattr(
            obj,
            "approved_average_rating",
            None,
        )

        if annotated_rating is not None:
            return round(
                float(annotated_rating or 0),
                2,
            )

        approved_reviews = (
            self.get_approved_reviews(obj)
        )

        if isinstance(approved_reviews, list):
            if not approved_reviews:
                return 0.0

            total_rating = sum(
                int(review.rating or 0)
                for review in approved_reviews
            )

            return round(
                total_rating
                / len(approved_reviews),
                2,
            )

        average = approved_reviews.aggregate(
            average_rating=Avg("rating"),
        )["average_rating"]

        return round(
            float(average or 0),
            2,
        )

    def get_total_reviews(self, obj):
        annotated_total = getattr(
            obj,
            "approved_reviews_count",
            None,
        )

        if annotated_total is not None:
            return int(annotated_total or 0)

        approved_reviews = (
            self.get_approved_reviews(obj)
        )

        if isinstance(approved_reviews, list):
            return len(approved_reviews)

        return approved_reviews.count()

    def get_rating_breakdown(self, obj):
        approved_reviews = (
            self.get_approved_reviews(obj)
        )

        breakdown = {
            "5": 0,
            "4": 0,
            "3": 0,
            "2": 0,
            "1": 0,
        }

        if isinstance(approved_reviews, list):
            for review in approved_reviews:
                rating_key = str(
                    int(review.rating or 0)
                )

                if rating_key in breakdown:
                    breakdown[rating_key] += 1

            return breakdown

        rating_data = (
            approved_reviews
            .values("rating")
            .annotate(total=Count("id"))
        )

        for item in rating_data:
            rating_key = str(
                item["rating"]
            )

            if rating_key in breakdown:
                breakdown[rating_key] = int(
                    item["total"]
                )

        return breakdown


# =========================================================
# Product List
# =========================================================

class ProductListSerializer(ProductBaseSerializer):
    class Meta:
        model = Product

        fields = (
            "id",
            "name",
            "slug",
            "sku",

            "brand",
            "brand_name",
            "brand_slug",

            "department",
            "department_name",
            "department_slug",

            "category",
            "category_name",
            "category_slug",

            "subcategory",
            "subcategory_name",
            "subcategory_slug",

            "price",
            "old_price",

            "main_image",
            "main_image_url",

            "discount_percentage",
            "total_stock",
            "is_in_stock",
            "available_sizes",
            "available_colors",

            "rating",
            "total_reviews",
            "rating_breakdown",

            "is_active",
            "is_featured",
            "is_best_seller",
            "is_trending",
            "is_new_arrival",
            "is_clearance_sale",
            "is_offer",

            "created_at",
            "updated_at",
        )


# =========================================================
# Product Detail
# =========================================================

class ProductDetailSerializer(ProductBaseSerializer):
    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    variants = ProductVariantSerializer(
        many=True,
        read_only=True,
    )

    latest_reviews = serializers.SerializerMethodField()

    def get_review_user_name(self, review):
        user = review.user

        if user is None:
            return "Customer"

        full_name = ""

        if hasattr(user, "get_full_name"):
            full_name = (
                user.get_full_name().strip()
            )

        if full_name:
            return full_name

        username = getattr(
            user,
            "username",
            "",
        )

        if username:
            return username

        email = getattr(
            user,
            "email",
            "",
        )

        if email:
            return email.split("@")[0]

        phone = getattr(
            user,
            "phone",
            "",
        )

        return phone or "Customer"

    def get_review_image_url(self, review):
        if not review.image:
            return None

        request = self.context.get("request")

        try:
            image_url = review.image.url
        except ValueError:
            return None

        if request:
            return request.build_absolute_uri(
                image_url
            )

        return image_url

    def get_latest_reviews(self, obj):
        prefetched_reviews = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("reviews")

        if prefetched_reviews is not None:
            approved_reviews = [
                review
                for review in prefetched_reviews
                if review.status == "approved"
            ]

            approved_reviews.sort(
                key=lambda review: review.created_at,
                reverse=True,
            )

            reviews = approved_reviews[:5]

        else:
            reviews = (
                obj.reviews.filter(
                    status="approved",
                )
                .select_related(
                    "user",
                    "order_item",
                )
                .order_by("-created_at")[:5]
            )

        return [
            {
                "id": review.id,
                "rating": review.rating,
                "title": review.title,
                "comment": review.comment,
                "user_name": (
                    self.get_review_user_name(
                        review
                    )
                ),
                "image_url": (
                    self.get_review_image_url(
                        review
                    )
                ),
                "is_verified_purchase": (
                    review.is_verified_purchase
                ),
                "helpful_count": (
                    review.helpful_count
                ),
                "created_at": review.created_at,
            }
            for review in reviews
        ]

    class Meta:
        model = Product

        fields = (
            "id",
            "name",
            "slug",
            "sku",
            "description",

            "brand",
            "brand_name",
            "brand_slug",

            "department",
            "department_name",
            "department_slug",

            "category",
            "category_name",
            "category_slug",

            "subcategory",
            "subcategory_name",
            "subcategory_slug",

            "price",
            "old_price",

            "main_image",
            "main_image_url",
            "images",
            "variants",

            "discount_percentage",
            "total_stock",
            "is_in_stock",
            "available_sizes",
            "available_colors",

            "rating",
            "total_reviews",
            "rating_breakdown",
            "latest_reviews",

            "is_active",
            "is_featured",
            "is_best_seller",
            "is_trending",
            "is_new_arrival",
            "is_clearance_sale",
            "is_offer",

            "created_at",
            "updated_at",
        )


# =========================================================
# Backward Compatibility
# =========================================================

class ProductSerializer(ProductDetailSerializer):
    pass