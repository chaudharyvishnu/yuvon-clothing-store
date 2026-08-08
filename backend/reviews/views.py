from django.db import transaction
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from .models import Review, ReviewHelpful
from .serializers import (
    ReviewCreateSerializer,
    ReviewSerializer,
    ReviewSummarySerializer,
    ReviewUpdateSerializer,
)


# =========================================================
# Public Product Reviews
# =========================================================

class ProductReviewListView(generics.ListAPIView):
    """
    GET /api/reviews/product/<product_id>/

    Sirf approved reviews return karega.
    """

    serializer_class = ReviewSerializer
    permission_classes = [
        permissions.AllowAny,
    ]

    def get_queryset(self):
        product_id = self.kwargs["product_id"]

        return (
            Review.objects.filter(
                product_id=product_id,
                status="approved",
            )
            .select_related(
                "product",
                "user",
                "order_item",
            )
            .prefetch_related(
                "helpful_votes",
            )
            .order_by("-created_at")
        )


class ProductReviewSummaryView(APIView):
    """
    GET /api/reviews/product/<product_id>/summary/
    """

    permission_classes = [
        permissions.AllowAny,
    ]

    def get(self, request, product_id):
        get_object_or_404(
            Product,
            id=product_id,
            is_active=True,
        )

        queryset = Review.objects.filter(
            product_id=product_id,
            status="approved",
        )

        aggregate_data = queryset.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
        )

        rating_counts = {
            rating: queryset.filter(
                rating=rating
            ).count()
            for rating in range(1, 6)
        }

        response_data = {
            "average_rating": round(
                float(
                    aggregate_data[
                        "average_rating"
                    ]
                    or 0
                ),
                2,
            ),
            "total_reviews": int(
                aggregate_data[
                    "total_reviews"
                ]
                or 0
            ),
            "rating_breakdown": {
                str(rating): rating_counts[rating]
                for rating in range(5, 0, -1)
            },
        }

        serializer = ReviewSummarySerializer(
            response_data
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Create Review
# =========================================================

class ReviewCreateView(generics.CreateAPIView):
    """
    POST /api/reviews/create/

    Logged-in user review create karega.
    """

    serializer_class = ReviewCreateSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        review = serializer.save()

        response_serializer = ReviewSerializer(
            review,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "message": (
                    "Review submitted successfully "
                    "and is waiting for approval."
                ),
                "review": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# Logged-in User Reviews
# =========================================================

class MyReviewListView(generics.ListAPIView):
    """
    GET /api/reviews/my-reviews/
    """

    serializer_class = ReviewSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            Review.objects.filter(
                user=self.request.user,
            )
            .select_related(
                "product",
                "user",
                "order_item",
            )
            .prefetch_related(
                "helpful_votes",
            )
            .order_by("-created_at")
        )


class MyReviewDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    """
    GET    /api/reviews/my-reviews/<id>/
    PATCH  /api/reviews/my-reviews/<id>/
    PUT    /api/reviews/my-reviews/<id>/
    DELETE /api/reviews/my-reviews/<id>/
    """

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        return Review.objects.filter(
            user=self.request.user,
        )

    def get_serializer_class(self):
        if self.request.method in {
            "PUT",
            "PATCH",
        }:
            return ReviewUpdateSerializer

        return ReviewSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop(
            "partial",
            False,
        )

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        review = serializer.save()

        response_serializer = ReviewSerializer(
            review,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "message": (
                    "Review updated successfully "
                    "and moved to pending approval."
                ),
                "review": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        review.delete()

        return Response(
            {
                "message": (
                    "Review deleted successfully."
                )
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Helpful Vote
# =========================================================

class ToggleReviewHelpfulView(APIView):
    """
    POST /api/reviews/<review_id>/helpful/

    Same endpoint helpful vote add/remove karega.
    """

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    @transaction.atomic
    def post(self, request, review_id):
        review = get_object_or_404(
            Review.objects.select_for_update(),
            id=review_id,
            status="approved",
        )

        helpful_vote = (
            ReviewHelpful.objects.filter(
                review=review,
                user=request.user,
            ).first()
        )

        if helpful_vote:
            helpful_vote.delete()
            is_helpful = False
            message = "Helpful vote removed."
        else:
            ReviewHelpful.objects.create(
                review=review,
                user=request.user,
            )
            is_helpful = True
            message = "Review marked as helpful."

        helpful_count = (
            ReviewHelpful.objects.filter(
                review=review
            ).count()
        )

        Review.objects.filter(
            id=review.id
        ).update(
            helpful_count=helpful_count
        )

        return Response(
            {
                "message": message,
                "is_helpful": is_helpful,
                "helpful_count": helpful_count,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Review Eligibility
# =========================================================

class ReviewEligibilityView(APIView):
    """
    GET /api/reviews/product/<product_id>/eligibility/

    Logged-in user review de sakta hai ya nahi.
    """

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get(self, request, product_id):
        product = get_object_or_404(
            Product,
            id=product_id,
            is_active=True,
        )

        existing_review = (
            Review.objects.filter(
                product=product,
                user=request.user,
            )
            .values(
                "id",
                "status",
            )
            .first()
        )

        if existing_review:
            return Response(
                {
                    "can_review": False,
                    "reason": (
                        "You have already reviewed "
                        "this product."
                    ),
                    "existing_review": (
                        existing_review
                    ),
                },
                status=status.HTTP_200_OK,
            )

        delivered_order_item = (
            request.user.orders.filter(
                status="delivered",
                items__product=product,
            )
            .values(
                "items__id",
            )
            .first()
        )

        return Response(
            {
                "can_review": True,
                "verified_purchase_available": bool(
                    delivered_order_item
                ),
                "order_item_id": (
                    delivered_order_item[
                        "items__id"
                    ]
                    if delivered_order_item
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )