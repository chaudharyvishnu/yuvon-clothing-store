from django.db.models import Prefetch

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem
from .serializers import PublicOrderTrackingSerializer


def clean_phone(value):
    return "".join(
        character
        for character in str(value or "")
        if character.isdigit()
    )


class HealthCheckView(APIView):
    permission_classes = [
        permissions.AllowAny,
    ]

    def get(self, request):
        return Response(
            {
                "status": "success",
                "message": "Yuvon backend is running.",
            },
            status=status.HTTP_200_OK,
        )


class TrackOrderView(APIView):
    permission_classes = [
        permissions.AllowAny,
    ]

    def _get_request_values(self, request):
        if request.method == "GET":
            order_number = request.query_params.get(
                "order_number",
                request.query_params.get("order", ""),
            )
            phone = request.query_params.get("phone", "")
        else:
            order_number = request.data.get(
                "order_number",
                request.data.get("order", ""),
            )
            phone = request.data.get("phone", "")

        return (
            str(order_number or "").strip(),
            clean_phone(phone),
        )

    def _track_order(self, request):
        order_number, phone = self._get_request_values(
            request
        )

        errors = {}

        if not order_number:
            errors["order_number"] = (
                "Order number is required."
            )

        if len(phone) != 10:
            errors["phone"] = (
                "Please enter a valid 10-digit phone number."
            )

        if errors:
            return Response(
                errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_items_queryset = (
            OrderItem.objects
            .select_related(
                "product",
                "variant",
            )
            .order_by("id")
        )

        order = (
            Order.objects
            .filter(
                order_number__iexact=order_number,
                phone=phone,
            )
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=order_items_queryset,
                )
            )
            .first()
        )

        if order is None:
            return Response(
                {
                    "detail": (
                        "No order was found with the provided "
                        "order number and phone number."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PublicOrderTrackingSerializer(
            order,
            context={"request": request},
        )

        status_order = [
            "pending",
            "confirmed",
            "processing",
            "packed",
            "shipped",
            "out_for_delivery",
            "delivered",
        ]

        current_index = (
            status_order.index(order.status)
            if order.status in status_order
            else -1
        )

        labels = {
            "pending": "Order Placed",
            "confirmed": "Confirmed",
            "processing": "Processing",
            "packed": "Packed",
            "shipped": "Shipped",
            "out_for_delivery": "Out for Delivery",
            "delivered": "Delivered",
        }

        tracking_steps = [
            {
                "status": step_status,
                "label": labels[step_status],
                "completed": (
                    current_index >= index
                    and order.status not in {
                        "cancelled",
                        "returned",
                        "refunded",
                    }
                ),
            }
            for index, step_status in enumerate(
                status_order
            )
        ]

        return Response(
            {
                "message": "Order found successfully.",
                "order": serializer.data,
                "tracking": {
                    "current_status": order.status,
                    "courier_name": order.courier_name,
                    "tracking_id": order.tracking_id,
                    "estimated_delivery": (
                        order.estimated_delivery
                    ),
                    "shipped_at": order.shipped_at,
                    "delivered_at": order.delivered_at,
                    "cancelled_at": order.cancelled_at,
                    "steps": tracking_steps,
                },
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        return self._track_order(request)

    def post(self, request):
        return self._track_order(request)
