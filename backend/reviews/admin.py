from django.contrib import admin
from django.db.models import Count

from .models import Review, ReviewHelpful


class ReviewHelpfulInline(admin.TabularInline):
    model = ReviewHelpful
    extra = 0
    can_delete = False

    readonly_fields = (
        "user",
        "created_at",
    )

    fields = (
        "user",
        "created_at",
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "user",
        "rating",
        "status",
        "is_verified_purchase",
        "helpful_count_display",
        "created_at",
    )

    list_filter = (
        "status",
        "rating",
        "is_verified_purchase",
        "created_at",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "user__username",
        "user__email",
        "title",
        "comment",
    )

    readonly_fields = (
        "helpful_count_display",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "product",
        "user",
        "order_item",
    )

    list_select_related = (
        "product",
        "user",
        "order_item",
    )

    inlines = (
        ReviewHelpfulInline,
    )

    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 25

    fieldsets = (
        (
            "Review Information",
            {
                "fields": (
                    "product",
                    "user",
                    "order_item",
                    "rating",
                    "title",
                    "comment",
                    "image",
                )
            },
        ),
        (
            "Moderation",
            {
                "fields": (
                    "status",
                    "is_verified_purchase",
                    "helpful_count_display",
                    "admin_note",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = (
        "approve_reviews",
        "reject_reviews",
        "mark_as_verified_purchase",
        "remove_verified_purchase",
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)

        return queryset.annotate(
            helpful_votes_total=Count(
                "helpful_votes",
                distinct=True,
            )
        )

    @admin.display(
        description="Helpful Votes",
        ordering="helpful_votes_total",
    )
    def helpful_count_display(self, obj):
        return getattr(
            obj,
            "helpful_votes_total",
            obj.helpful_count,
        )

    @admin.action(
        description="Approve selected reviews"
    )
    def approve_reviews(self, request, queryset):
        updated = queryset.update(
            status="approved"
        )

        self.message_user(
            request,
            f"{updated} review(s) approved.",
        )

    @admin.action(
        description="Reject selected reviews"
    )
    def reject_reviews(self, request, queryset):
        updated = queryset.update(
            status="rejected"
        )

        self.message_user(
            request,
            f"{updated} review(s) rejected.",
        )

    @admin.action(
        description="Mark selected as verified purchase"
    )
    def mark_as_verified_purchase(
        self,
        request,
        queryset,
    ):
        updated = queryset.update(
            is_verified_purchase=True
        )

        self.message_user(
            request,
            (
                f"{updated} review(s) marked "
                "as verified purchase."
            ),
        )

    @admin.action(
        description="Remove verified purchase status"
    )
    def remove_verified_purchase(
        self,
        request,
        queryset,
    ):
        updated = queryset.update(
            is_verified_purchase=False
        )

        self.message_user(
            request,
            (
                f"Verified purchase removed from "
                f"{updated} review(s)."
            ),
        )


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    list_display = (
        "review",
        "user",
        "created_at",
    )

    list_filter = (
        "created_at",
    )

    search_fields = (
        "review__product__name",
        "review__title",
        "user__username",
        "user__email",
    )

    autocomplete_fields = (
        "review",
        "user",
    )

    readonly_fields = (
        "created_at",
    )

    list_select_related = (
        "review",
        "user",
    )

    ordering = (
        "-created_at",
    )