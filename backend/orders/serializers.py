from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from rest_framework import serializers

from coupons.models import Coupon, CouponUsage

from products.models import (
    Product,
    ProductVariant,
)

from inventory.models import (
    InventorySettings,
    InventoryTransaction,
    LowStockAlert,
)

from .models import (
    Order,
    OrderItem,
    Payment,
    ReturnItem,
    ReturnRequest,
    ShippingAddress,
)


# =========================================================
# Common Helpers
# =========================================================

def normalize_phone_number(value):
    """
    Keep only numeric characters.
    """

    return "".join(
        character
        for character in str(
            value or ""
        )
        if character.isdigit()
    )


def normalize_postal_code(value):
    """
    Keep only numeric characters.
    """

    return "".join(
        character
        for character in str(
            value or ""
        )
        if character.isdigit()
    )


def to_decimal(
    value,
    default="0.00",
):
    """
    Safely convert a value to Decimal.
    """

    try:

        return Decimal(
            str(
                value
                if value is not None
                else default
            )
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):

        return Decimal(
            default
        )


# =========================================================
# Inventory Helpers
# =========================================================

def sync_low_stock_alert(
    variant,
):
    """
    Keep LowStockAlert aligned with the variant's
    current stock.
    """

    settings_obj = (
        InventorySettings.load()
    )

    threshold = int(
        settings_obj.low_stock_threshold
        or 0
    )

    current_stock = max(
        0,
        int(
            variant.stock
            or 0
        ),
    )

    alert = (
        LowStockAlert.objects
        .filter(
            variant=variant,
        )
        .first()
    )

    # =====================================================
    # Low Stock
    # =====================================================

    if current_stock <= threshold:

        if alert is None:

            LowStockAlert.objects.create(
                variant=variant,
                current_stock=current_stock,
                threshold=threshold,
                is_active=True,
            )

        else:

            alert.current_stock = (
                current_stock
            )

            alert.threshold = (
                threshold
            )

            alert.is_active = (
                True
            )

            alert.resolved_at = (
                None
            )

            alert.save(
                update_fields=[
                    "current_stock",
                    "threshold",
                    "is_active",
                    "resolved_at",
                    "updated_at",
                ]
            )

    # =====================================================
    # Stock Recovered
    # =====================================================

    elif alert is not None:

        alert.current_stock = (
            current_stock
        )

        alert.threshold = (
            threshold
        )

        alert.is_active = (
            False
        )

        alert.resolved_at = (
            timezone.now()
        )

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

class ShippingAddressSerializer(
    serializers.ModelSerializer
):

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

    # =====================================================
    # Phone
    # =====================================================

    def validate_phone(
        self,
        value,
    ):

        cleaned_phone = (
            normalize_phone_number(
                value
            )
        )

        if (
            len(
                cleaned_phone
            )
            != 10
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "10-digit phone number."
            )

        return cleaned_phone

    # =====================================================
    # Alternate Phone
    # =====================================================

    def validate_alternate_phone(
        self,
        value,
    ):

        if not value:

            return ""

        cleaned_phone = (
            normalize_phone_number(
                value
            )
        )

        if (
            len(
                cleaned_phone
            )
            != 10
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "10-digit alternate phone number."
            )

        return cleaned_phone

    # =====================================================
    # Postal Code
    # =====================================================

    def validate_postal_code(
        self,
        value,
    ):

        cleaned_postal_code = (
            normalize_postal_code(
                value
            )
        )

        if (
            len(
                cleaned_postal_code
            )
            != 6
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "6-digit postal code."
            )

        return cleaned_postal_code

    # =====================================================
    # Default Address
    # =====================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        request = self.context.get(
            "request"
        )

        user = getattr(
            request,
            "user",
            None,
        )

        is_default = (
            validated_data.get(
                "is_default",
                False,
            )
        )

        if (
            user
            and user.is_authenticated
            and is_default
        ):

            ShippingAddress.objects.filter(
                user=user,
                is_default=True,
            ).update(
                is_default=False
            )

        return super().create(
            validated_data
        )

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        is_default = (
            validated_data.get(
                "is_default",
                instance.is_default,
            )
        )

        if is_default:

            ShippingAddress.objects.filter(
                user=instance.user,
                is_default=True,
            ).exclude(
                pk=instance.pk,
            ).update(
                is_default=False
            )

        return super().update(
            instance,
            validated_data,
        )


# =========================================================
# Order Item
# =========================================================

class OrderItemSerializer(
    serializers.ModelSerializer
):

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

        read_only_fields = (
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


# =========================================================
# Payment
# =========================================================

class PaymentSerializer(
    serializers.ModelSerializer
):

    is_successful = serializers.BooleanField(
        read_only=True,
    )

    is_refunded = serializers.BooleanField(
        read_only=True,
    )

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

            # Refund
            "refunded_amount",
            "refund_id",
            "refunded_at",

            # Payment Failure
            "failure_code",
            "failure_description",
            "failure_source",
            "failure_step",
            "failure_reason",

            # Gateway
            "gateway_response",
            "refund_response",

            # Timeline
            "paid_at",
            "created_at",
            "updated_at",

            # Helpers
            "is_successful",
            "is_refunded",
        )

        read_only_fields = fields


# =========================================================
# Order List / Detail
# =========================================================

class OrderSerializer(
    serializers.ModelSerializer
):

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

    is_paid = serializers.BooleanField(
        read_only=True,
    )

    is_cancellable = serializers.BooleanField(
        read_only=True,
    )

    has_shipment = serializers.BooleanField(
        read_only=True,
    )

    can_track = serializers.BooleanField(
        read_only=True,
    )

    is_delivered = serializers.BooleanField(
        read_only=True,
    )

    is_cancelled = serializers.BooleanField(
        read_only=True,
    )

    class Meta:

        model = Order

        fields = (
            "id",
            "order_number",
            "user",
            "shipping_address",

            # Address Snapshot
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

            # Amounts
            "subtotal",
            "discount_amount",
            "shipping_charge",
            "tax_amount",
            "total_amount",
            "coupon_code",

            # Order / Payment
            "status",
            "payment_method",
            "payment_status",

            # Notes
            "customer_note",
            "admin_note",

            # Shipping / Courier
            "courier_name",
            "courier_service",
            "tracking_id",
            "awb_code",
            "shipment_id",
            "shipping_order_id",
            "shipping_status",
            "tracking_url",
            "shipping_label_url",
            "manifest_url",
            "pickup_token",
            "pickup_scheduled",
            "pickup_scheduled_at",
            "estimated_delivery",

            # Shipping Responses
            "shipping_response",
            "tracking_response",

            # Timeline
            "placed_at",
            "updated_at",
            "shipped_at",
            "out_for_delivery_at",
            "delivered_at",
            "cancelled_at",

            # Helpers
            "total_items",
            "full_address",
            "is_paid",
            "is_cancellable",
            "has_shipment",
            "can_track",
            "is_delivered",
            "is_cancelled",

            # Nested
            "items",
            "payment",
        )

        read_only_fields = fields


# =========================================================
# Checkout Request Item
# =========================================================

class CheckoutItemSerializer(
    serializers.Serializer
):

    product_id = (
        serializers.IntegerField()
    )

    variant_id = (
        serializers.IntegerField()
    )

    quantity = (
        serializers.IntegerField(
            min_value=1,
        )
    )

    def validate(
        self,
        attrs,
    ):

        product_id = (
            attrs[
                "product_id"
            ]
        )

        variant_id = (
            attrs[
                "variant_id"
            ]
        )

        quantity = int(
            attrs[
                "quantity"
            ]
        )

        # =================================================
        # Product
        # =================================================

        product = (
            Product.objects
            .filter(
                id=product_id,
                is_active=True,
            )
            .first()
        )

        if product is None:

            raise serializers.ValidationError(
                {
                    "product_id": (
                        f"Active product with ID "
                        f"{product_id} was not found."
                    )
                }
            )

        # =================================================
        # Variant
        # =================================================

        variant = (
            ProductVariant.objects
            .filter(
                id=variant_id,
                product=product,
                is_active=True,
            )
            .first()
        )

        if variant is None:

            raise serializers.ValidationError(
                {
                    "variant_id": (
                        "The selected variant is "
                        "invalid or inactive."
                    )
                }
            )

        # =================================================
        # Stock
        # =================================================

        current_stock = int(
            variant.stock
            or 0
        )

        if current_stock < quantity:

            raise serializers.ValidationError(
                {
                    "quantity": (
                        f"Only {current_stock} "
                        f"item(s) are available "
                        f"for {product.name}."
                    )
                }
            )

        attrs[
            "product_object"
        ] = product

        attrs[
            "variant_object"
        ] = variant

        return attrs


# =========================================================
# Checkout / Order Creation
# =========================================================

class CheckoutSerializer(
    serializers.Serializer
):

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
        choices=(
            ShippingAddress
            .ADDRESS_TYPE_CHOICES
        ),
        default="home",
    )

    saved_address_id = (
        serializers.IntegerField(
            required=False,
            allow_null=True,
        )
    )

    save_address = (
        serializers.BooleanField(
            default=True,
        )
    )

    is_default_address = (
        serializers.BooleanField(
            default=False,
        )
    )

    payment_method = (
        serializers.ChoiceField(
            choices=(
                Order
                .PAYMENT_METHOD_CHOICES
            ),
            default="cod",
        )
    )

    coupon_code = (
        serializers.CharField(
            max_length=50,
            required=False,
            allow_blank=True,
        )
    )

    customer_note = (
        serializers.CharField(
            required=False,
            allow_blank=True,
        )
    )

    send_updates = (
        serializers.BooleanField(
            default=True,
            write_only=True,
        )
    )

    items = CheckoutItemSerializer(
        many=True,
    )

    # =====================================================
    # Validation
    # =====================================================

    def validate_phone(
        self,
        value,
    ):

        cleaned_phone = (
            normalize_phone_number(
                value
            )
        )

        if (
            len(
                cleaned_phone
            )
            != 10
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "10-digit phone number."
            )

        return cleaned_phone

    def validate_alternate_phone(
        self,
        value,
    ):

        if not value:

            return ""

        cleaned_phone = (
            normalize_phone_number(
                value
            )
        )

        if (
            len(
                cleaned_phone
            )
            != 10
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "10-digit alternate phone number."
            )

        return cleaned_phone

    def validate_postal_code(
        self,
        value,
    ):

        cleaned_postal_code = (
            normalize_postal_code(
                value
            )
        )

        if (
            len(
                cleaned_postal_code
            )
            != 6
        ):

            raise serializers.ValidationError(
                "Please enter a valid "
                "6-digit postal code."
            )

        return cleaned_postal_code

    def validate_coupon_code(
        self,
        value,
    ):

        return str(
            value
            or ""
        ).strip().upper()

    def validate_items(
        self,
        value,
    ):

        if not value:

            raise serializers.ValidationError(
                "At least one cart item "
                "is required."
            )

        return value

    def validate(
        self,
        attrs,
    ):

        request = (
            self.context.get(
                "request"
            )
        )

        saved_address_id = (
            attrs.get(
                "saved_address_id"
            )
        )

        # =================================================
        # Saved Address
        # =================================================

        if saved_address_id:

            if not (
                request
                and request.user
                and request.user.is_authenticated
            ):

                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "Please login before using "
                            "a saved address."
                        )
                    }
                )

            address_exists = (
                ShippingAddress.objects
                .filter(
                    id=saved_address_id,
                    user=request.user,
                )
                .exists()
            )

            if not address_exists:

                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "The selected saved address "
                            "was not found."
                        )
                    }
                )

        return attrs

    # =====================================================
    # Create Order
    # =====================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        request = (
            self.context.get(
                "request"
            )
        )

        user = None

        if (
            request
            and request.user
            and request.user.is_authenticated
        ):

            user = (
                request.user
            )

        items_data = (
            validated_data.pop(
                "items"
            )
        )

        # =================================================
        # Merge Duplicate Variant Rows
        # =================================================

        aggregated_items = {}

        for item_data in items_data:

            variant = (
                item_data[
                    "variant_object"
                ]
            )

            key = (
                variant.pk
            )

            if (
                key
                not in aggregated_items
            ):

                aggregated_items[
                    key
                ] = {
                    "product_object":
                        item_data[
                            "product_object"
                        ],

                    "variant_object":
                        variant,

                    "quantity":
                        0,
                }

            aggregated_items[
                key
            ][
                "quantity"
            ] += int(
                item_data[
                    "quantity"
                ]
            )

        items_data = list(
            aggregated_items.values()
        )

        # =================================================
        # Extra Fields
        # =================================================

        saved_address_id = (
            validated_data.pop(
                "saved_address_id",
                None,
            )
        )

        save_address = (
            validated_data.pop(
                "save_address",
                True,
            )
        )

        is_default_address = (
            validated_data.pop(
                "is_default_address",
                False,
            )
        )

        address_type = (
            validated_data.pop(
                "address_type",
                "home",
            )
        )

        validated_data.pop(
            "send_updates",
            True,
        )

        payment_method = (
            validated_data.get(
                "payment_method",
                "cod",
            )
        )

        shipping_address = (
            None
        )

        # =================================================
        # Existing Saved Address
        # =================================================

        if (
            user
            and saved_address_id
        ):

            shipping_address = (
                ShippingAddress.objects
                .select_for_update()
                .filter(
                    id=saved_address_id,
                    user=user,
                )
                .first()
            )

            if (
                shipping_address
                is None
            ):

                raise serializers.ValidationError(
                    {
                        "saved_address_id": (
                            "The selected saved address "
                            "was not found."
                        )
                    }
                )

            validated_data[
                "full_name"
            ] = (
                shipping_address
                .full_name
            )

            validated_data[
                "phone"
            ] = (
                shipping_address
                .phone
            )

            validated_data[
                "alternate_phone"
            ] = (
                shipping_address
                .alternate_phone
            )

            validated_data[
                "address_line_1"
            ] = (
                shipping_address
                .address_line_1
            )

            validated_data[
                "address_line_2"
            ] = (
                shipping_address
                .address_line_2
            )

            validated_data[
                "landmark"
            ] = (
                shipping_address
                .landmark
            )

            validated_data[
                "city"
            ] = (
                shipping_address
                .city
            )

            validated_data[
                "state"
            ] = (
                shipping_address
                .state
            )

            validated_data[
                "postal_code"
            ] = (
                shipping_address
                .postal_code
            )

            validated_data[
                "country"
            ] = (
                shipping_address
                .country
            )

        # =================================================
        # Save New Address
        # =================================================

        elif (
            user
            and save_address
        ):

            if (
                is_default_address
            ):

                ShippingAddress.objects.filter(
                    user=user,
                    is_default=True,
                ).update(
                    is_default=False
                )

            shipping_address = (
                ShippingAddress.objects
                .create(
                    user=user,

                    full_name=(
                        validated_data[
                            "full_name"
                        ]
                    ),

                    phone=(
                        validated_data[
                            "phone"
                        ]
                    ),

                    alternate_phone=(
                        validated_data.get(
                            "alternate_phone",
                            "",
                        )
                    ),

                    address_line_1=(
                        validated_data[
                            "address_line_1"
                        ]
                    ),

                    address_line_2=(
                        validated_data.get(
                            "address_line_2",
                            "",
                        )
                    ),

                    landmark=(
                        validated_data.get(
                            "landmark",
                            "",
                        )
                    ),

                    city=(
                        validated_data[
                            "city"
                        ]
                    ),

                    state=(
                        validated_data[
                            "state"
                        ]
                    ),

                    postal_code=(
                        validated_data[
                            "postal_code"
                        ]
                    ),

                    country=(
                        validated_data.get(
                            "country",
                            "India",
                        )
                    ),

                    address_type=(
                        address_type
                    ),

                    is_default=(
                        is_default_address
                    ),
                )
            )

        # =================================================
        # Prepare Items / Lock Inventory
        # =================================================

        subtotal = Decimal(
            "0.00"
        )

        prepared_items = []

        for item_data in items_data:

            product = (
                item_data[
                    "product_object"
                ]
            )

            quantity = int(
                item_data[
                    "quantity"
                ]
            )

            variant_object = (
                item_data[
                    "variant_object"
                ]
            )

            # Lock current DB row.
            variant = (
                ProductVariant.objects
                .select_for_update()
                .filter(
                    id=variant_object.id,
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
                            f"{product.name} is no "
                            f"longer available."
                        )
                    }
                )

            current_stock = int(
                variant.stock
                or 0
            )

            if (
                current_stock
                < quantity
            ):

                raise serializers.ValidationError(
                    {
                        "items": (
                            f"Only {current_stock} "
                            f"item(s) are available "
                            f"for {product.name}."
                        )
                    }
                )

            # =================================================
            # Existing Product Pricing Preserved
            # =================================================

            unit_price = (
                to_decimal(
                    product.price
                )
                .quantize(
                    Decimal(
                        "0.01"
                    )
                )
            )

            item_total = (
                unit_price
                * Decimal(
                    quantity
                )
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            subtotal += (
                item_total
            )

            prepared_items.append(
                {
                    "product":
                        product,

                    "variant":
                        variant,

                    "quantity":
                        quantity,

                    "unit_price":
                        unit_price,

                    "total_price":
                        item_total,
                }
            )

        subtotal = subtotal.quantize(
            Decimal(
                "0.01"
            )
        )

        # =================================================
        # Coupon
        # =================================================

        coupon = None

        coupon_code = str(
            validated_data.get(
                "coupon_code",
                "",
            )
            or ""
        ).strip().upper()

        discount_amount = Decimal(
            "0.00"
        )

        shipping_charge = Decimal(
            "0.00"
        )

        tax_amount = Decimal(
            "0.00"
        )

        if coupon_code:

            coupon = (
                Coupon.objects
                .select_for_update()
                .filter(
                    code__iexact=(
                        coupon_code
                    ),
                )
                .first()
            )

            if coupon is None:

                raise serializers.ValidationError(
                    {
                        "coupon_code":
                            "Invalid coupon code."
                    }
                )

            coupon_error = (
                coupon
                .get_validation_error(
                    subtotal=subtotal,
                    user=user,
                )
            )

            if coupon_error:

                raise serializers.ValidationError(
                    {
                        "coupon_code":
                            coupon_error,
                    }
                )

            discount_amount = (
                to_decimal(
                    coupon.calculate_discount(
                        subtotal
                    )
                )
                .quantize(
                    Decimal(
                        "0.01"
                    )
                )
            )

            # Never allow discount above subtotal.
            discount_amount = min(
                discount_amount,
                subtotal,
            )

            coupon_code = (
                coupon.code
            )

        # =================================================
        # Shipping Charge
        # =================================================
        #
        # Existing business rule:
        #
        # Below Rs.999 = Rs.99
        # Rs.999 or above = Free
        #
        # =================================================

        if (
            subtotal
            < Decimal(
                "999.00"
            )
        ):

            shipping_charge = (
                Decimal(
                    "99.00"
                )
            )

        # =================================================
        # Final Total
        # =================================================

        total_amount = (
            subtotal
            - discount_amount
            + shipping_charge
            + tax_amount
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            total_amount
            < Decimal(
                "0.00"
            )
        ):

            total_amount = (
                Decimal(
                    "0.00"
                )
            )

        # =================================================
        # Create Order
        # =================================================

        order = (
            Order.objects.create(
                user=user,

                shipping_address=(
                    shipping_address
                ),

                full_name=(
                    validated_data[
                        "full_name"
                    ]
                ),

                phone=(
                    validated_data[
                        "phone"
                    ]
                ),

                alternate_phone=(
                    validated_data.get(
                        "alternate_phone",
                        "",
                    )
                ),

                address_line_1=(
                    validated_data[
                        "address_line_1"
                    ]
                ),

                address_line_2=(
                    validated_data.get(
                        "address_line_2",
                        "",
                    )
                ),

                landmark=(
                    validated_data.get(
                        "landmark",
                        "",
                    )
                ),

                city=(
                    validated_data[
                        "city"
                    ]
                ),

                state=(
                    validated_data[
                        "state"
                    ]
                ),

                postal_code=(
                    validated_data[
                        "postal_code"
                    ]
                ),

                country=(
                    validated_data.get(
                        "country",
                        "India",
                    )
                ),

                subtotal=(
                    subtotal
                ),

                discount_amount=(
                    discount_amount
                ),

                shipping_charge=(
                    shipping_charge
                ),

                tax_amount=(
                    tax_amount
                ),

                total_amount=(
                    total_amount
                ),

                coupon_code=(
                    coupon_code
                ),

                status=(
                    "pending"
                ),

                payment_method=(
                    payment_method
                ),

                payment_status=(
                    "pending"
                ),

                customer_note=(
                    validated_data.get(
                        "customer_note",
                        "",
                    )
                ),

                shipping_status="",
            )
        )

        # =================================================
        # Create Items / Deduct Inventory
        # =================================================

        for prepared_item in prepared_items:

            product = (
                prepared_item[
                    "product"
                ]
            )

            variant = (
                prepared_item[
                    "variant"
                ]
            )

            quantity = (
                prepared_item[
                    "quantity"
                ]
            )

            # =================================================
            # Product Image Snapshot
            # =================================================

            product_image = ""

            if getattr(
                product,
                "main_image",
                None,
            ):

                try:

                    product_image = (
                        product
                        .main_image
                        .url
                    )

                except (
                    ValueError,
                    AttributeError,
                ):

                    product_image = ""

            # =================================================
            # Order Item
            # =================================================

            order_item = (
                OrderItem.objects
                .create(
                    order=order,

                    product=product,

                    variant=variant,

                    product_name=(
                        product.name
                    ),

                    product_sku=(
                        getattr(
                            product,
                            "sku",
                            "",
                        )
                        or ""
                    ),

                    variant_sku=(
                        getattr(
                            variant,
                            "sku",
                            "",
                        )
                        or ""
                    ),

                    color=(
                        getattr(
                            variant,
                            "color",
                            "",
                        )
                        or ""
                    ),

                    size=(
                        getattr(
                            variant,
                            "size",
                            "",
                        )
                        or ""
                    ),

                    product_image=(
                        product_image
                    ),

                    unit_price=(
                        prepared_item[
                            "unit_price"
                        ]
                    ),

                    quantity=(
                        quantity
                    ),

                    total_price=(
                        prepared_item[
                            "total_price"
                        ]
                    ),
                )
            )

            # =================================================
            # Stock
            # =================================================

            stock_before = int(
                variant.stock
                or 0
            )

            stock_after = (
                stock_before
                - quantity
            )

            if stock_after < 0:

                raise serializers.ValidationError(
                    {
                        "items": (
                            f"Insufficient stock "
                            f"for {product.name}."
                        )
                    }
                )

            variant.stock = (
                stock_after
            )

            variant.save(
                update_fields=[
                    "stock",
                ]
            )

            # =================================================
            # Inventory Transaction
            # =================================================

            InventoryTransaction.objects.create(
                variant=variant,
                product=product,
                order=order,
                order_item=order_item,

                transaction_type=(
                    "sale"
                ),

                quantity_change=(
                    -quantity
                ),

                stock_before=(
                    stock_before
                ),

                reference=(
                    order.order_number
                ),

                note=(
                    "Stock deducted "
                    "during checkout."
                ),

                metadata={
                    "source":
                        "checkout",

                    "payment_method":
                        payment_method,
                },

                created_by=user,
            )

            sync_low_stock_alert(
                variant
            )

        # =================================================
        # Payment Record
        # =================================================

        payment_record_status = (
            "pending"
            if payment_method
            == "cod"
            else "created"
        )

        Payment.objects.create(
            order=order,
            payment_method=(
                payment_method
            ),
            amount=(
                total_amount
            ),
            currency=(
                "INR"
            ),
            status=(
                payment_record_status
            ),
        )

        # =================================================
        # Coupon Usage
        # =================================================

        if coupon is not None:

            CouponUsage.objects.create(
                coupon=coupon,
                user=user,
                order=order,
                discount_amount=(
                    discount_amount
                ),
            )

            Coupon.objects.filter(
                pk=coupon.pk,
            ).update(
                used_count=(
                    F(
                        "used_count"
                    )
                    + 1
                )
            )

            # Keep in-memory object aligned.
            coupon.refresh_from_db(
                fields=[
                    "used_count",
                ]
            )

        return order

    # =====================================================
    # Checkout Response
    # =====================================================

    def to_representation(
        self,
        instance,
    ):

        return OrderSerializer(
            instance,
            context=self.context,
        ).data


# =========================================================
# Admin Order Management
# =========================================================

class AdminOrderListSerializer(
    serializers.ModelSerializer
):

    total_items = (
        serializers.IntegerField(
            read_only=True,
        )
    )

    customer_email = (
        serializers.EmailField(
            source="user.email",
            read_only=True,
            allow_null=True,
        )
    )

    has_shipment = (
        serializers.BooleanField(
            read_only=True,
        )
    )

    can_track = (
        serializers.BooleanField(
            read_only=True,
        )
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
            "courier_service",
            "tracking_id",
            "awb_code",
            "shipment_id",
            "shipping_order_id",
            "shipping_status",
            "tracking_url",
            "pickup_scheduled",
            "estimated_delivery",

            "placed_at",
            "updated_at",
            "shipped_at",
            "out_for_delivery_at",
            "delivered_at",

            "total_items",
            "has_shipment",
            "can_track",
        )

        read_only_fields = fields


# =========================================================
# Admin Order Detail
# =========================================================

class AdminOrderDetailSerializer(
    OrderSerializer
):

    customer_email = (
        serializers.EmailField(
            source="user.email",
            read_only=True,
            allow_null=True,
        )
    )

    customer_username = (
        serializers.CharField(
            source="user.username",
            read_only=True,
            allow_null=True,
        )
    )

    class Meta(
        OrderSerializer.Meta
    ):

        fields = (
            OrderSerializer
            .Meta
            .fields
            + (
                "customer_email",
                "customer_username",
            )
        )

        read_only_fields = (
            fields
        )


# =========================================================
# Admin Full Order Update
# =========================================================

class AdminOrderUpdateSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Order

        fields = (
            "status",
            "payment_status",
            "admin_note",

            "courier_name",
            "courier_service",

            "tracking_id",
            "awb_code",

            "shipment_id",
            "shipping_order_id",

            "shipping_status",

            "tracking_url",
            "shipping_label_url",
            "manifest_url",

            "pickup_token",
            "pickup_scheduled",
            "pickup_scheduled_at",

            "estimated_delivery",
        )

    # =====================================================
    # Validation
    # =====================================================

    def validate(
        self,
        attrs,
    ):

        instance = (
            self.instance
        )

        new_status = (
            attrs.get(
                "status",
                (
                    instance.status
                    if instance
                    else None
                ),
            )
        )

        courier_name = (
            attrs.get(
                "courier_name",
                (
                    instance.courier_name
                    if instance
                    else ""
                ),
            )
        )

        tracking_id = (
            attrs.get(
                "tracking_id",
                (
                    instance.tracking_id
                    if instance
                    else ""
                ),
            )
        )

        awb_code = (
            attrs.get(
                "awb_code",
                (
                    instance.awb_code
                    if instance
                    else ""
                ),
            )
        )

        # =================================================
        # Shipping Validation
        # =================================================

        if new_status in {
            "shipped",
            "in_transit",
            "out_for_delivery",
            "delivered",
        }:

            if not courier_name:

                raise serializers.ValidationError(
                    {
                        "courier_name": (
                            "Courier name is required "
                            "before marking an order "
                            "as shipped."
                        )
                    }
                )

            if not (
                tracking_id
                or awb_code
            ):

                raise serializers.ValidationError(
                    {
                        "tracking_id": (
                            "Tracking ID or AWB code "
                            "is required before marking "
                            "an order as shipped."
                        )
                    }
                )

        # =================================================
        # Cancelled Order Protection
        # =================================================

        if (
            instance
            and instance.status
            == "cancelled"
            and new_status
            != "cancelled"
        ):

            raise serializers.ValidationError(
                {
                    "status": (
                        "A cancelled order "
                        "cannot be reopened."
                    )
                }
            )

        # =================================================
        # Delivered Order Protection
        # =================================================

        if (
            instance
            and instance.status
            == "delivered"
            and new_status
            == "cancelled"
        ):

            raise serializers.ValidationError(
                {
                    "status": (
                        "A delivered order cannot "
                        "be directly cancelled. "
                        "Use the return/refund flow."
                    )
                }
            )

        # =================================================
        # Paid Order Cancellation
        # =================================================

        if (
            instance
            and instance.payment_status
            == "paid"
            and new_status
            == "cancelled"
        ):

            raise serializers.ValidationError(
                {
                    "status": (
                        "A paid order cannot be "
                        "cancelled until the refund "
                        "flow is completed."
                    )
                }
            )

        return attrs

    # =====================================================
    # Update
    # =====================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        previous_status = (
            instance.status
        )

        new_status = (
            validated_data.get(
                "status",
                previous_status,
            )
        )

        for (
            field,
            value,
        ) in validated_data.items():

            setattr(
                instance,
                field,
                value,
            )

        now = (
            timezone.now()
        )

        # =================================================
        # Shipped
        # =================================================

        shipping_progress_statuses = {
            "shipped",
            "in_transit",
            "out_for_delivery",
            "delivered",
        }

        if (
            new_status
            in shipping_progress_statuses
            and instance.shipped_at
            is None
        ):

            instance.shipped_at = (
                now
            )

        # =================================================
        # Out For Delivery
        # =================================================

        if (
            new_status
            == "out_for_delivery"
            and previous_status
            != "out_for_delivery"
            and instance.out_for_delivery_at
            is None
        ):

            instance.out_for_delivery_at = (
                now
            )

        # =================================================
        # Delivered
        # =================================================

        if (
            new_status
            == "delivered"
            and previous_status
            != "delivered"
        ):

            if (
                instance.delivered_at
                is None
            ):

                instance.delivered_at = (
                    now
                )

        # =================================================
        # Cancelled
        # =================================================

        if (
            new_status
            == "cancelled"
            and previous_status
            != "cancelled"
        ):

            if (
                instance.cancelled_at
                is None
            ):

                instance.cancelled_at = (
                    now
                )

        # =================================================
        # Clear Timestamps When Appropriate
        # =================================================

        if (
            new_status
            != "delivered"
            and previous_status
            != "delivered"
        ):

            instance.delivered_at = (
                None
            )

        if (
            new_status
            not in {
                "out_for_delivery",
                "delivered",
            }
            and previous_status
            not in {
                "out_for_delivery",
                "delivered",
            }
        ):

            instance.out_for_delivery_at = (
                None
            )

        if (
            new_status
            != "cancelled"
        ):

            instance.cancelled_at = (
                None
            )

        # =================================================
        # Shipping Status
        # =================================================

        if (
            new_status
            in shipping_progress_statuses
        ):

            instance.shipping_status = (
                new_status
            )

        # =================================================
        # Save
        # =================================================

        update_fields = set(
            validated_data.keys()
        )

        update_fields.update(
            {
                "updated_at",
                "shipped_at",
                "out_for_delivery_at",
                "delivered_at",
                "cancelled_at",
                "shipping_status",
            }
        )

        instance.save(
            update_fields=list(
                update_fields
            )
        )

        return instance


# =========================================================
# Admin Status-Only Update
# =========================================================

class AdminOrderStatusSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Order

        fields = (
            "status",
        )

    # =====================================================
    # Validate Status
    # =====================================================

    def validate_status(
        self,
        value,
    ):

        instance = (
            self.instance
        )

        # =================================================
        # Cancelled Cannot Reopen
        # =================================================

        if (
            instance
            and instance.status
            == "cancelled"
            and value
            != "cancelled"
        ):

            raise serializers.ValidationError(
                "A cancelled order "
                "cannot be reopened."
            )

        # =================================================
        # Delivered Cannot Cancel
        # =================================================

        if (
            instance
            and instance.status
            == "delivered"
            and value
            == "cancelled"
        ):

            raise serializers.ValidationError(
                "A delivered order cannot be "
                "directly cancelled. Use the "
                "return/refund flow."
            )

        # =================================================
        # Paid Cannot Cancel
        # =================================================

        if (
            instance
            and instance.payment_status
            == "paid"
            and value
            == "cancelled"
        ):

            raise serializers.ValidationError(
                "A paid order cannot be cancelled "
                "until the refund flow is completed."
            )

        # =================================================
        # Shipping Requirements
        # =================================================

        if value in {
            "shipped",
            "in_transit",
            "out_for_delivery",
            "delivered",
        }:

            if not (
                instance
                and instance.courier_name
            ):

                raise serializers.ValidationError(
                    "Add the courier name before "
                    "updating this status."
                )

            if not (
                instance.tracking_id
                or instance.awb_code
            ):

                raise serializers.ValidationError(
                    "Add the tracking ID or AWB code "
                    "before updating this status."
                )

        return value

    # =====================================================
    # Update Status
    # =====================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        previous_status = (
            instance.status
        )

        new_status = (
            validated_data[
                "status"
            ]
        )

        now = (
            timezone.now()
        )

        instance.status = (
            new_status
        )

        update_fields = [
            "status",
            "updated_at",
        ]

        shipping_progress_statuses = {
            "shipped",
            "in_transit",
            "out_for_delivery",
            "delivered",
        }

        # =================================================
        # Shipped Timestamp
        # =================================================

        if (
            new_status
            in shipping_progress_statuses
            and instance.shipped_at
            is None
        ):

            instance.shipped_at = (
                now
            )

            update_fields.append(
                "shipped_at"
            )

        # =================================================
        # Out For Delivery
        # =================================================

        if (
            new_status
            == "out_for_delivery"
        ):

            if (
                instance.out_for_delivery_at
                is None
            ):

                instance.out_for_delivery_at = (
                    now
                )

            update_fields.append(
                "out_for_delivery_at"
            )

        elif (
            new_status
            not in {
                "out_for_delivery",
                "delivered",
            }
            and previous_status
            not in {
                "out_for_delivery",
                "delivered",
            }
            and instance.out_for_delivery_at
            is not None
        ):

            instance.out_for_delivery_at = (
                None
            )

            update_fields.append(
                "out_for_delivery_at"
            )

        # =================================================
        # Delivered
        # =================================================

        if (
            new_status
            == "delivered"
        ):

            if (
                instance.delivered_at
                is None
            ):

                instance.delivered_at = (
                    now
                )

            update_fields.append(
                "delivered_at"
            )

        elif (
            previous_status
            != "delivered"
            and instance.delivered_at
            is not None
        ):

            instance.delivered_at = (
                None
            )

            update_fields.append(
                "delivered_at"
            )

        # =================================================
        # Cancelled
        # =================================================

        if (
            new_status
            == "cancelled"
        ):

            if (
                instance.cancelled_at
                is None
            ):

                instance.cancelled_at = (
                    now
                )

            update_fields.append(
                "cancelled_at"
            )

        elif (
            instance.cancelled_at
            is not None
        ):

            instance.cancelled_at = (
                None
            )

            update_fields.append(
                "cancelled_at"
            )

        # =================================================
        # Shipping Status
        # =================================================

        if (
            new_status
            in shipping_progress_statuses
        ):

            instance.shipping_status = (
                new_status
            )

            update_fields.append(
                "shipping_status"
            )

        # =================================================
        # Save
        # =================================================

        instance.save(
            update_fields=list(
                dict.fromkeys(
                    update_fields
                )
            )
        )

        return instance
# =========================================================
# Return / Exchange
# =========================================================

class ReturnItemSerializer(
    serializers.ModelSerializer
):

    order_item = OrderItemSerializer(
        read_only=True,
    )

    replacement_variant_id = (
        serializers.PrimaryKeyRelatedField(
            source="replacement_variant",
            queryset=ProductVariant.objects.filter(
                is_active=True,
            ),
            required=False,
            allow_null=True,
            write_only=True,
        )
    )

    class Meta:

        model = ReturnItem

        fields = (
            "id",
            "order_item",
            "quantity",
            "refund_amount",

            "replacement_variant",
            "replacement_variant_id",
            "replacement_color",
            "replacement_size",

            "inspection_status",
            "inspection_note",
            "is_accepted",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "order_item",
            "refund_amount",
            "replacement_variant",
            "inspection_status",
            "inspection_note",
            "is_accepted",
            "created_at",
            "updated_at",
        )


# =========================================================
# Admin Return Item Inspection
# =========================================================

class AdminReturnItemInspectionSerializer(
    serializers.ModelSerializer
):

    inspection_status = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=50,
    )

    inspection_note = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    is_accepted = serializers.BooleanField(
        required=True,
    )

    class Meta:

        model = ReturnItem

        fields = (
            "id",
            "inspection_status",
            "inspection_note",
            "is_accepted",
            "refund_amount",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "refund_amount",
            "updated_at",
        )

    def validate_inspection_status(
        self,
        value,
    ):

        value = str(
            value or ""
        ).strip().lower()

        allowed_statuses = {
            "pending",
            "approved",
            "rejected",
            "passed",
            "failed",
        }

        if value not in allowed_statuses:

            raise serializers.ValidationError(
                (
                    "Inspection status must be one of: "
                    "pending, approved, rejected, "
                    "passed, failed."
                )
            )

        return value

    def validate(
        self,
        attrs,
    ):

        is_accepted = (
            attrs.get(
                "is_accepted"
            )
        )

        inspection_status = (
            attrs.get(
                "inspection_status"
            )
        )

        if (
            is_accepted is True
            and inspection_status
            in {
                "rejected",
                "failed",
            }
        ):

            raise serializers.ValidationError(
                {
                    "inspection_status": (
                        "An accepted item cannot have "
                        "a rejected or failed "
                        "inspection status."
                    )
                }
            )

        if (
            is_accepted is False
            and inspection_status
            in {
                "approved",
                "passed",
            }
        ):

            raise serializers.ValidationError(
                {
                    "inspection_status": (
                        "A rejected item cannot have "
                        "an approved or passed "
                        "inspection status."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        instance.inspection_status = (
            validated_data[
                "inspection_status"
            ]
        )

        instance.inspection_note = (
            validated_data.get(
                "inspection_note",
                instance.inspection_note,
            )
        )

        instance.is_accepted = (
            validated_data[
                "is_accepted"
            ]
        )

        instance.save(
            update_fields=[
                "inspection_status",
                "inspection_note",
                "is_accepted",
                "updated_at",
            ]
        )

        return instance


# =========================================================
# Return / Exchange Detail
# =========================================================

class ReturnRequestSerializer(
    serializers.ModelSerializer
):

    items = ReturnItemSerializer(
        many=True,
        read_only=True,
    )

    order_number = (
        serializers.CharField(
            source="order.order_number",
            read_only=True,
        )
    )

    request_type_display = (
        serializers.CharField(
            source="get_request_type_display",
            read_only=True,
        )
    )

    status_display = (
        serializers.CharField(
            source="get_status_display",
            read_only=True,
        )
    )

    reason_display = (
        serializers.CharField(
            source="get_reason_display",
            read_only=True,
        )
    )

    customer_email = (
        serializers.EmailField(
            source="user.email",
            read_only=True,
            allow_null=True,
        )
    )

    class Meta:

        model = ReturnRequest

        fields = (
            "id",
            "return_number",

            "order",
            "order_number",

            "user",
            "customer_email",

            "request_type",
            "request_type_display",

            "status",
            "status_display",

            "reason",
            "reason_display",

            "reason_details",
            "customer_note",
            "admin_note",

            # Return Shipping
            "courier_name",
            "courier_service",
            "courier_company_id",
            "awb_code",
            "tracking_id",
            "tracking_url",
            "pickup_scheduled",
            "pickup_scheduled_at",

            # Shiprocket
            "shiprocket_order_id",
            "shiprocket_shipment_id",
            "shipping_status",

            # Refund
            "refund_amount",
            "refund_id",
            "refund_status",
            "refunded_at",

            # Processing
            "processed_by",
            "approved_at",
            "rejected_at",
            "received_at",
            "completed_at",

            # Items
            "items",

            # Timeline
            "created_at",
            "updated_at",
        )

        read_only_fields = fields


# =========================================================
# Return / Exchange Create Item
# =========================================================

class ReturnRequestCreateItemSerializer(
    serializers.Serializer
):

    order_item_id = (
        serializers.IntegerField(
            min_value=1,
        )
    )

    quantity = (
        serializers.IntegerField(
            min_value=1,
            default=1,
        )
    )

    replacement_variant_id = (
        serializers.PrimaryKeyRelatedField(
            source="replacement_variant",
            queryset=ProductVariant.objects.filter(
                is_active=True,
            ),
            required=False,
            allow_null=True,
        )
    )

    replacement_color = (
        serializers.CharField(
            max_length=100,
            required=False,
            allow_blank=True,
        )
    )

    replacement_size = (
        serializers.CharField(
            max_length=50,
            required=False,
            allow_blank=True,
        )
    )


# =========================================================
# Return / Exchange Create Request
# =========================================================

class ReturnRequestCreateSerializer(
    serializers.Serializer
):

    order_number = (
        serializers.CharField(
            max_length=50,
        )
    )

    request_type = (
        serializers.ChoiceField(
            choices=(
                ReturnRequest
                .REQUEST_TYPE_CHOICES
            ),
        )
    )

    reason = (
        serializers.ChoiceField(
            choices=(
                ReturnRequest
                .REASON_CHOICES
            ),
        )
    )

    reason_details = (
        serializers.CharField(
            required=False,
            allow_blank=True,
        )
    )

    customer_note = (
        serializers.CharField(
            required=False,
            allow_blank=True,
        )
    )

    items = (
        ReturnRequestCreateItemSerializer(
            many=True,
        )
    )

    # =====================================================
    # Order Number
    # =====================================================

    def validate_order_number(
        self,
        value,
    ):

        value = str(
            value
            or ""
        ).strip()

        if not value:

            raise serializers.ValidationError(
                "Order number is required."
            )

        request = (
            self.context.get(
                "request"
            )
        )

        user = getattr(
            request,
            "user",
            None,
        )

        if not (
            user
            and user.is_authenticated
        ):

            raise serializers.ValidationError(
                "Please login before creating "
                "a return or exchange request."
            )

        order = (
            Order.objects
            .filter(
                order_number__iexact=value,
                user=user,
            )
            .prefetch_related(
                "items",
            )
            .first()
        )

        if order is None:

            raise serializers.ValidationError(
                "Order was not found."
            )

        # =================================================
        # Delivered Order Required
        # =================================================

        if not order.is_delivered:

            raise serializers.ValidationError(
                "Return or exchange can only be "
                "requested after the order "
                "has been delivered."
            )

        # =================================================
        # Existing Active Request
        # =================================================

        if order.has_return_request:

            raise serializers.ValidationError(
                "An active return or exchange "
                "request already exists for "
                "this order."
            )

        self.context[
            "return_order"
        ] = order

        return order.order_number

    # =====================================================
    # Items
    # =====================================================

    def validate_items(
        self,
        value,
    ):

        if not value:

            raise serializers.ValidationError(
                "Please select at least "
                "one item."
            )

        order = (
            self.context.get(
                "return_order"
            )
        )

        if order is None:

            return value

        order_items = {
            item.id: item
            for item
            in order.items.all()
        }

        seen_order_item_ids = set()

        for item_data in value:

            order_item_id = int(
                item_data[
                    "order_item_id"
                ]
            )

            # =================================================
            # Duplicate Item
            # =================================================

            if (
                order_item_id
                in seen_order_item_ids
            ):

                raise serializers.ValidationError(
                    (
                        f"Order item "
                        f"{order_item_id} "
                        f"has been selected "
                        f"more than once."
                    )
                )

            seen_order_item_ids.add(
                order_item_id
            )

            order_item = (
                order_items.get(
                    order_item_id
                )
            )

            # =================================================
            # Item Belongs To Order
            # =================================================

            if order_item is None:

                raise serializers.ValidationError(
                    (
                        f"Order item "
                        f"{order_item_id} "
                        f"does not belong "
                        f"to this order."
                    )
                )

            quantity = int(
                item_data.get(
                    "quantity",
                    1,
                )
            )

            ordered_quantity = int(
                order_item.quantity
                or 0
            )

            # =================================================
            # Quantity Protection
            # =================================================

            if quantity > ordered_quantity:

                raise serializers.ValidationError(
                    (
                        f"Requested quantity for "
                        f"{order_item.product_name} "
                        f"cannot exceed the ordered "
                        f"quantity of "
                        f"{ordered_quantity}."
                    )
                )

            # =================================================
            # Previously Returned Quantity
            # =================================================

            previous_items = (
                ReturnItem.objects
                .filter(
                    order_item=order_item,
                )
                .exclude(
                    return_request__status__in=[
                        "rejected",
                        "cancelled",
                    ]
                )
            )

            previously_requested = (
                sum(
                    int(
                        previous_item.quantity
                        or 0
                    )
                    for previous_item
                    in previous_items
                )
            )

            available_quantity = max(
                ordered_quantity
                - previously_requested,
                0,
            )

            if quantity > available_quantity:

                raise serializers.ValidationError(
                    (
                        f"Only "
                        f"{available_quantity} "
                        f"item(s) of "
                        f"{order_item.product_name} "
                        f"are available for "
                        f"return or exchange."
                    )
                )

        return value

    # =====================================================
    # Full Validation
    # =====================================================

    def validate(
        self,
        attrs,
    ):

        request_type = (
            attrs.get(
                "request_type"
            )
        )

        order = (
            self.context.get(
                "return_order"
            )
        )

        # =================================================
        # Exchange Replacement Validation
        # =================================================

        if request_type == "exchange":

            for item_data in attrs.get(
                "items",
                [],
            ):

                replacement_variant = (
                    item_data.get(
                        "replacement_variant"
                    )
                )

                replacement_color = str(
                    item_data.get(
                        "replacement_color",
                        "",
                    )
                    or ""
                ).strip()

                replacement_size = str(
                    item_data.get(
                        "replacement_size",
                        "",
                    )
                    or ""
                ).strip()

                if not (
                    replacement_variant
                    or replacement_color
                    or replacement_size
                ):

                    raise serializers.ValidationError(
                        {
                            "items": (
                                "For an exchange, "
                                "select a replacement "
                                "variant, size, or color."
                            )
                        }
                    )

                # =============================================
                # Replacement Variant Must Match Product
                # =============================================

                if (
                    replacement_variant
                    and order
                ):

                    order_item_id = (
                        item_data.get(
                            "order_item_id"
                        )
                    )

                    order_item = (
                        order.items
                        .filter(
                            id=order_item_id,
                        )
                        .first()
                    )

                    if (
                        order_item
                        and order_item.product_id
                        and replacement_variant.product_id
                        != order_item.product_id
                    ):

                        raise serializers.ValidationError(
                            {
                                "items": (
                                    "Replacement variant "
                                    "must belong to the "
                                    "same product."
                                )
                            }
                        )

        # =================================================
        # Return Must Not Carry Replacement Details
        # =================================================

        elif request_type == "return":

            for item_data in attrs.get(
                "items",
                [],
            ):

                item_data.pop(
                    "replacement_variant",
                    None,
                )

                item_data[
                    "replacement_color"
                ] = ""

                item_data[
                    "replacement_size"
                ] = ""

        return attrs

    # =====================================================
    # Create
    # =====================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        request = (
            self.context.get(
                "request"
            )
        )

        user = (
            request.user
        )

        order = (
            self.context.get(
                "return_order"
            )
        )

        if order is None:

            raise serializers.ValidationError(
                {
                    "order_number": (
                        "Unable to resolve "
                        "the order."
                    )
                }
            )

        items_data = (
            validated_data.pop(
                "items"
            )
        )

        validated_data.pop(
            "order_number",
            None,
        )

        # =================================================
        # Lock Order Against Duplicate Requests
        # =================================================

        order = (
            Order.objects
            .select_for_update()
            .get(
                pk=order.pk,
            )
        )

        active_request_exists = (
            ReturnRequest.objects
            .filter(
                order=order,
            )
            .exclude(
                status__in=[
                    "rejected",
                    "cancelled",
                    "completed",
                ]
            )
            .exists()
        )

        if active_request_exists:

            raise serializers.ValidationError(
                {
                    "order_number": (
                        "An active return or exchange "
                        "request already exists for "
                        "this order."
                    )
                }
            )

        # =================================================
        # Create Request
        # =================================================

        return_request = (
            ReturnRequest.objects
            .create(
                order=order,
                user=user,
                status="requested",
                **validated_data,
            )
        )

        # =================================================
        # Create Request Items
        # =================================================

        for item_data in items_data:

            order_item_id = (
                item_data.pop(
                    "order_item_id"
                )
            )

            order_item = (
                OrderItem.objects
                .select_for_update()
                .get(
                    id=order_item_id,
                    order=order,
                )
            )

            ReturnItem.objects.create(
                return_request=(
                    return_request
                ),
                order_item=(
                    order_item
                ),
                quantity=(
                    item_data.pop(
                        "quantity",
                        1,
                    )
                ),
                replacement_variant=(
                    item_data.pop(
                        "replacement_variant",
                        None,
                    )
                ),
                replacement_color=(
                    item_data.pop(
                        "replacement_color",
                        "",
                    )
                ),
                replacement_size=(
                    item_data.pop(
                        "replacement_size",
                        "",
                    )
                ),
            )

        # =================================================
        # Update Order Status
        # =================================================

        if (
            return_request.request_type
            == "exchange"
        ):

            order.status = (
                "exchange_requested"
            )

        else:

            order.status = (
                "return_requested"
            )

        order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return return_request

    # =====================================================
    # Response
    # =====================================================

    def to_representation(
        self,
        instance,
    ):

        return ReturnRequestSerializer(
            instance,
            context=self.context,
        ).data