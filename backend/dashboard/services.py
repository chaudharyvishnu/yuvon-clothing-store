from calendar import month_abbr
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import (
    Avg,
    Count,
    DecimalField,
    F,
    Q,
    Sum,
    Value,
)
from django.db.models.functions import (
    Coalesce,
    TruncDate,
    TruncMonth,
)
from django.utils import timezone

from categories.models import Category
from coupons.models import Coupon, CouponUsage
from inventory.models import InventorySettings, LowStockAlert
from orders.models import Order, OrderItem, Payment
from products.models import Product, ProductVariant
from reviews.models import Review


# =========================================================
# Constants
# =========================================================

MONEY_FIELD = DecimalField(
    max_digits=14,
    decimal_places=2,
)

ZERO_MONEY = Value(
    Decimal("0.00"),
    output_field=MONEY_FIELD,
)

SUCCESSFUL_ORDER_STATUSES = {
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
}

EXCLUDED_SALES_STATUSES = {
    "cancelled",
    "returned",
    "refunded",
}

# Dashboard analytics do not need second-by-second freshness.
DASHBOARD_CACHE_TIMEOUT = 120


# =========================================================
# Common Helpers
# =========================================================

def _money(value):
    return Decimal(
        str(value or "0")
    ).quantize(
        Decimal("0.01")
    )


def _percentage(part, whole):
    part = int(part or 0)
    whole = int(whole or 0)

    if whole <= 0:
        return 0.0

    return round(
        (part / whole) * 100,
        2,
    )


def _growth_percentage(
    current,
    previous,
):
    current = Decimal(
        str(current or 0)
    )

    previous = Decimal(
        str(previous or 0)
    )

    if previous == 0:
        return (
            100.0
            if current > 0
            else 0.0
        )

    return round(
        float(
            (
                (current - previous)
                / previous
            )
            * Decimal("100")
        ),
        2,
    )


def _aware_start(day):
    value = datetime.combine(
        day,
        time.min,
    )

    if timezone.is_naive(value):
        value = timezone.make_aware(
            value,
            timezone.get_current_timezone(),
        )

    return value


def _aware_end(day):
    return _aware_start(
        day + timedelta(days=1)
    )


def _month_start(day):
    return date(
        day.year,
        day.month,
        1,
    )


def _previous_month_start(day):
    first = _month_start(day)

    previous_day = (
        first
        - timedelta(days=1)
    )

    return date(
        previous_day.year,
        previous_day.month,
        1,
    )


def _apply_datetime_range(
    queryset,
    field_name,
    start_date=None,
    end_date=None,
):
    filters = {}

    if start_date:
        filters[
            f"{field_name}__gte"
        ] = _aware_start(
            start_date
        )

    if end_date:
        filters[
            f"{field_name}__lt"
        ] = _aware_end(
            end_date
        )

    if filters:
        queryset = queryset.filter(
            **filters
        )

    return queryset


def _apply_order_range(
    queryset,
    start_date=None,
    end_date=None,
):
    return _apply_datetime_range(
        queryset,
        "placed_at",
        start_date,
        end_date,
    )


def _apply_review_range(
    queryset,
    start_date=None,
    end_date=None,
):
    return _apply_datetime_range(
        queryset,
        "created_at",
        start_date,
        end_date,
    )


def _apply_coupon_usage_range(
    queryset,
    start_date=None,
    end_date=None,
):
    return _apply_datetime_range(
        queryset,
        "used_at",
        start_date,
        end_date,
    )


def _sales_orders():
    return (
        Order.objects
        .filter(
            payment_status="paid",
        )
        .exclude(
            status__in=EXCLUDED_SALES_STATUSES,
        )
    )


def _user_model_has_field(
    field_name,
):
    User = get_user_model()

    return any(
        field.name == field_name
        for field
        in User._meta.get_fields()
    )


def _display_user_name(user):
    if user is None:
        return "Customer"

    if hasattr(
        user,
        "get_full_name",
    ):
        full_name = (
            user.get_full_name()
            or ""
        ).strip()

        if full_name:
            return full_name

    for field_name in (
        "name",
        "username",
        "email",
        "phone",
        "mobile",
    ):
        value = getattr(
            user,
            field_name,
            "",
        )

        if value:
            return str(value)

    return "Customer"


def _stock_item(
    variant,
    threshold=None,
):
    return {
        "variant_id":
            variant.id,

        "product_id":
            variant.product_id,

        "product_name":
            variant.product.name,

        "product_sku":
            variant.product.sku
            or "",

        "variant_sku":
            variant.sku
            or "",

        "color":
            variant.color
            or "",

        "size":
            variant.size
            or "",

        "stock":
            int(
                variant.stock
                or 0
            ),

        "threshold":
            threshold,
    }


def _sales_period_result(
    label,
    revenue,
    orders,
):
    revenue = _money(
        revenue
    )

    orders = int(
        orders or 0
    )

    average_order_value = (
        revenue / orders
        if orders
        else Decimal("0.00")
    )

    return {
        "label":
            label,

        "revenue":
            revenue,

        "orders":
            orders,

        "average_order_value":
            _money(
                average_order_value
            ),
    }


# =========================================================
# Overview
# =========================================================

def get_dashboard_overview(
    start_date=None,
    end_date=None,
):
    orders = _apply_order_range(
        Order.objects.all(),
        start_date,
        end_date,
    )

    sales_orders = _apply_order_range(
        _sales_orders(),
        start_date,
        end_date,
    )

    order_summary = orders.aggregate(
        total_orders=Count(
            "id"
        ),
    )

    revenue_summary = (
        sales_orders.aggregate(
            total_revenue=Coalesce(
                Sum(
                    "total_amount"
                ),
                ZERO_MONEY,
            ),
        )
    )

    total_customers = (
        orders
        .exclude(
            user_id__isnull=True
        )
        .values(
            "user_id"
        )
        .distinct()
        .count()
    )

    settings_obj = (
        InventorySettings.load()
    )

    threshold = int(
        settings_obj.low_stock_threshold
        or 0
    )

    stock_counts = (
        ProductVariant.objects
        .filter(
            is_active=True
        )
        .aggregate(
            low_stock=Count(
                "id",
                filter=Q(
                    stock__gt=0,
                    stock__lte=threshold,
                ),
            ),
            out_of_stock=Count(
                "id",
                filter=Q(
                    stock=0,
                ),
            ),
        )
    )

    return {
        "total_revenue":
            _money(
                revenue_summary[
                    "total_revenue"
                ]
            ),

        "total_orders":
            int(
                order_summary[
                    "total_orders"
                ]
                or 0
            ),

        "total_customers":
            total_customers,

        "total_products":
            Product.objects.count(),

        "total_categories":
            Category.objects.count(),

        "total_reviews":
            Review.objects.count(),

        "total_coupons":
            Coupon.objects.count(),

        "low_stock_items":
            int(
                stock_counts[
                    "low_stock"
                ]
                or 0
            ),

        "out_of_stock_items":
            int(
                stock_counts[
                    "out_of_stock"
                ]
                or 0
            ),
    }


# =========================================================
# Sales Analytics
# =========================================================

def get_sales_analytics():
    """
    Calculate all major sales windows using one aggregate query.
    """

    today = timezone.localdate()

    yesterday = (
        today
        - timedelta(days=1)
    )

    day_before_yesterday = (
        yesterday
        - timedelta(days=1)
    )

    last_7_start = (
        today
        - timedelta(days=6)
    )

    previous_7_start = (
        last_7_start
        - timedelta(days=7)
    )

    last_30_start = (
        today
        - timedelta(days=29)
    )

    previous_30_start = (
        last_30_start
        - timedelta(days=30)
    )

    current_month_start = (
        _month_start(today)
    )

    previous_month_start = (
        _previous_month_start(
            today
        )
    )

    current_year_start = date(
        today.year,
        1,
        1,
    )

    previous_year_start = date(
        today.year - 1,
        1,
        1,
    )

    today_start = (
        _aware_start(today)
    )

    tomorrow_start = (
        _aware_end(today)
    )

    yesterday_start = (
        _aware_start(yesterday)
    )

    day_before_start = (
        _aware_start(
            day_before_yesterday
        )
    )

    last_7_start_dt = (
        _aware_start(
            last_7_start
        )
    )

    previous_7_start_dt = (
        _aware_start(
            previous_7_start
        )
    )

    last_30_start_dt = (
        _aware_start(
            last_30_start
        )
    )

    previous_30_start_dt = (
        _aware_start(
            previous_30_start
        )
    )

    current_month_start_dt = (
        _aware_start(
            current_month_start
        )
    )

    previous_month_start_dt = (
        _aware_start(
            previous_month_start
        )
    )

    current_year_start_dt = (
        _aware_start(
            current_year_start
        )
    )

    previous_year_start_dt = (
        _aware_start(
            previous_year_start
        )
    )

    queryset = _sales_orders()

    data = queryset.aggregate(
        today_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=today_start,
                    placed_at__lt=tomorrow_start,
                ),
            ),
            ZERO_MONEY,
        ),
        today_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=today_start,
                placed_at__lt=tomorrow_start,
            ),
        ),

        yesterday_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=yesterday_start,
                    placed_at__lt=today_start,
                ),
            ),
            ZERO_MONEY,
        ),
        yesterday_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=yesterday_start,
                placed_at__lt=today_start,
            ),
        ),

        previous_day_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=day_before_start,
                    placed_at__lt=yesterday_start,
                ),
            ),
            ZERO_MONEY,
        ),
        previous_day_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=day_before_start,
                placed_at__lt=yesterday_start,
            ),
        ),

        last_7_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=last_7_start_dt,
                    placed_at__lt=tomorrow_start,
                ),
            ),
            ZERO_MONEY,
        ),
        last_7_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=last_7_start_dt,
                placed_at__lt=tomorrow_start,
            ),
        ),

        previous_7_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=previous_7_start_dt,
                    placed_at__lt=last_7_start_dt,
                ),
            ),
            ZERO_MONEY,
        ),
        previous_7_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=previous_7_start_dt,
                placed_at__lt=last_7_start_dt,
            ),
        ),

        last_30_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=last_30_start_dt,
                    placed_at__lt=tomorrow_start,
                ),
            ),
            ZERO_MONEY,
        ),
        last_30_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=last_30_start_dt,
                placed_at__lt=tomorrow_start,
            ),
        ),

        previous_30_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=previous_30_start_dt,
                    placed_at__lt=last_30_start_dt,
                ),
            ),
            ZERO_MONEY,
        ),
        previous_30_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=previous_30_start_dt,
                placed_at__lt=last_30_start_dt,
            ),
        ),

        this_month_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=current_month_start_dt,
                    placed_at__lt=tomorrow_start,
                ),
            ),
            ZERO_MONEY,
        ),
        this_month_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=current_month_start_dt,
                placed_at__lt=tomorrow_start,
            ),
        ),

        previous_month_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=previous_month_start_dt,
                    placed_at__lt=current_month_start_dt,
                ),
            ),
            ZERO_MONEY,
        ),
        previous_month_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=previous_month_start_dt,
                placed_at__lt=current_month_start_dt,
            ),
        ),

        this_year_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=current_year_start_dt,
                    placed_at__lt=tomorrow_start,
                ),
            ),
            ZERO_MONEY,
        ),
        this_year_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=current_year_start_dt,
                placed_at__lt=tomorrow_start,
            ),
        ),

        previous_year_revenue=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    placed_at__gte=previous_year_start_dt,
                    placed_at__lt=current_year_start_dt,
                ),
            ),
            ZERO_MONEY,
        ),
        previous_year_orders=Count(
            "id",
            filter=Q(
                placed_at__gte=previous_year_start_dt,
                placed_at__lt=current_year_start_dt,
            ),
        ),
    )

    today_data = _sales_period_result(
        "Today",
        data["today_revenue"],
        data["today_orders"],
    )

    yesterday_data = _sales_period_result(
        "Yesterday",
        data["yesterday_revenue"],
        data["yesterday_orders"],
    )

    last_7_data = _sales_period_result(
        "Last 7 Days",
        data["last_7_revenue"],
        data["last_7_orders"],
    )

    last_30_data = _sales_period_result(
        "Last 30 Days",
        data["last_30_revenue"],
        data["last_30_orders"],
    )

    this_month_data = _sales_period_result(
        "This Month",
        data["this_month_revenue"],
        data["this_month_orders"],
    )

    this_year_data = _sales_period_result(
        "This Year",
        data["this_year_revenue"],
        data["this_year_orders"],
    )

    today_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["today_revenue"],
        data["yesterday_revenue"],
    )

    yesterday_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["yesterday_revenue"],
        data["previous_day_revenue"],
    )

    last_7_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["last_7_revenue"],
        data["previous_7_revenue"],
    )

    last_30_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["last_30_revenue"],
        data["previous_30_revenue"],
    )

    this_month_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["this_month_revenue"],
        data["previous_month_revenue"],
    )

    this_year_data[
        "growth_percentage"
    ] = _growth_percentage(
        data["this_year_revenue"],
        data["previous_year_revenue"],
    )

    return {
        "today":
            today_data,

        "yesterday":
            yesterday_data,

        "last_7_days":
            last_7_data,

        "last_30_days":
            last_30_data,

        "this_month":
            this_month_data,

        "this_year":
            this_year_data,
    }


# =========================================================
# Order Analytics
# =========================================================

def get_order_analytics(
    start_date=None,
    end_date=None,
):
    queryset = _apply_order_range(
        Order.objects.all(),
        start_date,
        end_date,
    )

    grouped_rows = list(
        queryset
        .values("status")
        .annotate(
            count=Count("id")
        )
    )

    raw_counts = {
        row["status"]:
            int(
                row["count"]
                or 0
            )
        for row in grouped_rows
    }

    total_orders = sum(
        raw_counts.values()
    )

    status_counts = []

    for (
        status_value,
        label,
    ) in Order.STATUS_CHOICES:
        count = int(
            raw_counts.get(
                status_value,
                0,
            )
        )

        status_counts.append(
            {
                "status":
                    status_value,

                "label":
                    label,

                "count":
                    count,

                "percentage":
                    _percentage(
                        count,
                        total_orders,
                    ),
            }
        )

    cancellable_orders = (
        queryset
        .filter(
            status__in={
                "pending",
                "confirmed",
                "processing",
            },
            payment_status__in={
                "pending",
                "failed",
            },
        )
        .count()
    )

    return {
        "total_orders":
            total_orders,

        "status_counts":
            status_counts,

        "cancellable_orders":
            cancellable_orders,

        "completed_orders":
            raw_counts.get(
                "delivered",
                0,
            ),

        "cancelled_orders":
            raw_counts.get(
                "cancelled",
                0,
            ),

        "returned_orders":
            raw_counts.get(
                "returned",
                0,
            ),

        "refunded_orders":
            raw_counts.get(
                "refunded",
                0,
            ),
    }


# =========================================================
# Payment Analytics
# =========================================================

def get_payment_analytics(
    start_date=None,
    end_date=None,
):
    orders = _apply_order_range(
        Order.objects.all(),
        start_date,
        end_date,
    )

    summary = orders.aggregate(
        total_orders=Count(
            "id"
        ),

        total_paid_amount=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    payment_status="paid"
                ),
            ),
            ZERO_MONEY,
        ),

        total_refunded_amount=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    payment_status__in={
                        "refunded",
                        "partially_refunded",
                    }
                ),
            ),
            ZERO_MONEY,
        ),
    )

    total_orders = int(
        summary["total_orders"]
        or 0
    )

    method_rows = {
        row["payment_method"]:
            row
        for row in (
            orders
            .values(
                "payment_method"
            )
            .annotate(
                count=Count(
                    "id"
                ),
                amount=Coalesce(
                    Sum(
                        "total_amount"
                    ),
                    ZERO_MONEY,
                ),
            )
        )
    }

    payment_methods = []

    for (
        method,
        label,
    ) in Order.PAYMENT_METHOD_CHOICES:
        row = method_rows.get(
            method,
            {},
        )

        count = int(
            row.get(
                "count",
                0,
            )
        )

        payment_methods.append(
            {
                "payment_method":
                    method,

                "label":
                    label,

                "count":
                    count,

                "amount":
                    _money(
                        row.get(
                            "amount",
                            0,
                        )
                    ),

                "percentage":
                    _percentage(
                        count,
                        total_orders,
                    ),
            }
        )

    status_rows = {
        row["payment_status"]:
            row
        for row in (
            orders
            .values(
                "payment_status"
            )
            .annotate(
                count=Count(
                    "id"
                ),
                amount=Coalesce(
                    Sum(
                        "total_amount"
                    ),
                    ZERO_MONEY,
                ),
            )
        )
    }

    payment_statuses = []

    for (
        payment_status,
        label,
    ) in Order.PAYMENT_STATUS_CHOICES:
        row = status_rows.get(
            payment_status,
            {},
        )

        count = int(
            row.get(
                "count",
                0,
            )
        )

        payment_statuses.append(
            {
                "payment_status":
                    payment_status,

                "label":
                    label,

                "count":
                    count,

                "amount":
                    _money(
                        row.get(
                            "amount",
                            0,
                        )
                    ),

                "percentage":
                    _percentage(
                        count,
                        total_orders,
                    ),
            }
        )

    return {
        "total_paid_amount":
            _money(
                summary[
                    "total_paid_amount"
                ]
            ),

        "total_refunded_amount":
            _money(
                summary[
                    "total_refunded_amount"
                ]
            ),

        "payment_methods":
            payment_methods,

        "payment_statuses":
            payment_statuses,
    }


# =========================================================
# Product Analytics
# =========================================================

def get_product_analytics(
    start_date=None,
    end_date=None,
    limit=10,
    include_recent=False,
):
    settings_obj = (
        InventorySettings.load()
    )

    threshold = int(
        settings_obj.low_stock_threshold
        or 0
    )

    product_counts = (
        Product.objects.aggregate(
            total=Count(
                "id"
            ),
            active=Count(
                "id",
                filter=Q(
                    is_active=True
                ),
            ),
        )
    )

    variant_counts = (
        ProductVariant.objects.aggregate(
            total=Count(
                "id"
            ),

            low_stock=Count(
                "id",
                filter=Q(
                    is_active=True,
                    stock__gt=0,
                    stock__lte=threshold,
                ),
            ),

            out_of_stock=Count(
                "id",
                filter=Q(
                    is_active=True,
                    stock=0,
                ),
            ),
        )
    )

    low_stock_queryset = (
        ProductVariant.objects
        .filter(
            is_active=True,
            stock__gt=0,
            stock__lte=threshold,
        )
        .select_related(
            "product"
        )
        .order_by(
            "stock",
            "product__name",
        )[:limit]
    )

    sales_items = (
        OrderItem.objects
        .filter(
            order__status__in=
                SUCCESSFUL_ORDER_STATUSES,
        )
    )

    sales_items = (
        _apply_datetime_range(
            sales_items,
            "order__placed_at",
            start_date,
            end_date,
        )
    )

    top_rows = (
        sales_items
        .values(
            "product_id",
            "product_name",
            "product_sku",
        )
        .annotate(
            units_sold=Coalesce(
                Sum("quantity"),
                0,
            ),
            revenue=Coalesce(
                Sum(
                    "total_price"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "-units_sold",
            "-revenue",
        )[:limit]
    )

    total_products = int(
        product_counts["total"]
        or 0
    )

    active_products = int(
        product_counts["active"]
        or 0
    )

    result = {
        "total_products":
            total_products,

        "active_products":
            active_products,

        "inactive_products":
            (
                total_products
                - active_products
            ),

        "total_variants":
            int(
                variant_counts[
                    "total"
                ]
                or 0
            ),

        "low_stock_count":
            int(
                variant_counts[
                    "low_stock"
                ]
                or 0
            ),

        "out_of_stock_count":
            int(
                variant_counts[
                    "out_of_stock"
                ]
                or 0
            ),

        "top_selling_products":
            [
                {
                    "product_id":
                        row[
                            "product_id"
                        ],

                    "product_name":
                        row[
                            "product_name"
                        ],

                    "product_sku":
                        row[
                            "product_sku"
                        ]
                        or "",

                    "units_sold":
                        int(
                            row[
                                "units_sold"
                            ]
                            or 0
                        ),

                    "revenue":
                        _money(
                            row[
                                "revenue"
                            ]
                        ),
                }
                for row in top_rows
            ],

        "low_stock_products":
            [
                _stock_item(
                    variant,
                    threshold,
                )
                for variant
                in low_stock_queryset
            ],
    }

    # Expensive lists are optional because main dashboard
    # currently does not render them.
    if include_recent:
        out_of_stock_queryset = (
            ProductVariant.objects
            .filter(
                is_active=True,
                stock=0,
            )
            .select_related(
                "product"
            )
            .order_by(
                "product__name",
                "id",
            )[:limit]
        )

        recent_products = (
            Product.objects
            .annotate(
                total_stock=Coalesce(
                    Sum(
                        "variants__stock",
                        filter=Q(
                            variants__is_active=True
                        ),
                    ),
                    0,
                )
            )
            .order_by(
                "-created_at"
            )[:limit]
        )

        result[
            "out_of_stock_products"
        ] = [
            _stock_item(
                variant,
                threshold,
            )
            for variant
            in out_of_stock_queryset
        ]

        result[
            "recently_added_products"
        ] = [
            {
                "id":
                    product.id,

                "name":
                    product.name,

                "sku":
                    product.sku,

                "price":
                    product.price,

                "total_stock":
                    int(
                        product.total_stock
                        or 0
                    ),

                "is_active":
                    product.is_active,

                "created_at":
                    product.created_at,
            }
            for product
            in recent_products
        ]

    return result


# =========================================================
# Customer Analytics
# =========================================================

def get_customer_analytics(
    start_date=None,
    end_date=None,
    limit=10,
):
    User = get_user_model()

    today = (
        timezone.localdate()
    )

    month_start = (
        _month_start(today)
    )

    users = (
        User.objects.all()
    )

    if _user_model_has_field(
        "is_staff"
    ):
        users = users.filter(
            is_staff=False
        )

    customer_counts = {
        "total":
            users.count(),

        "today":
            0,

        "month":
            0,
    }

    if _user_model_has_field(
        "date_joined"
    ):
        customer_counts[
            "today"
        ] = users.filter(
            date_joined__gte=
                _aware_start(today),

            date_joined__lt=
                _aware_end(today),
        ).count()

        customer_counts[
            "month"
        ] = users.filter(
            date_joined__gte=
                _aware_start(
                    month_start
                ),

            date_joined__lt=
                _aware_end(today),
        ).count()

    orders = (
        _apply_order_range(
            Order.objects.all(),
            start_date,
            end_date,
        )
    )

    order_customer_counts = (
        orders.aggregate(
            guest_orders=Count(
                "id",
                filter=Q(
                    user_id__isnull=True
                ),
            ),

            registered_orders=Count(
                "id",
                filter=Q(
                    user_id__isnull=False
                ),
            ),
        )
    )

    returning_customers = (
        orders
        .exclude(
            user_id__isnull=True
        )
        .values(
            "user_id"
        )
        .annotate(
            order_count=Count(
                "id"
            )
        )
        .filter(
            order_count__gte=2
        )
        .count()
    )

    top_rows = list(
        orders
        .filter(
            user_id__isnull=False,
            payment_status="paid",
        )
        .exclude(
            status__in=
                EXCLUDED_SALES_STATUSES,
        )
        .values(
            "user_id",
            "user__email",
        )
        .annotate(
            total_orders=Count(
                "id"
            ),
            total_spent=Coalesce(
                Sum(
                    "total_amount"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "-total_spent",
            "-total_orders",
        )[:limit]
    )

    top_user_ids = [
        row["user_id"]
        for row in top_rows
    ]

    latest_order_map = {}

    if top_user_ids:
        latest_orders = (
            orders
            .filter(
                user_id__in=
                    top_user_ids
            )
            .only(
                "user_id",
                "full_name",
                "phone",
                "placed_at",
            )
            .order_by(
                "user_id",
                "-placed_at",
            )
        )

        for order in latest_orders:
            if (
                order.user_id
                not in latest_order_map
            ):
                latest_order_map[
                    order.user_id
                ] = order

    top_customers = []

    for row in top_rows:
        latest_order = (
            latest_order_map.get(
                row["user_id"]
            )
        )

        top_customers.append(
            {
                "user_id":
                    row["user_id"],

                "name":
                    (
                        getattr(
                            latest_order,
                            "full_name",
                            "",
                        )
                        or "Customer"
                    ),

                "email":
                    row.get(
                        "user__email"
                    )
                    or "",

                "phone":
                    (
                        getattr(
                            latest_order,
                            "phone",
                            "",
                        )
                        or ""
                    ),

                "total_orders":
                    int(
                        row[
                            "total_orders"
                        ]
                        or 0
                    ),

                "total_spent":
                    _money(
                        row[
                            "total_spent"
                        ]
                    ),
            }
        )

    return {
        "total_customers":
            customer_counts[
                "total"
            ],

        "new_customers_today":
            customer_counts[
                "today"
            ],

        "new_customers_this_month":
            customer_counts[
                "month"
            ],

        "returning_customers":
            returning_customers,

        "guest_orders":
            int(
                order_customer_counts[
                    "guest_orders"
                ]
                or 0
            ),

        "registered_customer_orders":
            int(
                order_customer_counts[
                    "registered_orders"
                ]
                or 0
            ),

        "top_customers":
            top_customers,
    }


# =========================================================
# Coupon Analytics
# =========================================================

def get_coupon_analytics(
    start_date=None,
    end_date=None,
    limit=10,
):
    now = timezone.now()

    usages = (
        _apply_coupon_usage_range(
            CouponUsage.objects.all(),
            start_date,
            end_date,
        )
    )

    usage_summary = (
        usages.aggregate(
            total_usage=Count(
                "id"
            ),

            total_discount=Coalesce(
                Sum(
                    "discount_amount"
                ),
                ZERO_MONEY,
            ),
        )
    )

    top_rows = (
        usages
        .values(
            "coupon_id",
            "coupon__code",
            "coupon__name",
        )
        .annotate(
            usage_count=Count(
                "id"
            ),
            total_discount=Coalesce(
                Sum(
                    "discount_amount"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "-usage_count",
            "-total_discount",
        )[:limit]
    )

    coupon_counts = (
        Coupon.objects.aggregate(
            total=Count(
                "id"
            ),

            inactive=Count(
                "id",
                filter=Q(
                    is_active=False
                ),
            ),

            expired=Count(
                "id",
                filter=Q(
                    valid_until__lt=now
                ),
            ),
        )
    )

    active_coupons = (
        Coupon.objects
        .filter(
            is_active=True,
            valid_from__lte=now,
            valid_until__gte=now,
        )
        .filter(
            Q(
                total_usage_limit__isnull=True
            )
            |
            Q(
                used_count__lt=F(
                    "total_usage_limit"
                )
            )
        )
        .count()
    )

    return {
        "total_coupons":
            int(
                coupon_counts["total"]
                or 0
            ),

        "active_coupons":
            active_coupons,

        "inactive_coupons":
            int(
                coupon_counts[
                    "inactive"
                ]
                or 0
            ),

        "expired_coupons":
            int(
                coupon_counts[
                    "expired"
                ]
                or 0
            ),

        "total_coupon_usages":
            int(
                usage_summary[
                    "total_usage"
                ]
                or 0
            ),

        "total_discount_given":
            _money(
                usage_summary[
                    "total_discount"
                ]
            ),

        "top_coupons":
            [
                {
                    "coupon_id":
                        row[
                            "coupon_id"
                        ],

                    "code":
                        row[
                            "coupon__code"
                        ],

                    "name":
                        row[
                            "coupon__name"
                        ],

                    "usage_count":
                        int(
                            row[
                                "usage_count"
                            ]
                            or 0
                        ),

                    "total_discount":
                        _money(
                            row[
                                "total_discount"
                            ]
                        ),
                }
                for row in top_rows
            ],
    }


# =========================================================
# Review Analytics
# =========================================================

def get_review_analytics(
    start_date=None,
    end_date=None,
):
    queryset = (
        _apply_review_range(
            Review.objects.all(),
            start_date,
            end_date,
        )
    )

    summary = queryset.aggregate(
        total_reviews=Count(
            "id"
        ),

        average_rating=Avg(
            "rating"
        ),

        verified=Count(
            "id",
            filter=Q(
                is_verified_purchase=True
            ),
        ),

        pending=Count(
            "id",
            filter=Q(
                status="pending"
            ),
        ),

        approved=Count(
            "id",
            filter=Q(
                status="approved"
            ),
        ),

        rejected=Count(
            "id",
            filter=Q(
                status="rejected"
            ),
        ),
    )

    total_reviews = int(
        summary["total_reviews"]
        or 0
    )

    rating_counts = {
        row["rating"]:
            int(
                row["count"]
                or 0
            )
        for row in (
            queryset
            .values(
                "rating"
            )
            .annotate(
                count=Count("id")
            )
        )
    }

    rating_breakdown = []

    for rating in range(
        5,
        0,
        -1,
    ):
        count = int(
            rating_counts.get(
                rating,
                0,
            )
        )

        rating_breakdown.append(
            {
                "rating":
                    rating,

                "count":
                    count,

                "percentage":
                    _percentage(
                        count,
                        total_reviews,
                    ),
            }
        )

    return {
        "total_reviews":
            total_reviews,

        "average_rating":
            round(
                float(
                    summary[
                        "average_rating"
                    ]
                    or 0
                ),
                2,
            ),

        "pending_reviews":
            int(
                summary["pending"]
                or 0
            ),

        "approved_reviews":
            int(
                summary["approved"]
                or 0
            ),

        "rejected_reviews":
            int(
                summary["rejected"]
                or 0
            ),

        "verified_purchase_reviews":
            int(
                summary["verified"]
                or 0
            ),

        "rating_breakdown":
            rating_breakdown,
    }


# =========================================================
# Daily Sales Chart
# =========================================================

def get_daily_sales_chart(
    days=30,
):
    today = (
        timezone.localdate()
    )

    days = max(
        int(days),
        1,
    )

    start_day = (
        today
        - timedelta(
            days=days - 1
        )
    )

    rows = (
        _sales_orders()
        .filter(
            placed_at__gte=
                _aware_start(
                    start_day
                ),

            placed_at__lt=
                _aware_end(today),
        )
        .annotate(
            bucket=TruncDate(
                "placed_at"
            )
        )
        .values(
            "bucket"
        )
        .annotate(
            orders=Count(
                "id"
            ),
            revenue=Coalesce(
                Sum(
                    "total_amount"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "bucket"
        )
    )

    data_map = {
        row["bucket"]:
            row
        for row in rows
    }

    result = []

    current_day = (
        start_day
    )

    while (
        current_day
        <= today
    ):
        row = data_map.get(
            current_day,
            {},
        )

        result.append(
            {
                "date":
                    current_day.isoformat(),

                "label":
                    current_day.strftime(
                        "%d %b"
                    ),

                "orders":
                    int(
                        row.get(
                            "orders",
                            0,
                        )
                    ),

                "revenue":
                    _money(
                        row.get(
                            "revenue",
                            0,
                        )
                    ),
            }
        )

        current_day += timedelta(
            days=1
        )

    return result


# =========================================================
# Monthly Sales Chart
# =========================================================

def get_monthly_sales_chart(
    months=12,
):
    today = (
        timezone.localdate()
    )

    months = max(
        int(months),
        1,
    )

    current_month = (
        _month_start(today)
    )

    month_starts = [
        current_month
    ]

    for _ in range(
        months - 1
    ):
        month_starts.append(
            _previous_month_start(
                month_starts[-1]
            )
        )

    month_starts.reverse()

    rows = (
        _sales_orders()
        .filter(
            placed_at__gte=
                _aware_start(
                    month_starts[0]
                )
        )
        .annotate(
            bucket=TruncMonth(
                "placed_at"
            )
        )
        .values(
            "bucket"
        )
        .annotate(
            orders=Count(
                "id"
            ),
            revenue=Coalesce(
                Sum(
                    "total_amount"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "bucket"
        )
    )

    data_map = {
        (
            row["bucket"].year,
            row["bucket"].month,
        ):
            row
        for row in rows
    }

    result = []

    for month_day in month_starts:
        row = data_map.get(
            (
                month_day.year,
                month_day.month,
            ),
            {},
        )

        result.append(
            {
                "date":
                    month_day.isoformat(),

                "label":
                    (
                        f"{month_abbr[month_day.month]} "
                        f"{month_day.year}"
                    ),

                "orders":
                    int(
                        row.get(
                            "orders",
                            0,
                        )
                    ),

                "revenue":
                    _money(
                        row.get(
                            "revenue",
                            0,
                        )
                    ),
            }
        )

    return result


# =========================================================
# Optional Category Analytics
# =========================================================

def get_category_sales(
    limit=10,
):
    rows = (
        OrderItem.objects
        .filter(
            order__status__in=
                SUCCESSFUL_ORDER_STATUSES,
        )
        .values(
            "product__category_id",
            "product__category__name",
        )
        .annotate(
            units_sold=Coalesce(
                Sum("quantity"),
                0,
            ),
            revenue=Coalesce(
                Sum(
                    "total_price"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "-revenue",
            "-units_sold",
        )[:limit]
    )

    return [
        {
            "category_id":
                row[
                    "product__category_id"
                ],

            "category_name":
                (
                    row[
                        "product__category__name"
                    ]
                    or "Uncategorized"
                ),

            "units_sold":
                int(
                    row["units_sold"]
                    or 0
                ),

            "revenue":
                _money(
                    row["revenue"]
                ),
        }
        for row in rows
    ]


# =========================================================
# Optional Brand Analytics
# =========================================================

def get_brand_sales(
    limit=10,
):
    rows = (
        OrderItem.objects
        .filter(
            order__status__in=
                SUCCESSFUL_ORDER_STATUSES,
        )
        .values(
            "product__brand_id",
            "product__brand__name",
        )
        .annotate(
            units_sold=Coalesce(
                Sum("quantity"),
                0,
            ),
            revenue=Coalesce(
                Sum(
                    "total_price"
                ),
                ZERO_MONEY,
            ),
        )
        .order_by(
            "-revenue",
            "-units_sold",
        )[:limit]
    )

    return [
        {
            "brand_id":
                row[
                    "product__brand_id"
                ],

            "brand_name":
                (
                    row[
                        "product__brand__name"
                    ]
                    or "No Brand"
                ),

            "units_sold":
                int(
                    row["units_sold"]
                    or 0
                ),

            "revenue":
                _money(
                    row["revenue"]
                ),
        }
        for row in rows
    ]


# =========================================================
# Dashboard Charts
# =========================================================

def get_dashboard_charts(
    order_data=None,
    payment_data=None,
    include_breakdowns=False,
):
    """
    Main dashboard only needs daily/monthly sales plus
    order/payment distributions.

    Category/brand queries are optional because they are not
    currently rendered by Dashboard.jsx.
    """

    if order_data is None:
        order_data = (
            get_order_analytics()
        )

    if payment_data is None:
        payment_data = (
            get_payment_analytics()
        )

    result = {
        "daily_sales":
            get_daily_sales_chart(),

        "monthly_sales":
            get_monthly_sales_chart(),

        "order_status_distribution":
            order_data[
                "status_counts"
            ],

        "payment_method_distribution":
            payment_data[
                "payment_methods"
            ],
    }

    if include_breakdowns:
        result[
            "category_sales"
        ] = get_category_sales()

        result[
            "brand_sales"
        ] = get_brand_sales()

    return result


# =========================================================
# Recent Activity
# =========================================================

def get_recent_activity(
    limit=10,
):
    """
    Read only.

    IMPORTANT:
    No LowStockAlert synchronization happens here.
    Dashboard GET requests must not perform inventory writes.
    """

    recent_orders = list(
        Order.objects
        .select_related(
            "user"
        )
        .order_by(
            "-placed_at"
        )[:limit]
    )

    recent_payments = list(
        Payment.objects
        .select_related(
            "order"
        )
        .order_by(
            "-created_at"
        )[:limit]
    )

    recent_reviews = list(
        Review.objects
        .select_related(
            "product",
            "user",
        )
        .order_by(
            "-created_at"
        )[:limit]
    )

    alerts = list(
        LowStockAlert.objects
        .filter(
            is_active=True
        )
        .select_related(
            "variant",
            "variant__product",
        )
        .order_by(
            "current_stock",
            "-updated_at",
        )[:limit]
    )

    return {
        "recent_orders":
            [
                {
                    "id":
                        order.id,

                    "order_number":
                        order.order_number,

                    "customer_name":
                        (
                            order.full_name
                            or _display_user_name(
                                order.user
                            )
                        ),

                    "phone":
                        order.phone
                        or "",

                    "status":
                        order.status,

                    "payment_method":
                        order.payment_method,

                    "payment_status":
                        order.payment_status,

                    "total_amount":
                        order.total_amount,

                    "placed_at":
                        order.placed_at,
                }
                for order
                in recent_orders
            ],

        "recent_payments":
            [
                {
                    "id":
                        payment.id,

                    "order_number":
                        payment.order.order_number,

                    "payment_method":
                        payment.payment_method,

                    "status":
                        payment.status,

                    "amount":
                        payment.amount,

                    "transaction_id":
                        payment.transaction_id
                        or "",

                    "created_at":
                        payment.created_at,
                }
                for payment
                in recent_payments
            ],

        "recent_reviews":
            [
                {
                    "id":
                        review.id,

                    "product_id":
                        review.product_id,

                    "product_name":
                        review.product.name,

                    "customer_name":
                        _display_user_name(
                            review.user
                        ),

                    "rating":
                        review.rating,

                    "title":
                        review.title
                        or "",

                    "status":
                        review.status,

                    "is_verified_purchase":
                        review.is_verified_purchase,

                    "created_at":
                        review.created_at,
                }
                for review
                in recent_reviews
            ],

        "low_stock_alerts":
            [
                _stock_item(
                    alert.variant,
                    int(
                        alert.threshold
                        or 0
                    ),
                )
                for alert
                in alerts
            ],
    }


# =========================================================
# Cache Helpers
# =========================================================

def _dashboard_cache_key(
    start_date=None,
    end_date=None,
):
    start_value = (
        start_date.isoformat()
        if start_date
        else "all"
    )

    end_value = (
        end_date.isoformat()
        if end_date
        else "all"
    )

    return (
        "yuvon:"
        "admin_dashboard:"
        f"{start_value}:"
        f"{end_value}"
    )


def clear_dashboard_cache(
    start_date=None,
    end_date=None,
):
    """
    Delete only the requested dashboard cache key.

    This is safer than cache.clear(), which clears unrelated
    caches used elsewhere in the project.
    """

    cache.delete(
        _dashboard_cache_key(
            start_date,
            end_date,
        )
    )


# =========================================================
# Complete Dashboard Payload
# =========================================================

def get_admin_dashboard_data(
    start_date=None,
    end_date=None,
):
    cache_key = (
        _dashboard_cache_key(
            start_date,
            end_date,
        )
    )

    cached_data = (
        cache.get(
            cache_key
        )
    )

    if cached_data is not None:
        return cached_data

    # Calculate once.
    order_data = (
        get_order_analytics(
            start_date,
            end_date,
        )
    )

    payment_data = (
        get_payment_analytics(
            start_date,
            end_date,
        )
    )

    dashboard_data = {
        "overview":
            get_dashboard_overview(
                start_date,
                end_date,
            ),

        "sales":
            get_sales_analytics(),

        "orders":
            order_data,

        "payments":
            payment_data,

        # Main dashboard does not need recent-products and
        # out-of-stock detail lists right now.
        "products":
            get_product_analytics(
                start_date,
                end_date,
                include_recent=False,
            ),

        "customers":
            get_customer_analytics(
                start_date,
                end_date,
            ),

        "coupons":
            get_coupon_analytics(
                start_date,
                end_date,
            ),

        "reviews":
            get_review_analytics(
                start_date,
                end_date,
            ),

        # Do not calculate unused category/brand charts during
        # initial dashboard loading.
        "charts":
            get_dashboard_charts(
                order_data=order_data,
                payment_data=payment_data,
                include_breakdowns=False,
            ),

        "recent_activity":
            get_recent_activity(),

        "generated_at":
            timezone.now(),
    }

    cache.set(
        cache_key,
        dashboard_data,
        DASHBOARD_CACHE_TIMEOUT,
    )

    return dashboard_data