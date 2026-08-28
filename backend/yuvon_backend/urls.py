"""
URL configuration for yuvon_backend project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve as media_serve


# =========================================================
# API Home
# =========================================================

def api_home(request):
    return JsonResponse(
        {
            "message": "Yuvon Backend API is Running 🚀",
            "status": "success",
        }
    )


# =========================================================
# URL Patterns
# =========================================================

urlpatterns = [

    # =====================================================
    # Django Admin
    # =====================================================

    path(
        "admin/",
        admin.site.urls,
    ),

    # =====================================================
    # API Home
    # =====================================================

    path(
        "api/",
        api_home,
        name="api-home",
    ),

    # =====================================================
    # Accounts
    # =====================================================

    path(
        "api/accounts/",
        include(
            "accounts.urls"
        ),
    ),

    # =====================================================
    # Categories
    # =====================================================

    path(
        "api/categories/",
        include(
            "categories.urls"
        ),
    ),

    # =====================================================
    # Products
    # =====================================================

    path(
        "api/products/",
        include(
            "products.urls"
        ),
    ),

    # =====================================================
    # Cart
    # =====================================================

    path(
        "api/cart/",
        include(
            "cart.urls"
        ),
    ),

    # =====================================================
    # Wishlist
    # =====================================================

    path(
        "api/wishlist/",
        include(
            "wishlist.urls"
        ),
    ),

    # =====================================================
    # Orders
    # =====================================================

    path(
        "api/orders/",
        include(
            "orders.urls"
        ),
    ),

    # =====================================================
    # Reviews
    # =====================================================

    path(
        "api/reviews/",
        include(
            "reviews.urls"
        ),
    ),

    # =====================================================
    # Coupons
    # =====================================================

    path(
        "api/coupons/",
        include(
            "coupons.urls"
        ),
    ),

    # =====================================================
    # Inventory
    # =====================================================

    path(
        "api/inventory/",
        include(
            "inventory.urls"
        ),
    ),

    # =====================================================
    # Dashboard
    # =====================================================

    path(
        "api/dashboard/",
        include(
            "dashboard.urls"
        ),
    ),

    # =====================================================
    # Core
    # =====================================================

    path(
        "api/core/",
        include(
            "core.urls"
        ),
    ),
]


# =========================================================
# Local Media Serving
# =========================================================
#
# Normal Django static() helper only serves MEDIA files
# automatically while DEBUG=True.
#
# In this project we also want local media serving when:
#
# SERVE_MEDIA_LOCALLY=True
#
# even if:
#
# DEBUG=False
#
# This is useful for local production-style testing.
#
# IMPORTANT:
# Do not use this setup as the long-term production media
# solution. Production should use Cloudinary, S3, a
# persistent volume + web server, etc.
# =========================================================

SERVE_MEDIA_LOCALLY = getattr(
    settings,
    "SERVE_MEDIA_LOCALLY",
    False,
)


# =========================================================
# Standard Development Mode
# =========================================================

if settings.DEBUG:

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )


# =========================================================
# Local Production-Style Testing
# =========================================================
#
# django.conf.urls.static.static() refuses to create the
# media route when DEBUG=False.
#
# Therefore when DEBUG=False and SERVE_MEDIA_LOCALLY=True,
# explicitly register django.views.static.serve.
# =========================================================

elif SERVE_MEDIA_LOCALLY:

    media_url = (
        settings.MEDIA_URL
        .lstrip("/")
    )

    urlpatterns += [
        re_path(
            rf"^{media_url}(?P<path>.*)$",
            media_serve,
            {
                "document_root":
                    settings.MEDIA_ROOT,
            },
        ),
    ]