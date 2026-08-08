from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Coupon, CouponUsage
from .serializers import (
    CouponApplySerializer,
    CouponSerializer,
    CouponUsageSerializer,
)


class IsAdminOrStaff(permissions.BasePermission):
    message = "Admin or staff access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_staff
                or user.is_superuser
            )
        )


class ActiveCouponListView(generics.ListAPIView):
    serializer_class = CouponSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        now = timezone.now()

        return (
            Coupon.objects.filter(
                is_active=True,
                valid_from__lte=now,
                valid_until__gte=now,
            )
            .filter(
                Q(total_usage_limit__isnull=True)
                | Q(used_count__lt=F("total_usage_limit"))
            )
            .order_by("-created_at")
        )


class CouponApplyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CouponApplySerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        return Response(
            {
                "message": "Coupon applied successfully.",
                **serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminCouponListCreateView(generics.ListCreateAPIView):
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        queryset = Coupon.objects.all()

        search = str(
            self.request.query_params.get("search", "") or ""
        ).strip()

        is_active = self.request.query_params.get("is_active")

        discount_type = str(
            self.request.query_params.get("discount_type", "") or ""
        ).strip()

        valid_now = str(
            self.request.query_params.get("valid_now", "") or ""
        ).strip().lower()

        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
            )

        if is_active is not None:
            normalized = str(is_active).strip().lower()

            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)

        if discount_type:
            queryset = queryset.filter(
                discount_type=discount_type
            )

        if valid_now in {"true", "1", "yes"}:
            now = timezone.now()
            queryset = (
                queryset.filter(
                    is_active=True,
                    valid_from__lte=now,
                    valid_until__gte=now,
                )
                .filter(
                    Q(total_usage_limit__isnull=True)
                    | Q(
                        used_count__lt=F(
                            "total_usage_limit"
                        )
                    )
                )
            )

        return queryset.order_by("-created_at")


class AdminCouponDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrStaff]
    lookup_field = "pk"

    def destroy(self, request, *args, **kwargs):
        coupon = self.get_object()

        if coupon.usages.exists():
            return Response(
                {
                    "detail": (
                        "This coupon has usage history and "
                        "cannot be deleted. Deactivate it instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_destroy(coupon)

        return Response(
            {"message": "Coupon deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AdminCouponToggleView(APIView):
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        coupon = get_object_or_404(
            Coupon.objects.select_for_update(),
            pk=pk,
        )

        coupon.is_active = not coupon.is_active
        coupon.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

        serializer = CouponSerializer(
            coupon,
            context={"request": request},
        )

        return Response(
            {
                "message": (
                    "Coupon activated successfully."
                    if coupon.is_active
                    else "Coupon deactivated successfully."
                ),
                "coupon": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminCouponUsageListView(generics.ListAPIView):
    serializer_class = CouponUsageSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        queryset = (
            CouponUsage.objects
            .select_related(
                "coupon",
                "user",
                "order",
            )
            .all()
        )

        coupon_code = str(
            self.request.query_params.get("coupon_code", "") or ""
        ).strip()

        user_email = str(
            self.request.query_params.get("user_email", "") or ""
        ).strip()

        order_number = str(
            self.request.query_params.get("order_number", "") or ""
        ).strip()

        if coupon_code:
            queryset = queryset.filter(
                coupon__code__icontains=coupon_code
            )

        if user_email:
            queryset = queryset.filter(
                user__email__icontains=user_email
            )

        if order_number:
            queryset = queryset.filter(
                order__order_number__icontains=order_number
            )

        return queryset.order_by("-used_at")
