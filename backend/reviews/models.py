from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class Review(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.SET_NULL,
        related_name="reviews",
        null=True,
        blank=True,
    )

    rating = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
    )

    title = models.CharField(
        max_length=150,
        blank=True,
    )

    comment = models.TextField()

    image = models.ImageField(
        upload_to="reviews/images/",
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    is_verified_purchase = models.BooleanField(
        default=False,
        db_index=True,
    )

    helpful_count = models.PositiveIntegerField(
        default=0,
    )

    admin_note = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("-created_at",)

        constraints = [
            models.UniqueConstraint(
                fields=("product", "user"),
                name="unique_product_review_per_user",
            ),
            models.CheckConstraint(
                condition=Q(
                    rating__gte=1,
                    rating__lte=5,
                ),
                name="review_rating_between_1_and_5",
            ),
        ]

        indexes = [
            models.Index(
                fields=("product", "status", "-created_at"),
                name="review_product_status_idx",
            ),
            models.Index(
                fields=("user", "-created_at"),
                name="review_user_created_idx",
            ),
            models.Index(
                fields=("rating",),
                name="review_rating_idx",
            ),
            models.Index(
                fields=("is_verified_purchase", "status"),
                name="review_verified_status_idx",
            ),
        ]

        verbose_name = "Review"
        verbose_name_plural = "Reviews"

    def __str__(self):
        return (
            f"{self.product.name} - "
            f"{self.user} - "
            f"{self.rating}/5"
        )

    def clean(self):
        super().clean()

        errors = {}

        if self.order_item_id:
            order_item = self.order_item

            if (
                order_item.product_id
                and order_item.product_id != self.product_id
            ):
                errors["order_item"] = (
                    "The selected order item does not belong "
                    "to this product."
                )

            order_user_id = getattr(
                order_item.order,
                "user_id",
                None,
            )

            if (
                order_user_id
                and order_user_id != self.user_id
            ):
                errors["order_item"] = (
                    "The selected order item does not belong "
                    "to this user."
                )

        if errors:
            raise ValidationError(errors)

    @property
    def is_approved(self):
        return self.status == "approved"


class ReviewHelpful(models.Model):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="helpful_votes",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="helpful_review_votes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ("-created_at",)

        constraints = [
            models.UniqueConstraint(
                fields=("review", "user"),
                name="unique_helpful_vote_per_user",
            ),
        ]

        indexes = [
            models.Index(
                fields=("review", "-created_at"),
                name="review_helpful_review_idx",
            ),
            models.Index(
                fields=("user", "-created_at"),
                name="review_helpful_user_idx",
            ),
        ]

        verbose_name = "Review Helpful Vote"
        verbose_name_plural = "Review Helpful Votes"

    def __str__(self):
        return (
            f"{self.user} marked "
            f"review {self.review_id} helpful"
        )

    def clean(self):
        super().clean()

        if (
            self.review_id
            and self.user_id
            and self.review.user_id == self.user_id
        ):
            raise ValidationError(
                {
                    "user": (
                        "You cannot mark your own review as helpful."
                    )
                }
            )
