"""
URL configuration for yuvon_backend project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_home(request):
    return JsonResponse(
        {
            "message": "Yuvon Backend API is Running 🚀",
            "status": "success",
        }
    )


urlpatterns = [
    # ==========================================
    # Admin
    # ==========================================
    path("admin/", admin.site.urls),

    # ==========================================
    # API Home
    # ==========================================
    path(
        "api/",
        api_home,
        name="api-home",
    ),

    # ==========================================
    # Accounts
    # ==========================================
    path(
        "api/accounts/",
        include("accounts.urls"),
    ),

    # ==========================================
    # Categories
    # ==========================================
    path(
        "api/categories/",
        include("categories.urls"),
    ),

    # ==========================================
    # Products
    # ==========================================
    path(
        "api/products/",
        include("products.urls"),
    ),

    # ==========================================
    # Cart
    # ==========================================
    path(
        "api/cart/",
        include("cart.urls"),
    ),

    # ==========================================
    # Wishlist
    # ==========================================
    path(
        "api/wishlist/",
        include("wishlist.urls"),
    ),

    # ==========================================
    # Orders
    # ==========================================
    path(
        "api/orders/",
        include("orders.urls"),
    ),

    # ==========================================
    # Reviews
    # ==========================================
    path(
        "api/reviews/",
        include("reviews.urls"),
    ),

    # ==========================================
    # Coupons
    # ==========================================
    path(
        "api/coupons/",
        include("coupons.urls"),
    ),

    # ==========================================
    # Inventory
    # ==========================================
    path(
        "api/inventory/",
        include("inventory.urls"),
    ),

    # ==========================================
    # Dashboard
    # ==========================================
    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),

    # ==========================================
    # Core
    # ==========================================
    path(
        "api/core/",
        include("core.urls"),
    ),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )