from rest_framework import serializers

from products.serializers import ProductListSerializer

from .models import WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(
        read_only=True,
    )

    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=WishlistItem._meta.get_field(
            "product"
        ).remote_field.model.objects.filter(
            is_active=True
        ),
        write_only=True,
    )

    class Meta:
        model = WishlistItem
        fields = (
            "id",
            "product",
            "product_id",
            "created_at",
        )

        read_only_fields = (
            "id",
            "product",
            "created_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        product = attrs.get("product")

        if (
            request
            and request.user
            and request.user.is_authenticated
            and WishlistItem.objects.filter(
                user=request.user,
                product=product,
            ).exists()
        ):
            raise serializers.ValidationError(
                {
                    "product_id": (
                        "This product is already in your wishlist."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")

        return WishlistItem.objects.create(
            user=request.user,
            **validated_data,
        )