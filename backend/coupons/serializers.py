from decimal import Decimal

from rest_framework import serializers

from .models import Coupon, CouponUsage


class CouponSerializer(serializers.ModelSerializer):
    is_currently_valid = serializers.BooleanField(read_only=True)
    remaining_uses = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = (
            "id", "code", "name", "description", "discount_type",
            "discount_value", "minimum_order_amount",
            "maximum_discount_amount", "valid_from", "valid_until",
            "is_active", "total_usage_limit", "per_user_usage_limit",
            "first_order_only", "used_count", "remaining_uses",
            "is_currently_valid", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "used_count", "remaining_uses", "is_currently_valid",
            "created_at", "updated_at",
        )

    def get_remaining_uses(self, obj):
        if obj.total_usage_limit is None:
            return None
        return max(obj.total_usage_limit - obj.used_count, 0)

    def validate_code(self, value):
        code = str(value or "").strip().upper()
        if not code:
            raise serializers.ValidationError("Coupon code is required.")

        queryset = Coupon.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A coupon with this code already exists."
            )
        return code

    def validate_discount_value(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Discount value must be greater than zero."
            )
        return value

    def validate_minimum_order_amount(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Minimum order amount cannot be negative."
            )
        return value

    def validate_maximum_discount_amount(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Maximum discount amount cannot be negative."
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        discount_type = attrs.get(
            "discount_type", getattr(instance, "discount_type", "percentage")
        )
        discount_value = attrs.get(
            "discount_value", getattr(instance, "discount_value", None)
        )
        valid_from = attrs.get(
            "valid_from", getattr(instance, "valid_from", None)
        )
        valid_until = attrs.get(
            "valid_until", getattr(instance, "valid_until", None)
        )
        total_usage_limit = attrs.get(
            "total_usage_limit", getattr(instance, "total_usage_limit", None)
        )
        per_user_usage_limit = attrs.get(
            "per_user_usage_limit",
            getattr(instance, "per_user_usage_limit", 1),
        )
        maximum_discount_amount = attrs.get(
            "maximum_discount_amount",
            getattr(instance, "maximum_discount_amount", None),
        )

        if discount_value is None:
            raise serializers.ValidationError(
                {"discount_value": "Discount value is required."}
            )

        if discount_type == "percentage" and discount_value > Decimal("100.00"):
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot be greater than 100."}
            )

        if discount_type == "fixed" and maximum_discount_amount is not None:
            raise serializers.ValidationError(
                {
                    "maximum_discount_amount": (
                        "Maximum discount amount is only applicable "
                        "to percentage coupons."
                    )
                }
            )

        if valid_from and valid_until and valid_until <= valid_from:
            raise serializers.ValidationError(
                {"valid_until": "Valid-until date must be after valid-from date."}
            )

        if total_usage_limit is not None and total_usage_limit < 1:
            raise serializers.ValidationError(
                {"total_usage_limit": "Total usage limit must be at least 1."}
            )

        if per_user_usage_limit < 1:
            raise serializers.ValidationError(
                {"per_user_usage_limit": "Per-user usage limit must be at least 1."}
            )

        if total_usage_limit is not None and per_user_usage_limit > total_usage_limit:
            raise serializers.ValidationError(
                {
                    "per_user_usage_limit": (
                        "Per-user usage limit cannot be greater than "
                        "the total usage limit."
                    )
                }
            )

        return attrs


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, trim_whitespace=True)
    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    def validate_code(self, value):
        code = str(value or "").strip().upper()
        if not code:
            raise serializers.ValidationError("Coupon code is required.")
        return code

    def validate(self, attrs):
        request = self.context.get("request")
        code = attrs["code"]
        subtotal = attrs["subtotal"]

        coupon = Coupon.objects.filter(code__iexact=code).first()
        if coupon is None:
            raise serializers.ValidationError({"code": "Invalid coupon code."})

        user = None
        if request and request.user and request.user.is_authenticated:
            user = request.user

        validation_error = coupon.get_validation_error(
            subtotal=subtotal,
            user=user,
        )
        if validation_error:
            raise serializers.ValidationError({"code": validation_error})

        discount_amount = coupon.calculate_discount(subtotal)
        total_after_discount = (
            subtotal - discount_amount
        ).quantize(Decimal("0.01"))

        attrs["coupon_object"] = coupon
        attrs["discount_amount"] = discount_amount
        attrs["total_after_discount"] = max(
            total_after_discount,
            Decimal("0.00"),
        )
        return attrs

    def to_representation(self, instance):
        coupon = instance["coupon_object"]
        return {
            "message": "Coupon applied successfully.",
            "coupon": {
                "id": coupon.id,
                "code": coupon.code,
                "name": coupon.name,
                "description": coupon.description,
                "discount_type": coupon.discount_type,
                "discount_value": str(coupon.discount_value),
                "minimum_order_amount": str(coupon.minimum_order_amount),
                "maximum_discount_amount": (
                    str(coupon.maximum_discount_amount)
                    if coupon.maximum_discount_amount is not None
                    else None
                ),
                "first_order_only": coupon.first_order_only,
                "valid_until": coupon.valid_until,
            },
            "subtotal": str(instance["subtotal"]),
            "discount_amount": str(instance["discount_amount"]),
            "total_after_discount": str(instance["total_after_discount"]),
        }


class CouponUsageSerializer(serializers.ModelSerializer):
    coupon_code = serializers.CharField(
        source="coupon.code",
        read_only=True,
    )
    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True,
    )
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = CouponUsage
        fields = (
            "id", "coupon", "coupon_code", "user", "user_email",
            "order", "order_number", "discount_amount", "used_at",
        )
        read_only_fields = fields

    def get_user_email(self, obj):
        if not obj.user:
            return None
        return getattr(obj.user, "email", None)
