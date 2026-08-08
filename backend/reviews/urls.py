from django.urls import path

from .views import (
    ProductReviewListView,
    ProductReviewSummaryView,
    ReviewCreateView,
    MyReviewListView,
    MyReviewDetailView,
    ToggleReviewHelpfulView,
    ReviewEligibilityView,
)

urlpatterns = [

    # Public Reviews
    path(
        "product/<int:product_id>/",
        ProductReviewListView.as_view(),
        name="product-review-list",
    ),

    path(
        "product/<int:product_id>/summary/",
        ProductReviewSummaryView.as_view(),
        name="product-review-summary",
    ),

    # Create Review
    path(
        "create/",
        ReviewCreateView.as_view(),
        name="review-create",
    ),

    # My Reviews
    path(
        "my-reviews/",
        MyReviewListView.as_view(),
        name="my-review-list",
    ),

    path(
        "my-reviews/<int:pk>/",
        MyReviewDetailView.as_view(),
        name="my-review-detail",
    ),

    # Helpful Vote
    path(
        "<int:review_id>/helpful/",
        ToggleReviewHelpfulView.as_view(),
        name="review-helpful",
    ),

    # Eligibility
    path(
        "product/<int:product_id>/eligibility/",
        ReviewEligibilityView.as_view(),
        name="review-eligibility",
    ),
]