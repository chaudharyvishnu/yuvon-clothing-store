from io import BytesIO

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import permissions
from rest_framework.views import APIView

from reportlab.graphics.barcode import code128
from reportlab.lib import colors
from reportlab.lib.pagesizes import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Order


# =========================================================
# Shipping Label Configuration
# =========================================================

LABEL_WIDTH = 4 * inch
LABEL_HEIGHT = 6 * inch


# =========================================================
# Shipping Label Helpers
# =========================================================

def safe_text(
    value,
    fallback="-",
):
    """
    Convert nullable values into printable strings.
    """

    value = str(
        value or ""
    ).strip()

    return (
        value
        or fallback
    )


def format_money(
    value,
):
    """
    Format amount as INR text for PDF label.
    """

    try:
        return (
            f"Rs. "
            f"{float(value or 0):,.2f}"
        )

    except (
        TypeError,
        ValueError,
    ):
        return "Rs. 0.00"


def format_datetime(
    value,
):
    """
    Convert Django datetime into readable local time.
    """

    if not value:
        return "-"

    try:
        local_value = (
            timezone.localtime(
                value
            )
        )

        return local_value.strftime(
            "%d %b %Y, %I:%M %p"
        )

    except Exception:
        return safe_text(
            value
        )


def format_date(
    value,
):
    """
    Format date/date-like values for label display.
    """

    if not value:
        return "-"

    try:
        return value.strftime(
            "%d %b %Y"
        )

    except Exception:
        return safe_text(
            value
        )


def get_shipping_address(
    order,
):
    """
    Build shipping address using order snapshot fields.

    Snapshot fields preserve exactly what customer
    entered during checkout.
    """

    address_parts = [
        order.address_line_1,
        order.address_line_2,
        order.landmark,
        order.city,
        order.state,
        order.postal_code,
        order.country,
    ]

    return ", ".join(
        str(value).strip()
        for value in address_parts
        if (
            value
            and str(value).strip()
        )
    )


def get_barcode_value(
    order,
):
    """
    Prefer tracking ID for barcode.

    If tracking ID is unavailable, fall back
    to order number.
    """

    tracking_id = safe_text(
        order.tracking_id,
        fallback="",
    )

    if tracking_id:
        return tracking_id

    return safe_text(
        order.order_number
    )


def get_payment_label(
    order,
):
    """
    Return customer-facing payment type.
    """

    if (
        order.payment_method
        == "cod"
    ):
        return "COD"

    return "PREPAID"


# =========================================================
# Admin Shipping Label PDF
# =========================================================

class AdminShippingLabelView(
    APIView
):
    """
    GET /api/orders/admin/orders/<order_number>/shipping-label/

    Generates a printable 4 x 6 inch PDF shipping label.

    Admin only.
    """

    permission_classes = [
        permissions.IsAdminUser,
    ]

    def get(
        self,
        request,
        order_number,
    ):
        order = get_object_or_404(
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items",
                "items__product",
                "items__variant",
            ),
            order_number=order_number,
        )

        buffer = BytesIO()

        # =================================================
        # PDF Document
        # =================================================

        document = SimpleDocTemplate(
            buffer,
            pagesize=(
                LABEL_WIDTH,
                LABEL_HEIGHT,
            ),
            rightMargin=5 * mm,
            leftMargin=5 * mm,
            topMargin=4 * mm,
            bottomMargin=4 * mm,
            title=(
                f"Shipping Label "
                f"{order.order_number}"
            ),
            author=(
                "Yuvon Design Hub"
            ),
        )

        # =================================================
        # Styles
        # =================================================

        brand_style = ParagraphStyle(
            name="ShippingLabelBrand",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=15,
            alignment=1,
            spaceAfter=1,
        )

        subtitle_style = ParagraphStyle(
            name="ShippingLabelSubtitle",
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=8,
            alignment=1,
        )

        normal_style = ParagraphStyle(
            name="ShippingLabelNormal",
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
        )

        small_style = ParagraphStyle(
            name="ShippingLabelSmall",
            fontName="Helvetica",
            fontSize=6.5,
            leading=8,
        )

        strong_style = ParagraphStyle(
            name="ShippingLabelStrong",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=9,
        )

        payment_style = ParagraphStyle(
            name="ShippingLabelPayment",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=12,
            alignment=1,
        )

        address_name_style = ParagraphStyle(
            name="ShippingLabelAddressName",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=10,
        )

        address_style = ParagraphStyle(
            name="ShippingLabelAddress",
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
        )

        item_style = ParagraphStyle(
            name="ShippingLabelItem",
            fontName="Helvetica",
            fontSize=6,
            leading=7,
        )

        item_header_style = ParagraphStyle(
            name="ShippingLabelItemHeader",
            fontName="Helvetica-Bold",
            fontSize=6,
            leading=7,
        )

        # =================================================
        # Basic Data
        # =================================================

        shipping_address = (
            get_shipping_address(
                order
            )
            or (
                "Shipping address "
                "unavailable"
            )
        )

        payment_label = (
            get_payment_label(
                order
            )
        )

        barcode_value = (
            get_barcode_value(
                order
            )
        )

        order_items = list(
            order.items.all()
        )

        total_items = sum(
            int(
                item.quantity
                or 0
            )
            for item in order_items
        )

        # =================================================
        # Story
        # =================================================

        story = []

        # -------------------------------------------------
        # Brand
        # -------------------------------------------------

        story.append(
            Paragraph(
                "YUVON DESIGN HUB",
                brand_style,
            )
        )

        story.append(
            Paragraph(
                "SHIPPING LABEL",
                subtitle_style,
            )
        )

        story.append(
            Spacer(
                1,
                1.5 * mm,
            )
        )

        # -------------------------------------------------
        # Order / Payment Header
        # -------------------------------------------------

        payment_text = (
            payment_label
        )

        if (
            order.payment_method
            == "cod"
        ):
            payment_text = (
                "COD - COLLECT "
                f"{format_money(order.total_amount)}"
            )

        order_header = Table(
            [
                [
                    Paragraph(
                        (
                            "<b>Order:</b><br/>"
                            f"{safe_text(order.order_number)}"
                        ),
                        normal_style,
                    ),
                    Paragraph(
                        payment_text,
                        payment_style,
                    ),
                ],
                [
                    Paragraph(
                        (
                            "<b>Order Date:</b> "
                            f"{format_datetime(order.placed_at)}"
                        ),
                        small_style,
                    ),
                    Paragraph(
                        (
                            "<b>Status:</b> "
                            f"{safe_text(order.status).replace('_', ' ').title()}"
                        ),
                        small_style,
                    ),
                ],
            ],
            colWidths=[
                47 * mm,
                47 * mm,
            ],
        )

        order_header.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.8,
                        colors.black,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.35,
                        colors.black,
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                ]
            )
        )

        story.append(
            order_header
        )

        story.append(
            Spacer(
                1,
                1.5 * mm,
            )
        )

        # -------------------------------------------------
        # Ship To
        # -------------------------------------------------

        ship_to_rows = [
            [
                Paragraph(
                    "SHIP TO",
                    strong_style,
                )
            ],
            [
                Paragraph(
                    safe_text(
                        order.full_name
                    ),
                    address_name_style,
                )
            ],
            [
                Paragraph(
                    shipping_address,
                    address_style,
                )
            ],
            [
                Paragraph(
                    (
                        "<b>Phone:</b> "
                        f"{safe_text(order.phone)}"
                    ),
                    normal_style,
                )
            ],
        ]

        if (
            order.alternate_phone
        ):
            ship_to_rows.append(
                [
                    Paragraph(
                        (
                            "<b>Alternate:</b> "
                            f"{safe_text(order.alternate_phone)}"
                        ),
                        small_style,
                    )
                ]
            )

        ship_to_table = Table(
            ship_to_rows,
            colWidths=[
                94 * mm,
            ],
            splitByRow=1,
        )

        ship_to_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.8,
                        colors.black,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                ]
            )
        )

        story.append(
            ship_to_table
        )

        story.append(
            Spacer(
                1,
                1.5 * mm,
            )
        )

        # -------------------------------------------------
        # Courier / Tracking
        # -------------------------------------------------

        courier_table = Table(
            [
                [
                    Paragraph(
                        (
                            "<b>Courier</b><br/>"
                            f"{safe_text(order.courier_name)}"
                        ),
                        normal_style,
                    ),
                    Paragraph(
                        (
                            "<b>Tracking ID</b><br/>"
                            f"{safe_text(order.tracking_id)}"
                        ),
                        normal_style,
                    ),
                ],
                [
                    Paragraph(
                        (
                            "<b>Est. Delivery</b><br/>"
                            f"{format_date(order.estimated_delivery)}"
                        ),
                        small_style,
                    ),
                    Paragraph(
                        (
                            "<b>Total Items</b><br/>"
                            f"{total_items}"
                        ),
                        small_style,
                    ),
                ],
            ],
            colWidths=[
                47 * mm,
                47 * mm,
            ],
        )

        courier_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.8,
                        colors.black,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.35,
                        colors.black,
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        3,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                ]
            )
        )

        story.append(
            courier_table
        )

        story.append(
            Spacer(
                1,
                1.5 * mm,
            )
        )

        # -------------------------------------------------
        # Barcode
        # -------------------------------------------------

        barcode = code128.Code128(
            barcode_value,
            barHeight=11 * mm,
            barWidth=0.38,
            humanReadable=True,
        )

        barcode_table = Table(
            [
                [
                    barcode,
                ]
            ],
            colWidths=[
                94 * mm,
            ],
        )

        barcode_table.setStyle(
            TableStyle(
                [
                    (
                        "ALIGN",
                        (0, 0),
                        (-1, -1),
                        "CENTER",
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.8,
                        colors.black,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                ]
            )
        )

        story.append(
            barcode_table
        )

        story.append(
            Spacer(
                1,
                1.5 * mm,
            )
        )

        # -------------------------------------------------
        # Product Summary
        # -------------------------------------------------

        item_rows = [
            [
                Paragraph(
                    "<b>Item</b>",
                    item_header_style,
                ),
                Paragraph(
                    "<b>Qty</b>",
                    item_header_style,
                ),
            ]
        ]

        for item in order_items:
            product_name = safe_text(
                item.product_name
            )

            variant_parts = [
                item.color,
                item.size,
            ]

            variant_text = (
                " / ".join(
                    str(value)
                    for value in variant_parts
                    if value
                )
            )

            if variant_text:
                product_name = (
                    f"{product_name}"
                    f"<br/>"
                    f"<font size='5'>"
                    f"{variant_text}"
                    f"</font>"
                )

            item_rows.append(
                [
                    Paragraph(
                        product_name,
                        item_style,
                    ),
                    Paragraph(
                        str(
                            item.quantity
                            or 0
                        ),
                        item_style,
                    ),
                ]
            )

        items_table = Table(
            item_rows,
            colWidths=[
                82 * mm,
                12 * mm,
            ],
            repeatRows=1,
            splitByRow=1,
        )

        items_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.7,
                        colors.black,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.25,
                        colors.black,
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "ALIGN",
                        (1, 0),
                        (1, -1),
                        "CENTER",
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                ]
            )
        )

        story.append(
            items_table
        )

        # =================================================
        # Build PDF
        # =================================================

        document.build(
            story
        )

        pdf_value = (
            buffer.getvalue()
        )

        buffer.close()

        # =================================================
        # HTTP Response
        # =================================================

        response = HttpResponse(
            pdf_value,
            content_type=(
                "application/pdf"
            ),
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; filename='
            f'"shipping-label-'
            f'{order.order_number}.pdf"'
        )

        response[
            "Content-Length"
        ] = len(
            pdf_value
        )

        return response