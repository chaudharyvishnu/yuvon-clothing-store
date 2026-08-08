from django.contrib import admin
from django.utils import timezone

from .models import Coupon, CouponUsage


# =========================================================
# Coupon Usage Inline
# =========================================================

class CouponUsageInline(admin.TabularInline):
    model = CouponUsage
    extra = 0
    can_delete = False
    show_change_link = True

    readonly_fields = (
        "user",
        "order",
        "discount_amount",
        "used_at",
    )

    fields = (
        "user",
        "order",
        "discount_amount",
        "used_at",
    )

    ordering = (
        "-used_at",
    )


# =========================================================
# Coupon Admin
# =========================================================

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "discount_type",
        "discount_value",
        "minimum_order_amount",
        "maximum_discount_amount",
        "total_usage_limit",
        "per_user_usage_limit",
        "used_count",
        "first_order_only",
        "is_active",
        "is_currently_valid_display",
        "is_expired",
        "valid_from",
        "valid_until",
        "created_at",
    )

    list_filter = (
        "discount_type",
        "is_active",
        "first_order_only",
        "valid_from",
        "valid_until",
        "created_at",
    )

    search_fields = (
        "code",
        "name",
        "description",
    )

    readonly_fields = (
        "used_count",
        "is_currently_valid_display",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25
    date_hierarchy = "created_at"
    save_on_top = True

    inlines = (
        CouponUsageInline,
    )

    fieldsets = (
        (
            "Coupon Information",
            {
                "fields": (
                    "code",
                    "name",
                    "description",
                    "discount_type",
                    "discount_value",
                )
            },
        ),
        (
            "Order & Discount Limits",
            {
                "fields": (
                    "minimum_order_amount",
                    "maximum_discount_amount",
                    "total_usage_limit",
                    "per_user_usage_limit",
                    "first_order_only",
                    "used_count",
                )
            },
        ),
        (
            "Validity",
            {
                "fields": (
                    "valid_from",
                    "valid_until",
                    "is_active",
                    "is_currently_valid_display",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    actions = (
        "activate_coupon",
        "deactivate_coupon",
    )

    @admin.display(
        boolean=True,
        description="Currently Valid",
    )
    def is_currently_valid_display(self, obj):
        return obj.is_currently_valid

    @admin.display(
        boolean=True,
        description="Expired",
    )
    def is_expired(self, obj):
        return obj.valid_until < timezone.now()

    @admin.action(
        description="Activate selected coupons"
    )
    def activate_coupon(
        self,
        request,
        queryset,
    ):
        updated = queryset.update(
            is_active=True,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{updated} coupon(s) activated.",
        )

    @admin.action(
        description="Deactivate selected coupons"
    )
    def deactivate_coupon(
        self,
        request,
        queryset,
    ):
        updated = queryset.update(
            is_active=False,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{updated} coupon(s) deactivated.",
        )


# =========================================================
# Coupon Usage Admin
# =========================================================

@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = (
        "coupon",
        "user",
        "order",
        "discount_amount",
        "used_at",
    )

    list_filter = (
        "coupon",
        "used_at",
    )

    search_fields = (
        "coupon__code",
        "coupon__name",
        "user__email",
        "user__username",
        "order__order_number",
    )

    readonly_fields = (
        "coupon",
        "user",
        "order",
        "discount_amount",
        "used_at",
    )

    list_select_related = (
        "coupon",
        "user",
        "order",
    )

    ordering = (
        "-used_at",
    )

    list_per_page = 25
    date_hierarchy = "used_at"

    def has_add_permission(
        self,
        request,
    ):
        return False

    def has_change_permission(
        self,
        request,
        obj=None,
    ):
        return False
