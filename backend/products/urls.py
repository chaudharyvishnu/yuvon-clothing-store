from django.urls import path

from .views import (
    BrandListView,
    ProductDetailView,
    ProductListView,
)


app_name = "products"


urlpatterns = [
    # =====================================================
    # Brands
    # =====================================================

    # GET /api/products/brands/
    path(
        "brands/",
        BrandListView.as_view(),
        name="brand-list",
    ),

    # =====================================================
    # Products
    # =====================================================

    # GET /api/products/
    #
    # Supported examples:
    #
    # ?search=tshirt
    # ?department=men
    # ?category=men-clothing
    # ?subcategory=men-clothing-t-shirts
    # ?brand=nike
    #
    # ?new_arrival=true
    # ?featured=true
    # ?best_seller=true
    # ?trending=true
    # ?offer=true
    # ?clearance=true
    #
    # ?min_price=500
    # ?max_price=2000
    #
    # ?ordering=price
    # ?ordering=-price
    # ?ordering=name
    # ?ordering=-created_at
    # ?ordering=-rating
    #
    path(
        "",
        ProductListView.as_view(),
        name="product-list",
    ),

    # =====================================================
    # Product Detail
    # =====================================================

    # GET /api/products/123/
    path(
        "<int:id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
]