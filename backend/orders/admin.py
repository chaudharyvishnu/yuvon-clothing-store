from django.contrib import admin
from django.utils import timezone

from .models import Order, OrderItem, Payment, ShippingAddress


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    show_change_link = True

    readonly_fields = (
        "product",
        "variant",
        "product_name",
        "product_sku",
        "variant_sku",
        "color",
        "size",
        "product_image",
        "unit_price",
        "quantity",
        "total_price",
        "created_at",
    )

    fields = (
        "product",
        "variant",
        "product_name",
        "product_sku",
        "variant_sku",
        "color",
        "size",
        "unit_price",
        "quantity",
        "total_price",
    )


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    can_delete = False
    classes = ("collapse",)

    readonly_fields = (
        "amount",
        "transaction_id",
        "gateway_order_id",
        "gateway_payment_id",
        "gateway_signature",
        "gateway_response",
        "paid_at",
        "created_at",
        "updated_at",
    )

    fields = (
        "payment_method",
        "status",
        "amount",
        "transaction_id",
        "gateway_order_id",
        "gateway_payment_id",
        "gateway_signature",
        "paid_at",
        "gateway_response",
        "created_at",
        "updated_at",
    )


@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "user",
        "phone",
        "city",
        "state",
        "postal_code",
        "address_type",
        "is_default",
        "created_at",
    )

    list_filter = (
        "address_type",
        "is_default",
        "state",
        "city",
        "created_at",
    )

    search_fields = (
        "full_name",
        "phone",
        "alternate_phone",
        "city",
        "state",
        "postal_code",
        "user__email",
        "user__username",
    )

    list_editable = (
        "is_default",
    )

    list_select_related = (
        "user",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25

    fieldsets = (
        (
            "Customer",
            {
                "fields": (
                    "user",
                    "full_name",
                    "phone",
                    "alternate_phone",
                )
            },
        ),
        (
            "Address",
            {
                "fields": (
                    "address_line_1",
                    "address_line_2",
                    "landmark",
                    "city",
                    "state",
                    "postal_code",
                    "country",
                    "address_type",
                    "is_default",
                )
            },
        ),
        (
            "Timestamps",
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


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "full_name",
        "user",
        "status",
        "payment_method",
        "payment_status",
        "total_amount",
        "total_items_display",
        "placed_at",
    )

    list_filter = (
        "status",
        "payment_method",
        "payment_status",
        "state",
        "city",
        "placed_at",
    )

    search_fields = (
        "order_number",
        "full_name",
        "phone",
        "postal_code",
        "city",
        "state",
        "user__email",
        "user__username",
    )

    readonly_fields = (
        "order_number",
        "total_items_display",
        "placed_at",
        "updated_at",
        "delivered_at",
        "cancelled_at",
    )

    list_select_related = (
        "user",
        "shipping_address",
    )

    inlines = (
        OrderItemInline,
        PaymentInline,
    )

    ordering = (
        "-placed_at",
    )

    date_hierarchy = "placed_at"
    list_per_page = 25
    save_on_top = True

    fieldsets = (
        (
            "Order Information",
            {
                "fields": (
                    "order_number",
                    "user",
                    "shipping_address",
                    "status",
                    "payment_method",
                    "payment_status",
                    "customer_note",
                    "admin_note",
                )
            },
        ),
        (
            "Shipping Address Snapshot",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "alternate_phone",
                    "address_line_1",
                    "address_line_2",
                    "landmark",
                    "city",
                    "state",
                    "postal_code",
                    "country",
                )
            },
        ),
        (
            "Order Amounts",
            {
                "fields": (
                    "subtotal",
                    "discount_amount",
                    "shipping_charge",
                    "tax_amount",
                    "total_amount",
                    "coupon_code",
                    "total_items_display",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "placed_at",
                    "updated_at",
                    "delivered_at",
                    "cancelled_at",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    actions = (
        "mark_as_confirmed",
        "mark_as_processing",
        "mark_as_packed",
        "mark_as_shipped",
        "mark_as_out_for_delivery",
        "mark_as_delivered",
        "mark_as_cancelled",
    )

    @admin.display(description="Total Items", ordering="total_items")
    def total_items_display(self, obj):
        return obj.total_items

    def _update_status(self, request, queryset, new_status, label):
        now = timezone.now()
        update_values = {
            "status": new_status,
            "updated_at": now,
        }

        if new_status == "delivered":
            update_values["delivered_at"] = now

        if new_status == "cancelled":
            update_values["cancelled_at"] = now

        updated = queryset.update(**update_values)

        self.message_user(
            request,
            f"{updated} order(s) marked as {label}.",
        )

    @admin.action(description="Mark selected orders as Confirmed")
    def mark_as_confirmed(self, request, queryset):
        self._update_status(request, queryset, "confirmed", "confirmed")

    @admin.action(description="Mark selected orders as Processing")
    def mark_as_processing(self, request, queryset):
        self._update_status(request, queryset, "processing", "processing")

    @admin.action(description="Mark selected orders as Packed")
    def mark_as_packed(self, request, queryset):
        self._update_status(request, queryset, "packed", "packed")

    @admin.action(description="Mark selected orders as Shipped")
    def mark_as_shipped(self, request, queryset):
        self._update_status(request, queryset, "shipped", "shipped")

    @admin.action(description="Mark selected orders as Out For Delivery")
    def mark_as_out_for_delivery(self, request, queryset):
        self._update_status(
            request,
            queryset,
            "out_for_delivery",
            "out for delivery",
        )

    @admin.action(description="Mark selected orders as Delivered")
    def mark_as_delivered(self, request, queryset):
        self._update_status(request, queryset, "delivered", "delivered")

    @admin.action(description="Mark selected unpaid orders as Cancelled")
    def mark_as_cancelled(self, request, queryset):
        cancellable_queryset = queryset.exclude(
            payment_status="paid",
        )

        skipped = queryset.filter(
            payment_status="paid",
        ).count()

        self._update_status(
            request,
            cancellable_queryset,
            "cancelled",
            "cancelled",
        )

        if skipped:
            self.message_user(
                request,
                (
                    f"{skipped} paid order(s) were skipped because "
                    "refund integration is not configured."
                ),
                level="warning",
            )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "product_name",
        "product_sku",
        "variant_sku",
        "color",
        "size",
        "quantity",
        "unit_price",
        "total_price",
        "created_at",
    )

    list_filter = (
        "color",
        "size",
        "created_at",
    )

    search_fields = (
        "order__order_number",
        "product_name",
        "product_sku",
        "variant_sku",
    )

    readonly_fields = (
        "total_price",
        "created_at",
    )

    autocomplete_fields = (
        "order",
        "product",
        "variant",
    )

    list_select_related = (
        "order",
        "product",
        "variant",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "payment_method",
        "status",
        "amount",
        "transaction_id",
        "gateway_payment_id",
        "paid_at",
        "created_at",
    )

    list_filter = (
        "payment_method",
        "status",
        "created_at",
        "paid_at",
    )

    search_fields = (
        "order__order_number",
        "transaction_id",
        "gateway_order_id",
        "gateway_payment_id",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "order",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25

    fieldsets = (
        (
            "Payment Information",
            {
                "fields": (
                    "order",
                    "payment_method",
                    "status",
                    "amount",
                    "transaction_id",
                )
            },
        ),
        (
            "Gateway Information",
            {
                "fields": (
                    "gateway_order_id",
                    "gateway_payment_id",
                    "gateway_signature",
                    "gateway_response",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "paid_at",
                    "created_at",
                    "updated_at",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )
