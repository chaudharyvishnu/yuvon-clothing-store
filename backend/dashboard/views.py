from datetime import datetime

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AdminDashboardSerializer,
    CouponAnalyticsSerializer,
    CustomerAnalyticsSerializer,
    DashboardChartsSerializer,
    DashboardOverviewSerializer,
    OrderAnalyticsSerializer,
    PaymentAnalyticsSerializer,
    ProductAnalyticsSerializer,
    RecentActivitySerializer,
    ReviewAnalyticsSerializer,
    SalesAnalyticsSerializer,
)

from .services import (
    get_admin_dashboard_data,
    get_coupon_analytics,
    get_customer_analytics,
    get_dashboard_charts,
    get_dashboard_overview,
    get_order_analytics,
    get_payment_analytics,
    get_product_analytics,
    get_recent_activity,
    get_review_analytics,
    get_sales_analytics,
)


# =========================================================
# Helpers
# =========================================================

def parse_date_param(
    value,
    field_name,
):
    """
    Parse YYYY-MM-DD query parameter.

    Returns:
        date | None

    Raises:
        ValueError if invalid.
    """

    if value in (
        None,
        "",
    ):
        return None

    try:
        return datetime.strptime(
            str(value).strip(),
            "%Y-%m-%d",
        ).date()

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"{field_name} must be in YYYY-MM-DD format."
        ) from exc


def get_date_range(request):
    """
    Supported query params:

    ?start_date=2026-08-01
    ?end_date=2026-08-31
    """

    start_date = parse_date_param(
        request.query_params.get(
            "start_date"
        ),
        "start_date",
    )

    end_date = parse_date_param(
        request.query_params.get(
            "end_date"
        ),
        "end_date",
    )

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise ValueError(
            "start_date cannot be after end_date."
        )

    return (
        start_date,
        end_date,
    )


# =========================================================
# Base View
# =========================================================

class AdminDashboardBaseView(
    APIView
):
    """
    Base class for all admin dashboard endpoints.
    """

    permission_classes = [
        permissions.IsAdminUser,
    ]

    def get_date_range_or_response(
        self,
        request,
    ):
        try:
            return get_date_range(
                request
            )

        except ValueError as error:
            return Response(
                {
                    "detail": str(
                        error
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


# =========================================================
# Fast Dashboard Summary
# =========================================================

class DashboardSummaryView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/summary/

    Fast initial dashboard payload.

    Returns only:
    - overview
    - sales
    - orders
    - payments

    This endpoint should be used when the admin dashboard
    first opens.
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        overview_data = (
            get_dashboard_overview(
                start_date=start_date,
                end_date=end_date,
            )
        )

        sales_data = (
            get_sales_analytics()
        )

        order_data = (
            get_order_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        payment_data = (
            get_payment_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        return Response(
            {
                "overview":
                    DashboardOverviewSerializer(
                        overview_data
                    ).data,

                "sales":
                    SalesAnalyticsSerializer(
                        sales_data
                    ).data,

                "orders":
                    OrderAnalyticsSerializer(
                        order_data
                    ).data,

                "payments":
                    PaymentAnalyticsSerializer(
                        payment_data
                    ).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Dashboard Details
# =========================================================

class DashboardDetailsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/details/

    Secondary/background dashboard payload.

    Returns:
    - products
    - customers
    - coupons
    - reviews
    - charts
    - recent activity

    The frontend should request this after the fast summary
    has already rendered.
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        products_data = (
            get_product_analytics(
                start_date=start_date,
                end_date=end_date,
                include_recent=False,
            )
        )

        customers_data = (
            get_customer_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        coupons_data = (
            get_coupon_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        reviews_data = (
            get_review_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        #/*
        #Important:

        #get_dashboard_charts() currently calculates its own
        #order/payment distributions if they are not supplied.

        #For the details request this is acceptable, but later
        #we can create a chart-only lightweight service if
        #required.
        #*/

        charts_data = (
            get_dashboard_charts(
                include_breakdowns=False,
            )
        )

        recent_activity_data = (
            get_recent_activity(
                limit=10,
            )
        )

        return Response(
            {
                "products":
                    ProductAnalyticsSerializer(
                        products_data
                    ).data,

                "customers":
                    CustomerAnalyticsSerializer(
                        customers_data
                    ).data,

                "coupons":
                    CouponAnalyticsSerializer(
                        coupons_data
                    ).data,

                "reviews":
                    ReviewAnalyticsSerializer(
                        reviews_data
                    ).data,

                "charts":
                    DashboardChartsSerializer(
                        charts_data
                    ).data,

                "recent_activity":
                    RecentActivitySerializer(
                        recent_activity_data
                    ).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Complete Dashboard
# =========================================================

class AdminDashboardView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/

    Existing complete dashboard endpoint.

    Kept for backward compatibility.

    New frontend implementation should prefer:

        /api/dashboard/summary/
        /api/dashboard/details/

    because those allow progressive dashboard rendering.
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_admin_dashboard_data(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            AdminDashboardSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Overview
# =========================================================

class DashboardOverviewView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/overview/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_dashboard_overview(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            DashboardOverviewSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Sales
# =========================================================

class DashboardSalesView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/sales/
    """

    def get(
        self,
        request,
    ):
        data = (
            get_sales_analytics()
        )

        serializer = (
            SalesAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Orders
# =========================================================

class DashboardOrdersView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/orders/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_order_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            OrderAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Payments
# =========================================================

class DashboardPaymentsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/payments/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_payment_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            PaymentAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Products / Inventory
# =========================================================

class DashboardProductsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/products/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_product_analytics(
                start_date=start_date,
                end_date=end_date,
                include_recent=True,
            )
        )

        serializer = (
            ProductAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Customers
# =========================================================

class DashboardCustomersView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/customers/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_customer_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            CustomerAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Coupons
# =========================================================

class DashboardCouponsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/coupons/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_coupon_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            CouponAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Reviews
# =========================================================

class DashboardReviewsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/reviews/
    """

    def get(
        self,
        request,
    ):
        date_range = (
            self.get_date_range_or_response(
                request
            )
        )

        if isinstance(
            date_range,
            Response,
        ):
            return date_range

        (
            start_date,
            end_date,
        ) = date_range

        data = (
            get_review_analytics(
                start_date=start_date,
                end_date=end_date,
            )
        )

        serializer = (
            ReviewAnalyticsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Charts
# =========================================================

class DashboardChartsView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/charts/

    Optional:

        ?breakdowns=true

    If breakdowns are enabled, category and brand analytics
    are also calculated.
    """

    def get(
        self,
        request,
    ):
        raw_breakdowns = (
            request.query_params.get(
                "breakdowns",
                "",
            )
        )

        include_breakdowns = (
            str(
                raw_breakdowns
            )
            .strip()
            .lower()
            in {
                "1",
                "true",
                "yes",
                "on",
            }
        )

        data = (
            get_dashboard_charts(
                include_breakdowns=(
                    include_breakdowns
                ),
            )
        )

        serializer = (
            DashboardChartsSerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Recent Activity
# =========================================================

class DashboardRecentActivityView(
    AdminDashboardBaseView
):
    """
    GET /api/dashboard/recent-activity/

    Optional:
        ?limit=10
    """

    default_limit = 10
    max_limit = 50

    def get_limit(
        self,
        request,
    ):
        raw_limit = (
            request.query_params.get(
                "limit",
                self.default_limit,
            )
        )

        try:
            limit = int(
                raw_limit
            )

        except (
            TypeError,
            ValueError,
        ) as exc:
            raise ValueError(
                "limit must be a valid integer."
            ) from exc

        if limit < 1:
            raise ValueError(
                "limit must be at least 1."
            )

        return min(
            limit,
            self.max_limit,
        )

    def get(
        self,
        request,
    ):
        try:
            limit = (
                self.get_limit(
                    request
                )
            )

        except ValueError as error:
            return Response(
                {
                    "detail": str(
                        error
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        data = (
            get_recent_activity(
                limit=limit,
            )
        )

        serializer = (
            RecentActivitySerializer(
                data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )