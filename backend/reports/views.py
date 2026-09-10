from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Prefetch
from django.utils.dateparse import parse_date

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem

from .sales_report_export import (
    create_sales_report_response,
)


# =========================================================
# Decimal / GST Constants
# =========================================================

TWOPLACES = Decimal("0.01")

GST_HIGH_RATE_START = Decimal("2500.00")

GST_RATE_LOW = Decimal("5.00")
CGST_RATE_LOW = Decimal("2.50")
SGST_RATE_LOW = Decimal("2.50")

GST_RATE_HIGH = Decimal("18.00")
CGST_RATE_HIGH = Decimal("9.00")
SGST_RATE_HIGH = Decimal("9.00")


# =========================================================
# Money Helper
# =========================================================

def money(value):
    """
    Safely convert value to Decimal with two decimal places.
    """

    if value in (
        None,
        "",
    ):
        value = Decimal(
            "0.00"
        )

    if not isinstance(
        value,
        Decimal,
    ):
        value = Decimal(
            str(value)
        )

    return value.quantize(
        TWOPLACES,
        rounding=ROUND_HALF_UP,
    )


def decimal_string(
    value,
):
    """
    Return Decimal as JSON-friendly string.
    """

    return f"{money(value):.2f}"


# =========================================================
# GST Rate Helper
# =========================================================

def get_gst_rates(
    discounted_unit_price,
):
    """
    GST slab is based on actual discounted
    unit selling price.

    Below Rs. 2500:
        GST 5%
        CGST 2.5%
        SGST 2.5%

    Rs. 2500 and above:
        GST 18%
        CGST 9%
        SGST 9%
    """

    selling_price = money(
        discounted_unit_price
    )

    if (
        selling_price
        >= GST_HIGH_RATE_START
    ):
        return {
            "gst_rate":
                GST_RATE_HIGH,

            "cgst_rate":
                CGST_RATE_HIGH,

            "sgst_rate":
                SGST_RATE_HIGH,
        }

    return {
        "gst_rate":
            GST_RATE_LOW,

        "cgst_rate":
            CGST_RATE_LOW,

        "sgst_rate":
            SGST_RATE_LOW,
    }


# =========================================================
# Item GST Calculation
# =========================================================

def calculate_item_tax(
    item,
):
    """
    Calculate GST on OrderItem.unit_price.

    OrderItem.unit_price is treated as the actual
    discounted/sold unit price.

    GST is therefore NOT calculated on MRP.
    """

    discounted_unit_price = (
        money(
            item.unit_price
        )
    )

    quantity = int(
        item.quantity
        or 0
    )

    taxable_value = money(
        discounted_unit_price
        * quantity
    )

    rates = get_gst_rates(
        discounted_unit_price
    )

    gst_rate = rates[
        "gst_rate"
    ]

    cgst_rate = rates[
        "cgst_rate"
    ]

    sgst_rate = rates[
        "sgst_rate"
    ]

    cgst_amount = money(
        taxable_value
        * cgst_rate
        / Decimal("100")
    )

    sgst_amount = money(
        taxable_value
        * sgst_rate
        / Decimal("100")
    )

    total_gst = money(
        cgst_amount
        + sgst_amount
    )

    value_with_gst = money(
        taxable_value
        + total_gst
    )

    return {
        "discounted_unit_price":
            discounted_unit_price,

        "quantity":
            quantity,

        "taxable_value":
            taxable_value,

        "gst_rate":
            gst_rate,

        "cgst_rate":
            cgst_rate,

        "cgst_amount":
            cgst_amount,

        "sgst_rate":
            sgst_rate,

        "sgst_amount":
            sgst_amount,

        "total_gst":
            total_gst,

        "value_with_gst":
            value_with_gst,
    }


# =========================================================
# Report Filter Validation
# =========================================================

def get_report_filters(
    request,
):
    start_date = (
        request
        .query_params
        .get(
            "start_date"
        )
    )

    end_date = (
        request
        .query_params
        .get(
            "end_date"
        )
    )

    order_status = (
        request
        .query_params
        .get(
            "order_status"
        )
    )

    payment_status = (
        request
        .query_params
        .get(
            "payment_status"
        )
    )

    payment_method = (
        request
        .query_params
        .get(
            "payment_method"
        )
    )

    parsed_start_date = None
    parsed_end_date = None

    if start_date:

        parsed_start_date = (
            parse_date(
                start_date
            )
        )

        if (
            parsed_start_date
            is None
        ):
            return (
                None,
                Response(
                    {
                        "detail":
                            (
                                "Invalid start_date. "
                                "Use YYYY-MM-DD."
                            )
                    },
                    status=(
                        status
                        .HTTP_400_BAD_REQUEST
                    ),
                ),
            )

    if end_date:

        parsed_end_date = (
            parse_date(
                end_date
            )
        )

        if (
            parsed_end_date
            is None
        ):
            return (
                None,
                Response(
                    {
                        "detail":
                            (
                                "Invalid end_date. "
                                "Use YYYY-MM-DD."
                            )
                    },
                    status=(
                        status
                        .HTTP_400_BAD_REQUEST
                    ),
                ),
            )

    if (
        parsed_start_date
        and parsed_end_date
        and parsed_start_date
        > parsed_end_date
    ):
        return (
            None,
            Response(
                {
                    "detail":
                        (
                            "start_date cannot "
                            "be after end_date."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            ),
        )

    return (
        {
            "start_date":
                start_date,

            "end_date":
                end_date,

            "parsed_start_date":
                parsed_start_date,

            "parsed_end_date":
                parsed_end_date,

            "order_status":
                order_status,

            "payment_status":
                payment_status,

            "payment_method":
                payment_method,
        },
        None,
    )


# =========================================================
# Shared Report Queryset
# =========================================================

def get_sales_report_queryset(
    filters,
):
    """
    Build one common queryset for JSON and Excel reports.
    """

    item_queryset = (
        OrderItem.objects
        .select_related(
            "product",
            "variant",
        )
        .order_by(
            "id"
        )
    )

    queryset = (
        Order.objects
        .select_related(
            "user",
            "shipping_address",
        )
        .prefetch_related(
            Prefetch(
                "items",
                queryset=(
                    item_queryset
                ),
            )
        )
        .order_by(
            "-placed_at",
            "-id",
        )
    )

    parsed_start_date = (
        filters[
            "parsed_start_date"
        ]
    )

    parsed_end_date = (
        filters[
            "parsed_end_date"
        ]
    )

    order_status = (
        filters[
            "order_status"
        ]
    )

    payment_status = (
        filters[
            "payment_status"
        ]
    )

    payment_method = (
        filters[
            "payment_method"
        ]
    )

    if parsed_start_date:

        queryset = (
            queryset.filter(
                placed_at__date__gte=(
                    parsed_start_date
                )
            )
        )

    if parsed_end_date:

        queryset = (
            queryset.filter(
                placed_at__date__lte=(
                    parsed_end_date
                )
            )
        )

    if order_status:

        queryset = (
            queryset.filter(
                status=(
                    order_status
                )
            )
        )

    if payment_status:

        queryset = (
            queryset.filter(
                payment_status=(
                    payment_status
                )
            )
        )

    if payment_method:

        queryset = (
            queryset.filter(
                payment_method=(
                    payment_method
                )
            )
        )

    return queryset


# =========================================================
# Admin Sales Report - JSON
# =========================================================

class AdminSalesReportView(
    APIView
):
    """
    GET /api/reports/sales/

    Admin item-level sales and GST report.
    """

    permission_classes = [
        permissions.IsAdminUser,
    ]

    def get(
        self,
        request,
    ):
        (
            filters,
            error_response,
        ) = get_report_filters(
            request
        )

        if error_response:
            return error_response

        queryset = (
            get_sales_report_queryset(
                filters
            )
        )

        rows = []

        order_count = 0
        total_quantity = 0

        total_taxable_value = (
            Decimal("0.00")
        )

        total_cgst = (
            Decimal("0.00")
        )

        total_sgst = (
            Decimal("0.00")
        )

        calculated_total_gst = (
            Decimal("0.00")
        )

        total_value_with_gst = (
            Decimal("0.00")
        )

        total_order_subtotal = (
            Decimal("0.00")
        )

        total_order_discount = (
            Decimal("0.00")
        )

        total_shipping = (
            Decimal("0.00")
        )

        total_stored_tax = (
            Decimal("0.00")
        )

        total_order_amount = (
            Decimal("0.00")
        )

        # =================================================
        # Process Orders
        # =================================================

        for order in queryset:

            order_count += 1

            total_order_subtotal += (
                money(
                    order.subtotal
                )
            )

            total_order_discount += (
                money(
                    order.discount_amount
                )
            )

            total_shipping += (
                money(
                    order.shipping_charge
                )
            )

            total_stored_tax += (
                money(
                    order.tax_amount
                )
            )

            total_order_amount += (
                money(
                    order.total_amount
                )
            )

            for item in (
                order.items.all()
            ):

                tax = (
                    calculate_item_tax(
                        item
                    )
                )

                quantity = tax[
                    "quantity"
                ]

                total_quantity += (
                    quantity
                )

                total_taxable_value += (
                    tax[
                        "taxable_value"
                    ]
                )

                total_cgst += (
                    tax[
                        "cgst_amount"
                    ]
                )

                total_sgst += (
                    tax[
                        "sgst_amount"
                    ]
                )

                calculated_total_gst += (
                    tax[
                        "total_gst"
                    ]
                )

                total_value_with_gst += (
                    tax[
                        "value_with_gst"
                    ]
                )

                # =========================================
                # Current Catalogue Information
                # =========================================

                current_product = (
                    item.product
                )

                current_mrp = None
                current_product_price = None

                if current_product:

                    current_mrp = (
                        current_product
                        .old_price
                    )

                    current_product_price = (
                        current_product
                        .price
                    )

                # =========================================
                # Customer Email
                # =========================================

                customer_email = ""

                if order.user:

                    customer_email = (
                        getattr(
                            order.user,
                            "email",
                            "",
                        )
                        or ""
                    )

                # =========================================
                # Result Row
                # =========================================

                rows.append(
                    {
                        "order_id":
                            order.id,

                        "order_number":
                            order.order_number,

                        "order_date":
                            (
                                order.placed_at
                                .isoformat()
                                if order.placed_at
                                else None
                            ),

                        "order_status":
                            order.status,

                        "customer_name":
                            order.full_name,

                        "customer_email":
                            customer_email,

                        "phone":
                            order.phone,

                        "alternate_phone":
                            order.alternate_phone,

                        "address_line_1":
                            order.address_line_1,

                        "address_line_2":
                            order.address_line_2,

                        "landmark":
                            order.landmark,

                        "city":
                            order.city,

                        "state":
                            order.state,

                        "postal_code":
                            order.postal_code,

                        "country":
                            order.country,

                        "full_address":
                            order.full_address,

                        "product_name":
                            item.product_name,

                        "product_sku":
                            item.product_sku,

                        "variant_sku":
                            item.variant_sku,

                        "color":
                            item.color,

                        "size":
                            item.size,

                        "quantity":
                            quantity,

                        "current_mrp":
                            (
                                decimal_string(
                                    current_mrp
                                )
                                if current_mrp
                                is not None
                                else None
                            ),

                        "current_catalogue_price":
                            (
                                decimal_string(
                                    current_product_price
                                )
                                if current_product_price
                                is not None
                                else None
                            ),

                        "discounted_unit_price":
                            decimal_string(
                                tax[
                                    "discounted_unit_price"
                                ]
                            ),

                        "item_total_after_discount":
                            decimal_string(
                                tax[
                                    "taxable_value"
                                ]
                            ),

                        "taxable_value":
                            decimal_string(
                                tax[
                                    "taxable_value"
                                ]
                            ),

                        "gst_rate":
                            decimal_string(
                                tax[
                                    "gst_rate"
                                ]
                            ),

                        "cgst_rate":
                            decimal_string(
                                tax[
                                    "cgst_rate"
                                ]
                            ),

                        "cgst_amount":
                            decimal_string(
                                tax[
                                    "cgst_amount"
                                ]
                            ),

                        "sgst_rate":
                            decimal_string(
                                tax[
                                    "sgst_rate"
                                ]
                            ),

                        "sgst_amount":
                            decimal_string(
                                tax[
                                    "sgst_amount"
                                ]
                            ),

                        "total_gst":
                            decimal_string(
                                tax[
                                    "total_gst"
                                ]
                            ),

                        "value_with_gst":
                            decimal_string(
                                tax[
                                    "value_with_gst"
                                ]
                            ),

                        "order_subtotal":
                            decimal_string(
                                order.subtotal
                            ),

                        "order_discount":
                            decimal_string(
                                order.discount_amount
                            ),

                        "shipping_charge":
                            decimal_string(
                                order.shipping_charge
                            ),

                        "stored_tax_amount":
                            decimal_string(
                                order.tax_amount
                            ),

                        "order_total":
                            decimal_string(
                                order.total_amount
                            ),

                        "coupon_code":
                            order.coupon_code,

                        "payment_method":
                            order.payment_method,

                        "payment_status":
                            order.payment_status,
                    }
                )

        # =================================================
        # JSON Response
        # =================================================

        return Response(
            {
                "success":
                    True,

                "gst_rule": {
                    "basis":
                        (
                            "GST is calculated on "
                            "discounted actual selling "
                            "price, not MRP."
                        ),

                    "below_2500": {
                        "condition":
                            (
                                "Discounted unit price "
                                "< 2500"
                            ),

                        "gst":
                            "5.00",

                        "cgst":
                            "2.50",

                        "sgst":
                            "2.50",
                    },

                    "2500_and_above": {
                        "condition":
                            (
                                "Discounted unit price "
                                ">= 2500"
                            ),

                        "gst":
                            "18.00",

                        "cgst":
                            "9.00",

                        "sgst":
                            "9.00",
                    },
                },

                "filters": {
                    "start_date":
                        filters[
                            "start_date"
                        ],

                    "end_date":
                        filters[
                            "end_date"
                        ],

                    "order_status":
                        filters[
                            "order_status"
                        ],

                    "payment_status":
                        filters[
                            "payment_status"
                        ],

                    "payment_method":
                        filters[
                            "payment_method"
                        ],
                },

                "summary": {
                    "total_orders":
                        order_count,

                    "total_rows":
                        len(
                            rows
                        ),

                    "total_quantity":
                        total_quantity,

                    "total_taxable_value":
                        decimal_string(
                            total_taxable_value
                        ),

                    "calculated_cgst":
                        decimal_string(
                            total_cgst
                        ),

                    "calculated_sgst":
                        decimal_string(
                            total_sgst
                        ),

                    "calculated_total_gst":
                        decimal_string(
                            calculated_total_gst
                        ),

                    "total_value_with_gst":
                        decimal_string(
                            total_value_with_gst
                        ),

                    "total_order_subtotal":
                        decimal_string(
                            total_order_subtotal
                        ),

                    "total_discount":
                        decimal_string(
                            total_order_discount
                        ),

                    "total_shipping":
                        decimal_string(
                            total_shipping
                        ),

                    "stored_order_tax":
                        decimal_string(
                            total_stored_tax
                        ),

                    "grand_total":
                        decimal_string(
                            total_order_amount
                        ),
                },

                "results":
                    rows,
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )


# =========================================================
# Admin Sales Report - Excel Export
# =========================================================

class AdminSalesReportExportView(
    APIView
):
    """
    Download sales report as Excel.

    Endpoint:

        GET /api/reports/sales/export/

    Same optional filters as JSON report:

        ?start_date=2026-09-01
        ?end_date=2026-09-30
        ?order_status=delivered
        ?payment_status=paid
        ?payment_method=razorpay
    """

    permission_classes = [
        permissions.IsAdminUser,
    ]

    def get(
        self,
        request,
    ):
        (
            filters,
            error_response,
        ) = get_report_filters(
            request
        )

        if error_response:
            return error_response

        queryset = (
            get_sales_report_queryset(
                filters
            )
        )

        # Evaluate while prefetched data is available.
        orders = list(
            queryset
        )

        filename_parts = [
            "yuvon_sales_report"
        ]

        if filters[
            "start_date"
        ]:
            filename_parts.append(
                filters[
                    "start_date"
                ]
            )

        if filters[
            "end_date"
        ]:
            filename_parts.append(
                "to"
            )

            filename_parts.append(
                filters[
                    "end_date"
                ]
            )

        filename = (
            "_".join(
                filename_parts
            )
            + ".xlsx"
        )

        return (
            create_sales_report_response(
                orders=orders,
                filename=filename,
            )
        )