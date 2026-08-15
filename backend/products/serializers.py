from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count

from rest_framework import serializers

from .models import (
    Brand,
    Product,
    ProductImage,
    ProductVariant,
)


# =========================================================
# Shared Helpers
# =========================================================

def build_file_url(serializer, file_field):
    """
    Safely return an absolute URL for a Django File/ImageField.
    """

    if not file_field:
        return None

    try:
        file_url = file_field.url
    except (
        ValueError,
        AttributeError,
    ):
        return None

    request = serializer.context.get(
        "request"
    )

    if request:
        return request.build_absolute_uri(
            file_url
        )

    return file_url


# =========================================================
# Brand
# =========================================================

class BrandSerializer(
    serializers.ModelSerializer
):
    logo_url = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = Brand

        fields = (
            "id",
            "name",
            "slug",
            "logo",
            "logo_url",
            "is_active",
        )

        read_only_fields = (
            "id",
        )

    def get_logo_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.logo,
        )


# =========================================================
# Public Product Images
# =========================================================

class ProductImageSerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = ProductImage

        fields = (
            "id",
            "image",
            "image_url",
            "alt_text",
            "order",
        )

        read_only_fields = (
            "id",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )


# =========================================================
# Public Product Variants
# =========================================================

class ProductVariantSerializer(
    serializers.ModelSerializer
):
    is_in_stock = (
        serializers.SerializerMethodField()
    )

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

        read_only_fields = (
            "id",
            "is_in_stock",
        )

    def get_is_in_stock(
        self,
        obj,
    ):
        return bool(
            obj.is_active
            and int(
                obj.stock or 0
            ) > 0
        )


# =========================================================
# Product Base Serializer
# =========================================================

class ProductBaseSerializer(
    serializers.ModelSerializer
):

    # -----------------------------------------------------
    # Brand
    # -----------------------------------------------------

    brand_name = serializers.CharField(
        source="brand.name",
        read_only=True,
        default=None,
    )

    brand_slug = serializers.CharField(
        source="brand.slug",
        read_only=True,
        default=None,
    )

    # -----------------------------------------------------
    # Department
    # -----------------------------------------------------

    department_name = (
        serializers.CharField(
            source="department.name",
            read_only=True,
            default=None,
        )
    )

    department_slug = (
        serializers.CharField(
            source="department.slug",
            read_only=True,
            default=None,
        )
    )

    # -----------------------------------------------------
    # Category
    # -----------------------------------------------------

    category_name = (
        serializers.CharField(
            source="category.name",
            read_only=True,
            default=None,
        )
    )

    category_slug = (
        serializers.CharField(
            source="category.slug",
            read_only=True,
            default=None,
        )
    )

    # -----------------------------------------------------
    # Subcategory
    # -----------------------------------------------------

    subcategory_name = (
        serializers.CharField(
            source="subcategory.name",
            read_only=True,
            default=None,
        )
    )

    subcategory_slug = (
        serializers.CharField(
            source="subcategory.slug",
            read_only=True,
            default=None,
        )
    )

    # -----------------------------------------------------
    # Computed values
    # -----------------------------------------------------

    main_image_url = (
        serializers.SerializerMethodField()
    )

    discount_amount = (
        serializers.SerializerMethodField()
    )

    discount_percentage = (
        serializers.SerializerMethodField()
    )

    total_stock = (
        serializers.SerializerMethodField()
    )

    is_in_stock = (
        serializers.SerializerMethodField()
    )

    available_sizes = (
        serializers.SerializerMethodField()
    )

    available_colors = (
        serializers.SerializerMethodField()
    )

    rating = (
        serializers.SerializerMethodField()
    )

    total_reviews = (
        serializers.SerializerMethodField()
    )

    rating_breakdown = (
        serializers.SerializerMethodField()
    )

    # =====================================================
    # Main Image
    # =====================================================

    def get_main_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.main_image,
        )

    # =====================================================
    # Pricing / Discount
    # =====================================================

    def get_discount_amount(
        self,
        obj,
    ):
        try:
            amount = (
                obj.discount_amount
            )

        except (
            AttributeError,
            TypeError,
        ):
            if (
                obj.old_price is None
                or obj.price is None
                or obj.old_price
                <= obj.price
            ):
                return "0.00"

            amount = (
                Decimal(
                    str(
                        obj.old_price
                    )
                )
                - Decimal(
                    str(
                        obj.price
                    )
                )
            )

        return str(
            Decimal(
                str(
                    amount
                )
            ).quantize(
                Decimal(
                    "0.01"
                )
            )
        )

    def get_discount_percentage(
        self,
        obj,
    ):
        try:
            percentage = (
                obj.discount_percentage
            )

        except (
            AttributeError,
            TypeError,
        ):
            price = obj.price
            old_price = (
                obj.old_price
            )

            if (
                price is None
                or old_price is None
            ):
                return 0

            price = Decimal(
                str(
                    price
                )
            )

            old_price = Decimal(
                str(
                    old_price
                )
            )

            if (
                old_price <= 0
                or old_price
                <= price
            ):
                return 0

            percentage = (
                (
                    old_price
                    - price
                )
                / old_price
            ) * Decimal(
                "100"
            )

        return round(
            float(
                percentage or 0
            ),
            2,
        )

    # =====================================================
    # Variants
    # =====================================================

    def get_active_variants(
        self,
        obj,
    ):
        prefetched_variants = (
            getattr(
                obj,
                "_prefetched_objects_cache",
                {},
            ).get(
                "variants"
            )
        )

        if (
            prefetched_variants
            is not None
        ):
            return [
                variant
                for variant
                in prefetched_variants
                if variant.is_active
            ]

        return list(
            obj.variants.filter(
                is_active=True,
            )
        )

    def get_total_stock(
        self,
        obj,
    ):
        variants = (
            self.get_active_variants(
                obj
            )
        )

        return sum(
            max(
                int(
                    variant.stock
                    or 0
                ),
                0,
            )
            for variant
            in variants
        )

    def get_is_in_stock(
        self,
        obj,
    ):
        variants = (
            self.get_active_variants(
                obj
            )
        )

        return any(
            int(
                variant.stock
                or 0
            ) > 0
            for variant
            in variants
        )

    def get_available_sizes(
        self,
        obj,
    ):
        variants = (
            self.get_active_variants(
                obj
            )
        )

        sizes = {
            str(
                variant.size
            ).strip()
            for variant
            in variants
            if (
                variant.size
                and int(
                    variant.stock
                    or 0
                ) > 0
            )
        }

        sizes.discard(
            ""
        )

        return sorted(
            sizes
        )

    def get_available_colors(
        self,
        obj,
    ):
        variants = (
            self.get_active_variants(
                obj
            )
        )

        colors = {}

        for variant in variants:
            color_name = str(
                variant.color
                or ""
            ).strip()

            if not color_name:
                continue

            color_key = (
                color_name.casefold()
            )

            if (
                color_key
                not in colors
            ):
                colors[
                    color_key
                ] = {
                    "name":
                        color_name,

                    "code":
                        (
                            str(
                                variant
                                .color_code
                                or ""
                            ).strip()
                            or "#111827"
                        ),

                    "has_stock":
                        False,

                    "sizes":
                        [],
                }

            if (
                int(
                    variant.stock
                    or 0
                ) > 0
            ):
                colors[
                    color_key
                ][
                    "has_stock"
                ] = True

                size = str(
                    variant.size
                    or ""
                ).strip()

                if (
                    size
                    and size
                    not in colors[
                        color_key
                    ][
                        "sizes"
                    ]
                ):
                    colors[
                        color_key
                    ][
                        "sizes"
                    ].append(
                        size
                    )

        result = list(
            colors.values()
        )

        for color in result:
            color[
                "sizes"
            ] = sorted(
                color[
                    "sizes"
                ]
            )

        return result

    # =====================================================
    # Reviews
    # =====================================================

    def get_approved_reviews(
        self,
        obj,
    ):
        prefetched_reviews = (
            getattr(
                obj,
                "_prefetched_objects_cache",
                {},
            ).get(
                "reviews"
            )
        )

        if (
            prefetched_reviews
            is not None
        ):
            return [
                review
                for review
                in prefetched_reviews
                if getattr(
                    review,
                    "status",
                    None,
                ) == "approved"
            ]

        return (
            obj.reviews.filter(
                status="approved",
            )
        )

    def get_rating(
        self,
        obj,
    ):
        annotated_rating = (
            getattr(
                obj,
                "approved_average_rating",
                None,
            )
        )

        if (
            annotated_rating
            is not None
        ):
            return round(
                float(
                    annotated_rating
                    or 0
                ),
                2,
            )

        approved_reviews = (
            self.get_approved_reviews(
                obj
            )
        )

        if isinstance(
            approved_reviews,
            list,
        ):
            if not approved_reviews:
                return 0.0

            ratings = [
                float(
                    review.rating
                    or 0
                )
                for review
                in approved_reviews
            ]

            return round(
                sum(
                    ratings
                )
                / len(
                    ratings
                ),
                2,
            )

        average = (
            approved_reviews
            .aggregate(
                average_rating=Avg(
                    "rating"
                ),
            )[
                "average_rating"
            ]
        )

        return round(
            float(
                average or 0
            ),
            2,
        )

    def get_total_reviews(
        self,
        obj,
    ):
        annotated_total = (
            getattr(
                obj,
                "approved_reviews_count",
                None,
            )
        )

        if (
            annotated_total
            is not None
        ):
            return int(
                annotated_total
                or 0
            )

        approved_reviews = (
            self.get_approved_reviews(
                obj
            )
        )

        if isinstance(
            approved_reviews,
            list,
        ):
            return len(
                approved_reviews
            )

        return (
            approved_reviews
            .count()
        )

    def get_rating_breakdown(
        self,
        obj,
    ):
        breakdown = {
            "5": 0,
            "4": 0,
            "3": 0,
            "2": 0,
            "1": 0,
        }

        approved_reviews = (
            self.get_approved_reviews(
                obj
            )
        )

        if isinstance(
            approved_reviews,
            list,
        ):
            for review in (
                approved_reviews
            ):
                try:
                    rating_key = str(
                        int(
                            review.rating
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):
                    continue

                if (
                    rating_key
                    in breakdown
                ):
                    breakdown[
                        rating_key
                    ] += 1

            return breakdown

        rating_data = (
            approved_reviews
            .values(
                "rating"
            )
            .annotate(
                total=Count(
                    "id"
                )
            )
        )

        for item in rating_data:
            try:
                rating_key = str(
                    int(
                        item[
                            "rating"
                        ]
                    )
                )

            except (
                TypeError,
                ValueError,
            ):
                continue

            if (
                rating_key
                in breakdown
            ):
                breakdown[
                    rating_key
                ] = int(
                    item[
                        "total"
                    ]
                    or 0
                )

        return breakdown


# =========================================================
# Product List Serializer
# =========================================================

class ProductListSerializer(
    ProductBaseSerializer
):

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

            "discount_amount",
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

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


# =========================================================
# Product Detail Serializer
# =========================================================

class ProductDetailSerializer(
    ProductBaseSerializer
):

    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    variants = (
        serializers.SerializerMethodField()
    )

    latest_reviews = (
        serializers.SerializerMethodField()
    )

    # =====================================================
    # Active Variants
    # =====================================================

    def get_variants(
        self,
        obj,
    ):
        variants = (
            self.get_active_variants(
                obj
            )
        )

        return (
            ProductVariantSerializer(
                variants,
                many=True,
                context=self.context,
            ).data
        )

    # =====================================================
    # Review User
    # =====================================================

    def get_review_user_name(
        self,
        review,
    ):
        user = getattr(
            review,
            "user",
            None,
        )

        if user is None:
            return "Customer"

        if hasattr(
            user,
            "get_full_name",
        ):
            full_name = (
                user
                .get_full_name()
                .strip()
            )

            if full_name:
                return full_name

        username = (
            getattr(
                user,
                "username",
                "",
            )
            or ""
        ).strip()

        if username:
            return username

        email = (
            getattr(
                user,
                "email",
                "",
            )
            or ""
        ).strip()

        if email:
            return (
                email.split(
                    "@",
                    1,
                )[0]
                or "Customer"
            )

        mobile = (
            getattr(
                user,
                "mobile",
                "",
            )
            or getattr(
                user,
                "phone",
                "",
            )
            or ""
        )

        return (
            str(
                mobile
            ).strip()
            or "Customer"
        )

    # =====================================================
    # Review Image
    # =====================================================

    def get_review_image_url(
        self,
        review,
    ):
        return build_file_url(
            self,
            getattr(
                review,
                "image",
                None,
            ),
        )

    # =====================================================
    # Latest Reviews
    # =====================================================

    def get_latest_reviews(
        self,
        obj,
    ):
        prefetched_reviews = (
            getattr(
                obj,
                "_prefetched_objects_cache",
                {},
            ).get(
                "reviews"
            )
        )

        if (
            prefetched_reviews
            is not None
        ):
            approved_reviews = [
                review
                for review
                in prefetched_reviews
                if getattr(
                    review,
                    "status",
                    None,
                ) == "approved"
            ]

            approved_reviews.sort(
                key=lambda review: (
                    review.created_at
                ),
                reverse=True,
            )

            reviews = (
                approved_reviews[
                    :5
                ]
            )

        else:
            reviews = (
                obj.reviews
                .filter(
                    status="approved",
                )
                .select_related(
                    "user",
                    "order_item",
                )
                .order_by(
                    "-created_at"
                )[
                    :5
                ]
            )

        return [
            {
                "id":
                    review.id,

                "rating":
                    review.rating,

                "title":
                    review.title,

                "comment":
                    review.comment,

                "user_name":
                    self.get_review_user_name(
                        review
                    ),

                "image_url":
                    self.get_review_image_url(
                        review
                    ),

                "is_verified_purchase":
                    bool(
                        getattr(
                            review,
                            "is_verified_purchase",
                            False,
                        )
                    ),

                "helpful_count":
                    int(
                        getattr(
                            review,
                            "helpful_count",
                            0,
                        )
                        or 0
                    ),

                "created_at":
                    review.created_at,
            }
            for review
            in reviews
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

            "discount_amount",
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

            "meta_title",
            "meta_description",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


# =========================================================
# Nested Admin Product Variant Write Serializer
# =========================================================

class ProductVariantWriteSerializer(
    serializers.ModelSerializer
):
    id = serializers.IntegerField(
        required=False,
    )

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
        )

    def validate_stock(
        self,
        value,
    ):
        if value < 0:
            raise (
                serializers
                .ValidationError(
                    "Stock cannot be negative."
                )
            )

        return value


# =========================================================
# Standalone Admin Variant Serializer
# =========================================================

class ProductVariantAdminSerializer(
    serializers.ModelSerializer
):
    is_in_stock = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    class Meta:
        model = ProductVariant

        fields = (
            "id",
            "product",
            "color",
            "color_code",
            "size",
            "stock",
            "sku",
            "is_active",
            "is_in_stock",
        )

        read_only_fields = (
            "id",
            "is_in_stock",
        )

    def get_is_in_stock(
        self,
        obj,
    ):
        return bool(
            obj.is_active
            and int(
                obj.stock
                or 0
            ) > 0
        )

    def validate_stock(
        self,
        value,
    ):
        if value < 0:
            raise (
                serializers
                .ValidationError(
                    "Stock cannot be negative."
                )
            )

        return value


# =========================================================
# Standalone Admin Image Serializer
# =========================================================

class ProductImageAdminSerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    class Meta:
        model = ProductImage

        fields = (
            "id",
            "product",
            "image",
            "image_url",
            "alt_text",
            "order",
        )

        read_only_fields = (
            "id",
            "image_url",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )


# =========================================================
# Admin Product Write Serializer
# =========================================================

class ProductAdminWriteSerializer(
    serializers.ModelSerializer
):
    variants = (
        ProductVariantWriteSerializer(
            many=True,
            required=False,
        )
    )

    class Meta:
        model = Product

        fields = (
            "id",

            "name",
            "slug",
            "sku",
            "description",

            "brand",
            "department",
            "category",
            "subcategory",

            "price",
            "old_price",

            "main_image",

            "is_active",
            "is_featured",
            "is_best_seller",
            "is_trending",
            "is_new_arrival",
            "is_clearance_sale",
            "is_offer",

            "meta_title",
            "meta_description",

            "variants",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    # =====================================================
    # Validation
    # =====================================================

    def validate(
        self,
        attrs,
    ):
        department = attrs.get(
            "department",
            getattr(
                self.instance,
                "department",
                None,
            ),
        )

        category = attrs.get(
            "category",
            getattr(
                self.instance,
                "category",
                None,
            ),
        )

        subcategory = attrs.get(
            "subcategory",
            getattr(
                self.instance,
                "subcategory",
                None,
            ),
        )

        price = attrs.get(
            "price",
            getattr(
                self.instance,
                "price",
                None,
            ),
        )

        old_price = attrs.get(
            "old_price",
            getattr(
                self.instance,
                "old_price",
                None,
            ),
        )

        # -------------------------------------------------
        # Department / Category validation
        # -------------------------------------------------

        if (
            category
            and department
            and category.department_id
            != department.id
        ):
            raise (
                serializers
                .ValidationError(
                    {
                        "category":
                            (
                                "Selected category "
                                "does not belong "
                                "to this department."
                            )
                    }
                )
            )

        # -------------------------------------------------
        # Category / Subcategory validation
        # -------------------------------------------------

        if (
            subcategory
            and category
            and subcategory.category_id
            != category.id
        ):
            raise (
                serializers
                .ValidationError(
                    {
                        "subcategory":
                            (
                                "Selected subcategory "
                                "does not belong "
                                "to this category."
                            )
                    }
                )
            )

        # -------------------------------------------------
        # Price validation
        # -------------------------------------------------

        if (
            price is not None
            and price < 0
        ):
            raise (
                serializers
                .ValidationError(
                    {
                        "price":
                            (
                                "Price cannot "
                                "be negative."
                            )
                    }
                )
            )

        if (
            old_price is not None
            and old_price < 0
        ):
            raise (
                serializers
                .ValidationError(
                    {
                        "old_price":
                            (
                                "Old price cannot "
                                "be negative."
                            )
                    }
                )
            )

        if (
            old_price is not None
            and price is not None
            and old_price < price
        ):
            raise (
                serializers
                .ValidationError(
                    {
                        "old_price":
                            (
                                "Old price cannot "
                                "be lower than "
                                "selling price."
                            )
                    }
                )
            )

        return attrs

    # =====================================================
    # Create
    # =====================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):
        variants_data = (
            validated_data.pop(
                "variants",
                [],
            )
        )

        product = Product(
            **validated_data
        )

        product.full_clean()
        product.save()

        for variant_data in (
            variants_data
        ):
            variant_data.pop(
                "id",
                None,
            )

            variant = (
                ProductVariant(
                    product=product,
                    **variant_data,
                )
            )

            variant.full_clean()
            variant.save()

        return product

    # =====================================================
    # Update
    # =====================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        variants_data = (
            validated_data.pop(
                "variants",
                None,
            )
        )

        for (
            field,
            value,
        ) in (
            validated_data.items()
        ):
            setattr(
                instance,
                field,
                value,
            )

        instance.full_clean()
        instance.save()

        if (
            variants_data
            is not None
        ):
            existing_variants = {
                variant.id:
                    variant
                for variant
                in instance
                .variants
                .all()
            }

            for variant_data in (
                variants_data
            ):
                variant_id = (
                    variant_data.pop(
                        "id",
                        None,
                    )
                )

                if (
                    variant_id
                    and variant_id
                    in existing_variants
                ):
                    variant = (
                        existing_variants[
                            variant_id
                        ]
                    )

                    for (
                        field,
                        value,
                    ) in (
                        variant_data.items()
                    ):
                        setattr(
                            variant,
                            field,
                            value,
                        )

                    variant.full_clean()
                    variant.save()

                else:
                    variant = (
                        ProductVariant(
                            product=instance,
                            **variant_data,
                        )
                    )

                    variant.full_clean()
                    variant.save()

        return instance


# =========================================================
# Backward Compatibility
# =========================================================

class ProductSerializer(
    ProductDetailSerializer
):
    """
    Maintains compatibility with older imports in the project.
    """

    pass