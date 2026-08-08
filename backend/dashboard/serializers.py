from rest_framework import serializers


# =========================================================
# Generic Dashboard Metrics
# =========================================================

class MetricCardSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    value = serializers.JSONField()

    change_percentage = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    trend = serializers.ChoiceField(
        choices=(
            ("up", "Up"),
            ("down", "Down"),
            ("neutral", "Neutral"),
        ),
        required=False,
        default="neutral",
    )


class DashboardOverviewSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_orders = serializers.IntegerField()
    total_customers = serializers.IntegerField()
    total_products = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_reviews = serializers.IntegerField()
    total_coupons = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    out_of_stock_items = serializers.IntegerField()


# =========================================================
# Sales Analytics
# =========================================================

class SalesPeriodSerializer(serializers.Serializer):
    label = serializers.CharField()

    revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    orders = serializers.IntegerField()

    average_order_value = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    growth_percentage = serializers.FloatField(
        required=False,
        allow_null=True,
    )


class SalesAnalyticsSerializer(serializers.Serializer):
    today = SalesPeriodSerializer()
    yesterday = SalesPeriodSerializer()
    last_7_days = SalesPeriodSerializer()
    last_30_days = SalesPeriodSerializer()
    this_month = SalesPeriodSerializer()
    this_year = SalesPeriodSerializer()


# =========================================================
# Order Analytics
# =========================================================

class OrderStatusCountSerializer(serializers.Serializer):
    status = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class OrderAnalyticsSerializer(serializers.Serializer):
    total_orders = serializers.IntegerField()

    status_counts = OrderStatusCountSerializer(
        many=True,
    )

    cancellable_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    returned_orders = serializers.IntegerField()
    refunded_orders = serializers.IntegerField()


# =========================================================
# Payment Analytics
# =========================================================

class PaymentMethodCountSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    percentage = serializers.FloatField()


class PaymentStatusCountSerializer(serializers.Serializer):
    payment_status = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    percentage = serializers.FloatField()


class PaymentAnalyticsSerializer(serializers.Serializer):
    total_paid_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_refunded_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    payment_methods = PaymentMethodCountSerializer(
        many=True,
    )

    payment_statuses = PaymentStatusCountSerializer(
        many=True,
    )


# =========================================================
# Product Analytics
# =========================================================

class TopSellingProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(
        allow_null=True,
    )

    product_name = serializers.CharField()

    product_sku = serializers.CharField(
        allow_blank=True,
    )

    units_sold = serializers.IntegerField()

    revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StockItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()

    product_sku = serializers.CharField(
        allow_blank=True,
    )

    variant_sku = serializers.CharField(
        allow_blank=True,
        allow_null=True,
    )

    color = serializers.CharField(
        allow_blank=True,
    )

    size = serializers.CharField(
        allow_blank=True,
    )

    stock = serializers.IntegerField()

    threshold = serializers.IntegerField(
        required=False,
        allow_null=True,
    )


class RecentProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

    sku = serializers.CharField(
        allow_blank=True,
        allow_null=True,
    )

    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    total_stock = serializers.IntegerField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class ProductAnalyticsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    inactive_products = serializers.IntegerField()
    total_variants = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()

    top_selling_products = TopSellingProductSerializer(
        many=True,
    )

    low_stock_products = StockItemSerializer(
        many=True,
    )

    # Optional because optimized dashboard payload
    # does not always calculate this list.
    out_of_stock_products = StockItemSerializer(
        many=True,
        required=False,
        default=list,
    )

    # Optional because optimized dashboard payload
    # does not always calculate this list.
    recently_added_products = RecentProductSerializer(
        many=True,
        required=False,
        default=list,
    )


# =========================================================
# Customer Analytics
# =========================================================

class TopCustomerSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(
        allow_null=True,
    )

    name = serializers.CharField()

    email = serializers.EmailField(
        allow_blank=True,
        allow_null=True,
    )

    phone = serializers.CharField(
        allow_blank=True,
        allow_null=True,
    )

    total_orders = serializers.IntegerField()

    total_spent = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class CustomerAnalyticsSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    new_customers_today = serializers.IntegerField()
    new_customers_this_month = serializers.IntegerField()
    returning_customers = serializers.IntegerField()
    guest_orders = serializers.IntegerField()
    registered_customer_orders = serializers.IntegerField()

    top_customers = TopCustomerSerializer(
        many=True,
    )


# =========================================================
# Coupon Analytics
# =========================================================

class TopCouponSerializer(serializers.Serializer):
    coupon_id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    usage_count = serializers.IntegerField()

    total_discount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class CouponAnalyticsSerializer(serializers.Serializer):
    total_coupons = serializers.IntegerField()
    active_coupons = serializers.IntegerField()
    inactive_coupons = serializers.IntegerField()
    expired_coupons = serializers.IntegerField()
    total_coupon_usages = serializers.IntegerField()

    total_discount_given = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    top_coupons = TopCouponSerializer(
        many=True,
    )


# =========================================================
# Review Analytics
# =========================================================

class RatingCountSerializer(serializers.Serializer):
    rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
    )

    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class ReviewAnalyticsSerializer(serializers.Serializer):
    total_reviews = serializers.IntegerField()
    average_rating = serializers.FloatField()
    pending_reviews = serializers.IntegerField()
    approved_reviews = serializers.IntegerField()
    rejected_reviews = serializers.IntegerField()
    verified_purchase_reviews = serializers.IntegerField()

    rating_breakdown = RatingCountSerializer(
        many=True,
    )


# =========================================================
# Chart Data
# =========================================================

class TimeSeriesPointSerializer(serializers.Serializer):
    date = serializers.CharField()
    label = serializers.CharField()
    orders = serializers.IntegerField()

    revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class CategorySalesSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(
        allow_null=True,
    )

    category_name = serializers.CharField()
    units_sold = serializers.IntegerField()

    revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class BrandSalesSerializer(serializers.Serializer):
    brand_id = serializers.IntegerField(
        allow_null=True,
    )

    brand_name = serializers.CharField()
    units_sold = serializers.IntegerField()

    revenue = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class DashboardChartsSerializer(serializers.Serializer):
    daily_sales = TimeSeriesPointSerializer(
        many=True,
    )

    monthly_sales = TimeSeriesPointSerializer(
        many=True,
    )

    order_status_distribution = OrderStatusCountSerializer(
        many=True,
    )

    payment_method_distribution = PaymentMethodCountSerializer(
        many=True,
    )

    # Optional because optimized dashboard does not
    # calculate these unless explicitly requested.
    category_sales = CategorySalesSerializer(
        many=True,
        required=False,
        default=list,
    )

    brand_sales = BrandSalesSerializer(
        many=True,
        required=False,
        default=list,
    )


# =========================================================
# Recent Activity
# =========================================================

class RecentOrderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order_number = serializers.CharField()
    customer_name = serializers.CharField()

    phone = serializers.CharField(
        allow_blank=True,
    )

    status = serializers.CharField()
    payment_method = serializers.CharField()
    payment_status = serializers.CharField()

    total_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    placed_at = serializers.DateTimeField()


class RecentPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order_number = serializers.CharField()
    payment_method = serializers.CharField()
    status = serializers.CharField()

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    transaction_id = serializers.CharField(
        allow_blank=True,
        allow_null=True,
    )

    created_at = serializers.DateTimeField()


class RecentReviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    customer_name = serializers.CharField()
    rating = serializers.IntegerField()

    title = serializers.CharField(
        allow_blank=True,
    )

    status = serializers.CharField()
    is_verified_purchase = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class RecentActivitySerializer(serializers.Serializer):
    recent_orders = RecentOrderSerializer(
        many=True,
    )

    recent_payments = RecentPaymentSerializer(
        many=True,
    )

    recent_reviews = RecentReviewSerializer(
        many=True,
    )

    low_stock_alerts = StockItemSerializer(
        many=True,
    )


# =========================================================
# Complete Dashboard Response
# =========================================================

class AdminDashboardSerializer(serializers.Serializer):
    overview = DashboardOverviewSerializer()
    sales = SalesAnalyticsSerializer()
    orders = OrderAnalyticsSerializer()
    payments = PaymentAnalyticsSerializer()
    products = ProductAnalyticsSerializer()
    customers = CustomerAnalyticsSerializer()
    coupons = CouponAnalyticsSerializer()
    reviews = ReviewAnalyticsSerializer()
    charts = DashboardChartsSerializer()
    recent_activity = RecentActivitySerializer()
    generated_at = serializers.DateTimeField()