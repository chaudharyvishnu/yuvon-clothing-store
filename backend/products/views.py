from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Prefetch, Q
from rest_framework import generics

from reviews.models import Review

from .models import (
    Brand,
    Product,
    ProductImage,
    ProductVariant,
)
from .serializers import (
    BrandSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


# =========================================================
# Helpers
# =========================================================

TRUE_VALUES = {
    "1",
    "true",
    "yes",
    "on",
}


def query_bool(value):
    if value is None:
        return False

    return str(
        value
    ).strip().lower() in TRUE_VALUES


def query_decimal(value):
    if value in {
        None,
        "",
    }:
        return None

    try:
        return Decimal(
            str(value)
        )
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        return None


# =========================================================
# Shared Product Queryset
# =========================================================

def base_product_queryset():
    approved_reviews = (
        Review.objects
        .filter(
            status="approved",
        )
        .select_related(
            "user",
            "order_item",
        )
        .order_by(
            "-created_at"
        )
    )

    active_variants = (
        ProductVariant.objects
        .filter(
            is_active=True,
        )
        .order_by(
            "color",
            "size",
        )
    )

    ordered_images = (
        ProductImage.objects
        .all()
        .order_by(
            "order",
            "id",
        )
    )

    return (
        Product.objects
        .filter(
            is_active=True,
        )
        .select_related(
            "brand",
            "department",
            "category",
            "subcategory",
        )
        .prefetch_related(
            Prefetch(
                "variants",
                queryset=active_variants,
            ),
            Prefetch(
                "images",
                queryset=ordered_images,
            ),
            Prefetch(
                "reviews",
                queryset=approved_reviews,
            ),
        )
        .annotate(
            approved_average_rating=Avg(
                "reviews__rating",
                filter=Q(
                    reviews__status="approved"
                ),
            ),
            approved_reviews_count=Count(
                "reviews",
                filter=Q(
                    reviews__status="approved"
                ),
                distinct=True,
            ),
        )
    )


# =========================================================
# Brand List
# =========================================================

class BrandListView(
    generics.ListAPIView
):
    serializer_class = (
        BrandSerializer
    )

    def get_queryset(self):
        return (
            Brand.objects
            .filter(
                is_active=True,
            )
            .order_by(
                "name"
            )
        )


# =========================================================
# Product List
# =========================================================

class ProductListView(
    generics.ListAPIView
):
    serializer_class = (
        ProductListSerializer
    )

    def get_queryset(self):
        queryset = (
            base_product_queryset()
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Search
        # -------------------------------------------------

        search = (
            params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = (
                queryset.filter(
                    Q(
                        name__icontains=search
                    )
                    | Q(
                        description__icontains=search
                    )
                    | Q(
                        sku__icontains=search
                    )
                    | Q(
                        brand__name__icontains=search
                    )
                    | Q(
                        department__name__icontains=search
                    )
                    | Q(
                        category__name__icontains=search
                    )
                    | Q(
                        subcategory__name__icontains=search
                    )
                )
            )

        # -------------------------------------------------
        # Navigation filters
        # -------------------------------------------------

        department = (
            params.get(
                "department"
            )
        )

        category = (
            params.get(
                "category"
            )
        )

        subcategory = (
            params.get(
                "subcategory"
            )
        )

        brand = (
            params.get(
                "brand"
            )
        )

        if department:
            queryset = (
                queryset.filter(
                    department__slug=department
                )
            )

        if category:
            queryset = (
                queryset.filter(
                    category__slug=category
                )
            )

        if subcategory:
            queryset = (
                queryset.filter(
                    subcategory__slug=subcategory
                )
            )

        if brand:
            queryset = (
                queryset.filter(
                    brand__slug=brand
                )
            )

        # -------------------------------------------------
        # Collection filters
        # -------------------------------------------------

        if query_bool(
            params.get(
                "new_arrival"
            )
        ):
            queryset = (
                queryset.filter(
                    is_new_arrival=True
                )
            )

        if query_bool(
            params.get(
                "clearance"
            )
        ):
            queryset = (
                queryset.filter(
                    is_clearance_sale=True
                )
            )

        if query_bool(
            params.get(
                "featured"
            )
        ):
            queryset = (
                queryset.filter(
                    is_featured=True
                )
            )

        if query_bool(
            params.get(
                "best_seller"
            )
        ):
            queryset = (
                queryset.filter(
                    is_best_seller=True
                )
            )

        if query_bool(
            params.get(
                "trending"
            )
        ):
            queryset = (
                queryset.filter(
                    is_trending=True
                )
            )

        if query_bool(
            params.get(
                "offer"
            )
        ):
            queryset = (
                queryset.filter(
                    is_offer=True
                )
            )

        # -------------------------------------------------
        # Price filters
        # -------------------------------------------------

        min_price = query_decimal(
            params.get(
                "min_price"
            )
        )

        max_price = query_decimal(
            params.get(
                "max_price"
            )
        )

        if min_price is not None:
            queryset = (
                queryset.filter(
                    price__gte=min_price
                )
            )

        if max_price is not None:
            queryset = (
                queryset.filter(
                    price__lte=max_price
                )
            )

        # -------------------------------------------------
        # Sorting
        # -------------------------------------------------

        ordering = (
            params
            .get(
                "ordering",
                "",
            )
            .strip()
        )

        allowed_ordering = {
            "price":
                "price",

            "-price":
                "-price",

            "name":
                "name",

            "-name":
                "-name",

            "created_at":
                "created_at",

            "-created_at":
                "-created_at",

            "rating":
                "approved_average_rating",

            "-rating":
                "-approved_average_rating",
        }

        if ordering in allowed_ordering:
            queryset = (
                queryset.order_by(
                    allowed_ordering[
                        ordering
                    ],
                    "-created_at",
                )
            )

        return queryset.distinct()


# =========================================================
# Product Detail
# =========================================================

class ProductDetailView(
    generics.RetrieveAPIView
):
    serializer_class = (
        ProductDetailSerializer
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            base_product_queryset()
        )