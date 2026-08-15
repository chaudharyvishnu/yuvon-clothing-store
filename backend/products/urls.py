from django.urls import path

from .views import (
    AdminProductDetailView,
    AdminProductImageDetailView,
    AdminProductImageListCreateView,
    AdminProductListCreateView,
    AdminProductVariantDetailView,
    AdminProductVariantListCreateView,
    BrandListView,
    ProductDetailView,
    ProductListView,
)


app_name = "products"


urlpatterns = [
    # =====================================================
    # Public Brands
    # =====================================================

    # GET /api/products/brands/
    path(
        "brands/",
        BrandListView.as_view(),
        name="brand-list",
    ),

    # =====================================================
    # Admin Product Management
    # IMPORTANT:
    # Keep admin routes ABOVE <int:id>/ so they are not
    # confused with product detail routes.
    # =====================================================

    # GET  /api/products/admin/
    # POST /api/products/admin/
    path(
        "admin/",
        AdminProductListCreateView.as_view(),
        name="admin-product-list-create",
    ),

    # GET    /api/products/admin/1/
    # PUT    /api/products/admin/1/
    # PATCH  /api/products/admin/1/
    # DELETE /api/products/admin/1/
    path(
        "admin/<int:id>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),

    # =====================================================
    # Admin Product Variants
    # =====================================================

    # GET  /api/products/admin/variants/
    # POST /api/products/admin/variants/
    #
    # Optional filtering:
    # /api/products/admin/variants/?product=1
    path(
        "admin/variants/",
        AdminProductVariantListCreateView.as_view(),
        name="admin-variant-list-create",
    ),

    # GET    /api/products/admin/variants/10/
    # PUT    /api/products/admin/variants/10/
    # PATCH  /api/products/admin/variants/10/
    # DELETE /api/products/admin/variants/10/
    path(
        "admin/variants/<int:id>/",
        AdminProductVariantDetailView.as_view(),
        name="admin-variant-detail",
    ),

    # =====================================================
    # Admin Product Images
    # =====================================================

    # GET  /api/products/admin/images/
    # POST /api/products/admin/images/
    #
    # Optional filtering:
    # /api/products/admin/images/?product=1
    path(
        "admin/images/",
        AdminProductImageListCreateView.as_view(),
        name="admin-image-list-create",
    ),

    # GET    /api/products/admin/images/10/
    # PUT    /api/products/admin/images/10/
    # PATCH  /api/products/admin/images/10/
    # DELETE /api/products/admin/images/10/
    path(
        "admin/images/<int:id>/",
        AdminProductImageDetailView.as_view(),
        name="admin-image-detail",
    ),

    # =====================================================
    # Public Product List
    # =====================================================

    # GET /api/products/
    #
    # Examples:
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
    # ?ordering=price_asc
    # ?ordering=price_desc
    # ?ordering=name
    # ?ordering=-name
    # ?ordering=newest
    # ?ordering=oldest
    # ?ordering=rating
    # ?ordering=-rating
    #
    path(
        "",
        ProductListView.as_view(),
        name="product-list",
    ),

    # =====================================================
    # Public Product Detail
    # =====================================================

    # GET /api/products/123/
    path(
        "<int:id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
]