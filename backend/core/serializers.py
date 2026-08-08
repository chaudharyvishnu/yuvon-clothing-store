from rest_framework import serializers

from orders.models import Order, OrderItem


class TrackingOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "product_image",
            "color",
            "size",
            "quantity",
            "unit_price",
            "total_price",
        )

        read_only_fields = fields


class PublicOrderTrackingSerializer(serializers.ModelSerializer):
    items = TrackingOrderItemSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "order_number",
            "full_name",
            "city",
            "state",
            "postal_code",
            "subtotal",
            "discount_amount",
            "shipping_charge",
            "tax_amount",
            "total_amount",
            "status",
            "payment_method",
            "payment_status",
            "courier_name",
            "tracking_id",
            "estimated_delivery",
            "placed_at",
            "shipped_at",
            "delivered_at",
            "cancelled_at",
            "items",
        )

        read_only_fields = fields