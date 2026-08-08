from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from .models import WishlistItem
from .serializers import WishlistItemSerializer


class WishlistListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        IsAuthenticated,
    ]

    serializer_class = (
        WishlistItemSerializer
    )

    def get_queryset(self):
        return (
            WishlistItem.objects.filter(
                user=self.request.user
            )
            .select_related(
                "product",
                "product__brand",
                "product__department",
                "product__category",
                "product__subcategory",
            )
            .prefetch_related(
                "product__variants",
            )
            .order_by("-created_at")
        )


class WishlistItemDeleteView(
    generics.DestroyAPIView
):
    permission_classes = [
        IsAuthenticated,
    ]

    serializer_class = (
        WishlistItemSerializer
    )

    def get_queryset(self):
        return WishlistItem.objects.filter(
            user=self.request.user
        )


class WishlistToggleView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def post(self, request):
        product_id = request.data.get(
            "product_id"
        )

        if not product_id:
            return Response(
                {
                    "detail": (
                        "product_id is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_object_or_404(
            Product,
            id=product_id,
            is_active=True,
        )

        existing_item = (
            WishlistItem.objects.filter(
                user=request.user,
                product=product,
            ).first()
        )

        if existing_item:
            existing_item.delete()

            return Response(
                {
                    "message": (
                        "Product removed from wishlist."
                    ),
                    "is_wishlisted": False,
                    "product_id": product.id,
                },
                status=status.HTTP_200_OK,
            )

        wishlist_item = (
            WishlistItem.objects.create(
                user=request.user,
                product=product,
            )
        )

        serializer = (
            WishlistItemSerializer(
                wishlist_item,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            {
                "message": (
                    "Product added to wishlist."
                ),
                "is_wishlisted": True,
                "wishlist_item": (
                    serializer.data
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class WishlistStatusView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
        product_id,
    ):
        is_wishlisted = (
            WishlistItem.objects.filter(
                user=request.user,
                product_id=product_id,
            ).exists()
        )

        return Response(
            {
                "product_id": product_id,
                "is_wishlisted": (
                    is_wishlisted
                ),
            }
        )


class WishlistClearView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def delete(self, request):
        deleted_count, _ = (
            WishlistItem.objects.filter(
                user=request.user
            ).delete()
        )

        return Response(
            {
                "message": (
                    "Wishlist cleared successfully."
                ),
                "deleted_count": (
                    deleted_count
                ),
            },
            status=status.HTTP_200_OK,
        )