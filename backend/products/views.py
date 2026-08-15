from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Prefetch, Q

from rest_framework import generics, permissions

from reviews.models import Review

from .models import (
    Brand,
    Product,
    ProductImage,
    ProductVariant,
)

from .serializers import (
    BrandSerializer,
    ProductAdminWriteSerializer,
    ProductDetailSerializer,
    ProductImageAdminSerializer,
    ProductListSerializer,
    ProductVariantAdminSerializer,
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

    return (
        str(value)
        .strip()
        .lower()
        in TRUE_VALUES
    )


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
# Permissions
# =========================================================

class IsAdminUserForProducts(
    permissions.BasePermission
):
    """
    Allow access only to authenticated admin/staff users.
    """

    message = (
        "Admin access is required "
        "to manage products."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
        ):
            return False

        return bool(
            getattr(
                user,
                "is_staff",
                False,
            )
            or getattr(
                user,
                "is_superuser",
                False,
            )
            or getattr(
                user,
                "is_admin",
                False,
            )
        )


# =========================================================
# Shared Public Product Queryset
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
# Shared Admin Product Queryset
# =========================================================

def admin_product_queryset():
    """
    Admin queryset includes active and inactive products,
    variants, images and category relations.
    """

    return (
        Product.objects
        .all()
        .select_related(
            "brand",
            "department",
            "category",
            "subcategory",
        )
        .prefetch_related(
            "variants",
            "images",
        )
        .order_by(
            "-created_at"
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

    permission_classes = (
        permissions.AllowAny,
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

    permission_classes = (
        permissions.AllowAny,
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

            "price_asc":
                "price",

            "price_desc":
                "-price",

            "name":
                "name",

            "-name":
                "-name",

            "name_asc":
                "name",

            "name_desc":
                "-name",

            "created_at":
                "created_at",

            "-created_at":
                "-created_at",

            "newest":
                "-created_at",

            "oldest":
                "created_at",

            "rating":
                "approved_average_rating",

            "-rating":
                "-approved_average_rating",

            "rating_desc":
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

    permission_classes = (
        permissions.AllowAny,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            base_product_queryset()
        )


# =========================================================
# Admin Product List / Create
# =========================================================

class AdminProductListCreateView(
    generics.ListCreateAPIView
):
    """
    GET:
        Return all products for admin,
        including inactive products.

    POST:
        Create product with optional nested variants.
    """

    serializer_class = (
        ProductAdminWriteSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    def get_queryset(self):
        queryset = (
            admin_product_queryset()
        )

        params = (
            self.request.query_params
        )

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
                        sku__icontains=search
                    )
                    | Q(
                        slug__icontains=search
                    )
                    | Q(
                        brand__name__icontains=search
                    )
                )
            )

        department = (
            params.get(
                "department"
            )
        )

        if department:
            queryset = (
                queryset.filter(
                    department__slug=department
                )
            )

        category = (
            params.get(
                "category"
            )
        )

        if category:
            queryset = (
                queryset.filter(
                    category__slug=category
                )
            )

        active = (
            params.get(
                "is_active"
            )
        )

        if active is not None:
            queryset = (
                queryset.filter(
                    is_active=query_bool(
                        active
                    )
                )
            )

        return queryset.distinct()


# =========================================================
# Admin Product Retrieve / Update / Delete
# =========================================================

class AdminProductDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    """
    GET:
        Retrieve a product for admin editing.

    PUT/PATCH:
        Update product and optionally nested variants.

    DELETE:
        Delete product and cascading variants/images.
    """

    serializer_class = (
        ProductAdminWriteSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            admin_product_queryset()
        )


# =========================================================
# Admin Variant List / Create
# =========================================================

class AdminProductVariantListCreateView(
    generics.ListCreateAPIView
):
    """
    GET:
        List variants.

    POST:
        Create a standalone product variant.

    Optional:
        ?product=1
    """

    serializer_class = (
        ProductVariantAdminSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    def get_queryset(self):
        queryset = (
            ProductVariant.objects
            .select_related(
                "product"
            )
            .order_by(
                "product",
                "color",
                "size",
            )
        )

        product_id = (
            self.request
            .query_params
            .get(
                "product"
            )
        )

        if product_id:
            queryset = (
                queryset.filter(
                    product_id=product_id
                )
            )

        return queryset


# =========================================================
# Admin Variant Retrieve / Update / Delete
# =========================================================

class AdminProductVariantDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        ProductVariantAdminSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    lookup_field = "id"

    queryset = (
        ProductVariant.objects
        .select_related(
            "product"
        )
        .all()
    )


# =========================================================
# Admin Image List / Create
# =========================================================

class AdminProductImageListCreateView(
    generics.ListCreateAPIView
):
    """
    GET:
        List gallery images.

    POST:
        Upload/create a product gallery image.

    Optional:
        ?product=1
    """

    serializer_class = (
        ProductImageAdminSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    def get_queryset(self):
        queryset = (
            ProductImage.objects
            .select_related(
                "product"
            )
            .order_by(
                "product",
                "order",
                "id",
            )
        )

        product_id = (
            self.request
            .query_params
            .get(
                "product"
            )
        )

        if product_id:
            queryset = (
                queryset.filter(
                    product_id=product_id
                )
            )

        return queryset


# =========================================================
# Admin Image Retrieve / Update / Delete
# =========================================================

class AdminProductImageDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        ProductImageAdminSerializer
    )

    permission_classes = (
        IsAdminUserForProducts,
    )

    lookup_field = "id"

    queryset = (
        ProductImage.objects
        .select_related(
            "product"
        )
        .all()
    )