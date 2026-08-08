from django.urls import path

from .views import (
    BrandListView,
    ProductDetailView,
    ProductListView,
)


urlpatterns = [
    path(
        "brands/",
        BrandListView.as_view(),
        name="brand-list",
    ),
    path(
        "",
        ProductListView.as_view(),
        name="product-list",
    ),
    path(
        "<int:id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
]