from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers

from coupons.models import Coupon, CouponUsage
from products.models import Product, ProductVariant

from inventory.models import (
    InventorySettings,
    InventoryTransaction,
    LowStockAlert,
)

from .models import (
    Order,
    OrderItem,
    Payment,
    ShippingAddress,
)


def sync_low_stock_alert(variant):
    """Keep LowStockAlert aligned with the variant's current stock."""
    settings_obj = InventorySettings.load()
    threshold = int(settings_obj.low_stock_threshold or 0)
    current_stock = max(0, int(variant.stock or 0))

    alert = LowStockAlert.objects.filter(variant=variant).first()

    if current_stock <= threshold:
        if alert is None:
            LowStockAlert.objects.create(
                variant=variant,
                current_stock=current_stock,
                threshold=threshold,
                is_active=True,
            )
        else:
            alert.current_stock = current_stock
            alert.threshold = threshold
            alert.is_active = True
            alert.resolved_at = None
            alert.save(
                update_fields=[
                    "current_stock",
                    "threshold",
                    "is_active",
                    "resolved_at",
                    "updated_at",
                ]
            )
    elif alert is not None:
        alert.current_stock = current_stock
        alert.threshold = threshold
        alert.is_active = False
        alert.resolved_at = timezone.now()
        alert.save(
            update_fields=[
                "current_stock",
                "threshold",
                "is_active",
                "resolved_at",
                "updated_at",
            ]
        )


# =========================================================
# Shipping Address
# =========================================================

class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = (
            "id",
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
            "address_type",
            "is_default",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def validate_phone(self, value):
        cleaned_phone = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_phone) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit phone number."
            )

        return cleaned_phone

    def validate_alternate_phone(self, value):
        if not value:
            return ""

        cleaned_phone = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_phone) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit alternate phone number."
            )

        return cleaned_phone

    def validate_postal_code(self, value):
        cleaned_postal_code = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_postal_code) != 6:
            raise serializers.ValidationError(
                "Please enter a valid 6-digit postal code."
            )

        return cleaned_postal_code


# =========================================================
# Order Item
# =========================================================

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
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

        read_only_fields = fields


# =========================================================
# Payment
# =========================================================

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id",
            "payment_method",
            "amount",
            "currency",
            "status",
            "transaction_id",
            "gateway_order_id",
            "gateway_payment_id",
            "gateway_signature",
            "failure_code",
            "failure_description",
            "failure_source",
            "failure_step",
            "failure_reason",
            "gateway_response",
            "paid_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = fields


# =========================================================
# Order List / Detail
# =========================================================

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True,
    )

    payment = PaymentSerializer(
        read_only=True,
    )

    total_items = serializers.IntegerField(
        read_only=True,
    )

    full_address = serializers.CharField(
        read_only=True,
    )

    class Meta:
        model = Order

        fields = (
            "id",
            "order_number",
            "user",
            "shipping_address",

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

            "subtotal",
            "discount_amount",
            "shipping_charge",
            "tax_amount",
            "total_amount",
            "coupon_code",

            "status",
            "payment_method",
            "payment_status",

            "customer_note",
            "admin_note",

            "courier_name",
            "tracking_id",
            "estimated_delivery",
            "shipped_at",



            "placed_at",
            "updated_at",
            "delivered_at",
            "cancelled_at",

            "total_items",
            "full_address",
            "items",
            "payment",
        )

        read_only_fields = fields


# =========================================================
# Checkout Request Item
# =========================================================

class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()

    variant_id = serializers.IntegerField()

    quantity = serializers.IntegerField(
        min_value=1,
    )

    def validate(self, attrs):
        product_id = attrs["product_id"]
        variant_id = attrs.get("variant_id")
        quantity = attrs["quantity"]

        product = Product.objects.filter(
            id=product_id,
            is_active=True,
        ).first()

        if product is None:
            raise serializers.ValidationError(
                {
                    "product_id": (
                        f"Active product with ID "
                        f"{product_id} was not found."
                    )
                }
            )

        variant = ProductVariant.objects.filter(
            id=variant_id,
            product=product,
            is_active=True,
        ).first()

        if variant is None:
            raise serializers.ValidationError(
                {
                    "variant_id": (
                        "The selected variant is invalid or inactive."
                    )
                }
            )

        if int(variant.stock or 0) < quantity:
            raise serializers.ValidationError(
                {
                    "quantity": (
                        f"Only {variant.stock} item(s) "
                        f"are available for {product.name}."
                    )
                }
            )

        attrs["product_object"] = product
        attrs["variant_object"] = variant

        return attrs


# =========================================================
# Checkout / Order Creation
# =========================================================

class CheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(
        max_length=150,
    )

    phone = serializers.CharField(
        max_length=15,
    )

    alternate_phone = serializers.CharField(
        max_length=15,
        required=False,
        allow_blank=True,
    )

    address_line_1 = serializers.CharField(
        max_length=255,
    )

    address_line_2 = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    landmark = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    city = serializers.CharField(
        max_length=100,
    )

    state = serializers.CharField(
        max_length=100,
    )

    postal_code = serializers.CharField(
        max_length=10,
    )

    country = serializers.CharField(
        max_length=100,
        default="India",
    )

    address_type = serializers.ChoiceField(
        choices=ShippingAddress.ADDRESS_TYPE_CHOICES,
        default="home",
    )

    saved_address_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )

    save_address = serializers.BooleanField(
        default=True,
    )

    is_default_address = serializers.BooleanField(
        default=False,
    )

    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        default="cod",
    )

    coupon_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    customer_note = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    send_updates = serializers.BooleanField(
        default=True,
        write_only=True,
    )

    items = CheckoutItemSerializer(
        many=True,
    )

    def validate_phone(self, value):
        cleaned_phone = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_phone) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit phone number."
            )

        return cleaned_phone

    def validate_alternate_phone(self, value):
        if not value:
            return ""

        cleaned_phone = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_phone) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit alternate phone number."
            )

        return cleaned_phone

    def validate_postal_code(self, value):
        cleaned_postal_code = "".join(
            character
            for character in str(value)
            if character.isdigit()
        )

        if len(cleaned_postal_code) != 6:
            raise serializers.ValidationError(
                "Please enter a valid 6-digit postal code."
            )

        return cleaned_postal_code

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one cart item is required."
            )

        return value

    def validate(self, attrs):
        request = self.context.get("request")
        saved_address_id = attrs.get("saved_address_id")

        if saved_address_id:
            if not (
                request
                and request.user
                and request.user.is_authenticated
            ):
                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "Please login before using a saved address."
                        )
                    }
                )

            address_exists = ShippingAddress.objects.filter(
                id=saved_address_id,
                user=request.user,
            ).exists()

            if not address_exists:
                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "The selected saved address was not found."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")

        user = None

        if (
            request
            and request.user
            and request.user.is_authenticated
        ):
            user = request.user

        items_data = validated_data.pop("items")

        # Merge duplicate variant rows before locking/checking stock.
        aggregated_items = {}
        for item_data in items_data:
            variant = item_data["variant_object"]
            key = variant.pk

            if key not in aggregated_items:
                aggregated_items[key] = {
                    "product_object": item_data["product_object"],
                    "variant_object": variant,
                    "quantity": 0,
                }

            aggregated_items[key]["quantity"] += int(
                item_data["quantity"]
            )

        items_data = list(aggregated_items.values())

        saved_address_id = validated_data.pop(
            "saved_address_id",
            None,
        )

        save_address = validated_data.pop(
            "save_address",
            True,
        )

        is_default_address = validated_data.pop(
            "is_default_address",
            False,
        )

        address_type = validated_data.pop(
            "address_type",
            "home",
        )

        validated_data.pop(
            "send_updates",
            True,
        )

        payment_method = validated_data.get(
            "payment_method",
            "cod",
        )

        shipping_address = None

        # Existing saved address selected
        if user and saved_address_id:
            shipping_address = (
                ShippingAddress.objects
                .select_for_update()
                .filter(
                    id=saved_address_id,
                    user=user,
                )
                .first()
            )

            if shipping_address is None:
                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "The selected saved address was not found."
                        )
                    }
                )

            validated_data["full_name"] = (
                shipping_address.full_name
            )

            validated_data["phone"] = (
                shipping_address.phone
            )

            validated_data["alternate_phone"] = (
                shipping_address.alternate_phone
            )

            validated_data["address_line_1"] = (
                shipping_address.address_line_1
            )

            validated_data["address_line_2"] = (
                shipping_address.address_line_2
            )

            validated_data["landmark"] = (
                shipping_address.landmark
            )

            validated_data["city"] = (
                shipping_address.city
            )

            validated_data["state"] = (
                shipping_address.state
            )

            validated_data["postal_code"] = (
                shipping_address.postal_code
            )

            validated_data["country"] = (
                shipping_address.country
            )

        # New address
        elif user and save_address:
            shipping_address = ShippingAddress.objects.create(
                user=user,
                full_name=validated_data["full_name"],
                phone=validated_data["phone"],
                alternate_phone=validated_data.get(
                    "alternate_phone",
                    "",
                ),
                address_line_1=validated_data[
                    "address_line_1"
                ],
                address_line_2=validated_data.get(
                    "address_line_2",
                    "",
                ),
                landmark=validated_data.get(
                    "landmark",
                    "",
                ),
                city=validated_data["city"],
                state=validated_data["state"],
                postal_code=validated_data[
                    "postal_code"
                ],
                country=validated_data.get(
                    "country",
                    "India",
                ),
                address_type=address_type,
                is_default=is_default_address,
            )

        subtotal = Decimal("0.00")
        prepared_items = []

        for item_data in items_data:
            product = item_data["product_object"]
            variant = item_data["variant_object"]
            quantity = item_data["quantity"]

            # Stock ko database level par lock karna
            if variant is not None:
                variant = (
                    ProductVariant.objects
                    .select_for_update()
                    .filter(
                        id=variant.id,
                        product=product,
                        is_active=True,
                    )
                    .first()
                )

                if variant is None:
                    raise serializers.ValidationError(
                        {
                            "items": (
                                f"A selected variant for "
                                f"{product.name} is no longer available."
                            )
                        }
                    )

                current_stock = int(
                    variant.stock or 0
                )

                if current_stock < quantity:
                    raise serializers.ValidationError(
                        {
                            "items": (
                                f"Only {current_stock} item(s) "
                                f"are available for {product.name}."
                            )
                        }
                    )

            # Existing project pricing preserved
            unit_price = Decimal(
                str(product.price)
            )

            item_total = (
                unit_price * quantity
            )

            subtotal += item_total

            prepared_items.append(
                {
                    "product": product,
                    "variant": variant,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": item_total,
                }
            )

        # =====================================================
        # Coupon Validation and Discount Calculation
        # =====================================================

        coupon = None

        coupon_code = str(
            validated_data.get(
                "coupon_code",
                "",
            )
            or ""
        ).strip().upper()

        discount_amount = Decimal("0.00")
        shipping_charge = Decimal("0.00")
        tax_amount = Decimal("0.00")

        if coupon_code:
            coupon = (
                Coupon.objects
                .select_for_update()
                .filter(
                    code__iexact=coupon_code,
                )
                .first()
            )

            if coupon is None:
                raise serializers.ValidationError(
                    {
                        "coupon_code": (
                            "Invalid coupon code."
                        )
                    }
                )

            coupon_error = coupon.get_validation_error(
                subtotal=subtotal,
                user=user,
            )

            if coupon_error:
                raise serializers.ValidationError(
                    {
                        "coupon_code": coupon_error,
                    }
                )

            discount_amount = coupon.calculate_discount(
                subtotal
            )

            coupon_code = coupon.code

        # Rs. 999 se kam subtotal par Rs. 99 delivery
        if subtotal < Decimal("999.00"):
            shipping_charge = Decimal("99.00")

        total_amount = (
            subtotal
            - discount_amount
            + shipping_charge
            + tax_amount
        ).quantize(
            Decimal("0.01")
        )

        if total_amount < Decimal("0.00"):
            total_amount = Decimal("0.00")

        order = Order.objects.create(
            user=user,
            shipping_address=shipping_address,

            full_name=validated_data["full_name"],
            phone=validated_data["phone"],
            alternate_phone=validated_data.get(
                "alternate_phone",
                "",
            ),
            address_line_1=validated_data[
                "address_line_1"
            ],
            address_line_2=validated_data.get(
                "address_line_2",
                "",
            ),
            landmark=validated_data.get(
                "landmark",
                "",
            ),
            city=validated_data["city"],
            state=validated_data["state"],
            postal_code=validated_data[
                "postal_code"
            ],
            country=validated_data.get(
                "country",
                "India",
            ),

            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_charge=shipping_charge,
            tax_amount=tax_amount,
            total_amount=total_amount,

            coupon_code=coupon_code,

            status="pending",
            payment_method=payment_method,
            payment_status="pending",

            customer_note=validated_data.get(
                "customer_note",
                "",
            ),
        )

        for prepared_item in prepared_items:
            product = prepared_item["product"]
            variant = prepared_item["variant"]
            quantity = prepared_item["quantity"]

            product_image = ""

            if getattr(product, "main_image", None):
                try:
                    product_image = (
                        product.main_image.url
                    )
                except (ValueError, AttributeError):
                    product_image = ""

            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                variant=variant,

                product_name=product.name,
                product_sku=getattr(product, "sku", "") or "",
                variant_sku=getattr(variant, "sku", "") or "",
                color=getattr(variant, "color", "") or "",
                size=getattr(variant, "size", "") or "",

                product_image=product_image,
                unit_price=prepared_item["unit_price"],
                quantity=quantity,
                total_price=prepared_item["total_price"],
            )

            stock_before = int(variant.stock or 0)
            stock_after = stock_before - quantity

            variant.stock = stock_after
            variant.save(update_fields=["stock"])

            InventoryTransaction.objects.create(
                variant=variant,
                product=product,
                order=order,
                order_item=order_item,
                transaction_type="sale",
                quantity_change=-quantity,
                stock_before=stock_before,
                reference=order.order_number,
                note="Stock deducted during checkout.",
                metadata={
                    "source": "checkout",
                    "payment_method": payment_method,
                },
                created_by=user,
            )

            sync_low_stock_alert(variant)

        payment_record_status = (
            "pending"
            if payment_method == "cod"
            else "created"
        )

        Payment.objects.create(
            order=order,
            payment_method=payment_method,
            amount=total_amount,
            currency="INR",
            status=payment_record_status,
        )

        # =====================================================
        # Coupon Usage Record
        # =====================================================

        if coupon is not None:
            CouponUsage.objects.create(
                coupon=coupon,
                user=user,
                order=order,
                discount_amount=discount_amount,
            )

            Coupon.objects.filter(
                pk=coupon.pk,
            ).update(
                used_count=F("used_count") + 1
            )

        return order

    def to_representation(self, instance):
        return OrderSerializer(
            instance,
            context=self.context,
        ).data

# =========================================================
# Admin Order Management
# =========================================================

class AdminOrderListSerializer(serializers.ModelSerializer):
    total_items = serializers.IntegerField(
        read_only=True,
    )

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "full_name",
            "phone",
            "customer_email",
            "city",
            "state",
            "status",
            "payment_method",
            "payment_status",
            "subtotal",
            "discount_amount",
            "shipping_charge",
            "tax_amount",
            "total_amount",
            "courier_name",
            "tracking_id",
            "estimated_delivery",
            "placed_at",
            "updated_at",
            "total_items",
        )

        read_only_fields = fields


class AdminOrderDetailSerializer(OrderSerializer):
    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True,
        allow_null=True,
    )

    customer_username = serializers.CharField(
        source="user.username",
        read_only=True,
        allow_null=True,
    )

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + (
            "customer_email",
            "customer_username",
        )

        read_only_fields = fields


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = (
            "status",
            "payment_status",
            "admin_note",
            "courier_name",
            "tracking_id",
            "estimated_delivery",
        )

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get(
            "status",
            instance.status if instance else None,
        )

        courier_name = attrs.get(
            "courier_name",
            instance.courier_name if instance else "",
        )

        tracking_id = attrs.get(
            "tracking_id",
            instance.tracking_id if instance else "",
        )

        if new_status in {
            "shipped",
            "out_for_delivery",
            "delivered",
        }:
            if not courier_name:
                raise serializers.ValidationError(
                    {
                        "courier_name": (
                            "Courier name is required before "
                            "marking an order as shipped."
                        )
                    }
                )

            if not tracking_id:
                raise serializers.ValidationError(
                    {
                        "tracking_id": (
                            "Tracking ID is required before "
                            "marking an order as shipped."
                        )
                    }
                )

        if (
            instance
            and instance.status == "cancelled"
            and new_status != "cancelled"
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "A cancelled order cannot be reopened."
                    )
                }
            )

        if (
            instance
            and instance.payment_status == "paid"
            and new_status == "cancelled"
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "A paid order cannot be cancelled until "
                        "the refund flow is completed."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        from django.utils import timezone

        previous_status = instance.status
        new_status = validated_data.get(
            "status",
            previous_status,
        )

        for field, value in validated_data.items():
            setattr(instance, field, value)

        now = timezone.now()

        if (
            new_status == "shipped"
            and previous_status != "shipped"
            and instance.shipped_at is None
        ):
            instance.shipped_at = now

        if (
            new_status == "delivered"
            and previous_status != "delivered"
        ):
            instance.delivered_at = now

        if (
            new_status == "cancelled"
            and previous_status != "cancelled"
        ):
            instance.cancelled_at = now

        if new_status != "delivered":
            instance.delivered_at = None

        if new_status != "cancelled":
            instance.cancelled_at = None

        update_fields = set(validated_data.keys())
        update_fields.add("updated_at")

        if instance.shipped_at is not None:
            update_fields.add("shipped_at")

        update_fields.add("delivered_at")
        update_fields.add("cancelled_at")

        instance.save(
            update_fields=list(update_fields),
        )

        return instance


class AdminOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = (
            "status",
        )

    def validate_status(self, value):
        instance = self.instance

        if (
            instance
            and instance.status == "cancelled"
            and value != "cancelled"
        ):
            raise serializers.ValidationError(
                "A cancelled order cannot be reopened."
            )

        if (
            instance
            and instance.payment_status == "paid"
            and value == "cancelled"
        ):
            raise serializers.ValidationError(
                "A paid order cannot be cancelled until the refund flow "
                "is completed."
            )

        if value in {
            "shipped",
            "out_for_delivery",
            "delivered",
        }:
            if not instance.courier_name:
                raise serializers.ValidationError(
                    "Add the courier name before updating this status."
                )

            if not instance.tracking_id:
                raise serializers.ValidationError(
                    "Add the tracking ID before updating this status."
                )

        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        from django.utils import timezone

        previous_status = instance.status
        new_status = validated_data["status"]
        now = timezone.now()

        instance.status = new_status

        update_fields = [
            "status",
            "updated_at",
        ]

        if (
            new_status == "shipped"
            and previous_status != "shipped"
            and instance.shipped_at is None
        ):
            instance.shipped_at = now
            update_fields.append("shipped_at")

        if new_status == "delivered":
            instance.delivered_at = now
            update_fields.append("delivered_at")
        elif instance.delivered_at is not None:
            instance.delivered_at = None
            update_fields.append("delivered_at")

        if new_status == "cancelled":
            instance.cancelled_at = now
            update_fields.append("cancelled_at")
        elif instance.cancelled_at is not None:
            instance.cancelled_at = None
            update_fields.append("cancelled_at")

        instance.save(
            update_fields=list(dict.fromkeys(update_fields)),
        )

        return instance

