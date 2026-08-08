from django.urls import path

from .views import (
    WishlistListCreateView,
    WishlistItemDeleteView,
    WishlistToggleView,
    WishlistStatusView,
    WishlistClearView,
)

urlpatterns = [
    path(
        "",
        WishlistListCreateView.as_view(),
        name="wishlist-list",
    ),

    path(
        "<int:pk>/",
        WishlistItemDeleteView.as_view(),
        name="wishlist-delete",
    ),

    path(
        "toggle/",
        WishlistToggleView.as_view(),
        name="wishlist-toggle",
    ),

    path(
        "status/<int:product_id>/",
        WishlistStatusView.as_view(),
        name="wishlist-status",
    ),

    path(
        "clear/",
        WishlistClearView.as_view(),
        name="wishlist-clear",
    ),
]