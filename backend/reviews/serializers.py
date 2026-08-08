from django.db import IntegrityError, transaction
from rest_framework import serializers

from orders.models import OrderItem

from .models import Review, ReviewHelpful


def get_user_display_name(user):
    if user is None:
        return "Customer"

    full_name = ""
    if hasattr(user, "get_full_name"):
        full_name = str(user.get_full_name() or "").strip()

    username = str(getattr(user, "username", "") or "").strip()
    email = str(getattr(user, "email", "") or "").strip()

    return full_name or username or email or "Customer"


def validate_review_comment(value):
    cleaned_comment = str(value or "").strip()

    if len(cleaned_comment) < 10:
        raise serializers.ValidationError(
            "Review comment must be at least 10 characters."
        )

    return cleaned_comment


class ReviewHelpfulSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ReviewHelpful
        fields = (
            "id",
            "user",
            "user_name",
            "created_at",
        )
        read_only_fields = fields

    def get_user_name(self, obj):
        return get_user_display_name(obj.user)


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    helpful_votes = serializers.SerializerMethodField()
    is_helpful_by_user = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "product",
            "user",
            "user_name",
            "order_item",
            "rating",
            "title",
            "comment",
            "image",
            "image_url",
            "status",
            "is_verified_purchase",
            "helpful_count",
            "helpful_votes",
            "is_helpful_by_user",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "product",
            "user",
            "user_name",
            "order_item",
            "status",
            "is_verified_purchase",
            "helpful_count",
            "helpful_votes",
            "is_helpful_by_user",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj):
        return get_user_display_name(obj.user)

    def get_image_url(self, obj):
        image = getattr(obj, "image", None)

        if not image:
            return None

        try:
            image_url = image.url
        except (ValueError, AttributeError):
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(image_url)

        return image_url

    def get_helpful_votes(self, obj):
        prefetched_votes = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("helpful_votes")

        if prefetched_votes is not None:
            return len(prefetched_votes)

        return obj.helpful_votes.count()

    def get_is_helpful_by_user(self, obj):
        request = self.context.get("request")

        if (
            not request
            or not request.user
            or not request.user.is_authenticated
        ):
            return False

        prefetched_votes = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("helpful_votes")

        if prefetched_votes is not None:
            return any(
                vote.user_id == request.user.id
                for vote in prefetched_votes
            )

        return obj.helpful_votes.filter(user=request.user).exists()


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "product",
            "order_item",
            "rating",
            "title",
            "comment",
            "image",
        )

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate_title(self, value):
        return str(value or "").strip()

    def validate_comment(self, value):
        return validate_review_comment(value)

    def validate(self, attrs):
        request = self.context.get("request")

        if (
            request is None
            or not request.user
            or not request.user.is_authenticated
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Authentication is required to submit a review."
                    )
                }
            )

        user = request.user
        product = attrs["product"]
        order_item = attrs.get("order_item")

        if Review.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError(
                {
                    "detail": (
                        "You have already reviewed this product."
                    )
                }
            )

        is_verified_purchase = False

        if order_item:
            valid_order_item = (
                OrderItem.objects.filter(
                    id=order_item.id,
                    product=product,
                    order__user=user,
                    order__status="delivered",
                )
                .select_related("order", "product")
                .first()
            )

            if valid_order_item is None:
                raise serializers.ValidationError(
                    {
                        "order_item": (
                            "This order item is not a delivered purchase "
                            "for the selected product."
                        )
                    }
                )

            is_verified_purchase = True

        attrs["is_verified_purchase"] = is_verified_purchase
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        is_verified_purchase = validated_data.pop(
            "is_verified_purchase",
            False,
        )

        try:
            review = Review.objects.create(
                user=request.user,
                status="pending",
                is_verified_purchase=is_verified_purchase,
                **validated_data,
            )
        except IntegrityError as error:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "You have already reviewed this product."
                    )
                }
            ) from error

        return review


class ReviewUpdateSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Review
        fields = (
            "rating",
            "title",
            "comment",
            "image",
        )

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate_title(self, value):
        return str(value or "").strip()

    def validate_comment(self, value):
        return validate_review_comment(value)

    @transaction.atomic
    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.status = "pending"

        if hasattr(instance, "admin_note"):
            instance.admin_note = ""

        update_fields = list(validated_data.keys())
        update_fields.append("status")

        if hasattr(instance, "admin_note"):
            update_fields.append("admin_note")

        update_fields.append("updated_at")

        instance.save(
            update_fields=list(dict.fromkeys(update_fields))
        )

        return instance


class ReviewSummarySerializer(serializers.Serializer):
    average_rating = serializers.FloatField(
        min_value=0,
        max_value=5,
    )
    total_reviews = serializers.IntegerField(min_value=0)
    rating_breakdown = serializers.DictField(
        child=serializers.IntegerField(min_value=0)
    )

