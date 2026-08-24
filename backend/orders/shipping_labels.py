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
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Order


# =========================================================
# Shipping Label Helpers
# =========================================================

LABEL_WIDTH = 4 * inch
LABEL_HEIGHT = 6 * inch


def safe_text(value, fallback="-"):
    """
    Convert nullable values into printable strings.
    """
    value = str(value or "").strip()

    return value or fallback


def format_money(value):
    """
    Format amount as INR text for PDF label.
    """
    try:
        return f"Rs. {float(value or 0):,.2f}"
    except (TypeError, ValueError):
        return "Rs. 0.00"


def format_datetime(value):
    """
    Convert Django datetime into readable local time.
    """
    if not value:
        return "-"

    try:
        local_value = timezone.localtime(value)

        return local_value.strftime(
            "%d %b %Y, %I:%M %p"
        )

    except Exception:
        return safe_text(value)


def get_shipping_address(order):
    """
    Build shipping address using order snapshot fields.

    Snapshot fields are preferred because they preserve
    exactly what the customer entered during checkout.
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
        if value
        and str(value).strip()
    )


def get_barcode_value(order):
    """
    Prefer tracking ID for the shipping barcode.

    If tracking ID is not available yet, use order number.
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


def get_payment_label(order):
    """
    Return customer-facing payment type.
    """
    if order.payment_method == "cod":
        return "COD"

    return "PREPAID"


# =========================================================
# Admin Shipping Label PDF
# =========================================================

class AdminShippingLabelView(APIView):
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

        document = SimpleDocTemplate(
            buffer,
            pagesize=(
                LABEL_WIDTH,
                LABEL_HEIGHT,
            ),
            rightMargin=7 * mm,
            leftMargin=7 * mm,
            topMargin=6 * mm,
            bottomMargin=6 * mm,
            title=(
                f"Shipping Label "
                f"{order.order_number}"
            ),
            author="Yuvon Design Hub",
        )

        # -------------------------------------------------
        # Styles
        # -------------------------------------------------

        brand_style = ParagraphStyle(
            name="ShippingLabelBrand",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=18,
            alignment=1,
            spaceAfter=2,
        )

        subtitle_style = ParagraphStyle(
            name="ShippingLabelSubtitle",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            alignment=1,
        )

        normal_style = ParagraphStyle(
            name="ShippingLabelNormal",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
        )

        small_style = ParagraphStyle(
            name="ShippingLabelSmall",
            fontName="Helvetica",
            fontSize=7,
            leading=9,
        )

        strong_style = ParagraphStyle(
            name="ShippingLabelStrong",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
        )

        payment_style = ParagraphStyle(
            name="ShippingLabelPayment",
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=17,
            alignment=1,
        )

        address_style = ParagraphStyle(
            name="ShippingLabelAddress",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
        )

        # -------------------------------------------------
        # Basic Data
        # -------------------------------------------------

        shipping_address = (
            get_shipping_address(
                order
            )
            or "Shipping address unavailable"
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

        total_items = sum(
            int(item.quantity or 0)
            for item in order.items.all()
        )

        # -------------------------------------------------
        # Story
        # -------------------------------------------------

        story = []

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
                3 * mm,
            )
        )

        # -------------------------------------------------
        # Order / Payment Header
        # -------------------------------------------------

        payment_text = payment_label

        if order.payment_method == "cod":
            payment_text = (
                f"COD - COLLECT "
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
                            "<b>Order Date:</b><br/>"
                            f"{format_datetime(order.placed_at)}"
                        ),
                        small_style,
                    ),
                    Paragraph(
                        (
                            "<b>Status:</b><br/>"
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
                        1,
                        colors.black,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
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
                        5,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
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
                3 * mm,
            )
        )

        # -------------------------------------------------
        # Ship To
        # -------------------------------------------------

        ship_to_content = [
            Paragraph(
                "SHIP TO",
                strong_style,
            ),
            Spacer(
                1,
                1 * mm,
            ),
            Paragraph(
                safe_text(
                    order.full_name
                ),
                address_style,
            ),
            Paragraph(
                shipping_address,
                normal_style,
            ),
            Spacer(
                1,
                1.5 * mm,
            ),
            Paragraph(
                (
                    "<b>Phone:</b> "
                    f"{safe_text(order.phone)}"
                ),
                normal_style,
            ),
        ]

        if order.alternate_phone:
            ship_to_content.append(
                Paragraph(
                    (
                        "<b>Alternate:</b> "
                        f"{safe_text(order.alternate_phone)}"
                    ),
                    normal_style,
                )
            )

        ship_to_table = Table(
            [
                [
                    KeepTogether(
                        ship_to_content
                    )
                ]
            ],
            colWidths=[
                94 * mm,
            ],
        )

        ship_to_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        1,
                        colors.black,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
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
                3 * mm,
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
                            "<b>Estimated Delivery</b><br/>"
                            f"{safe_text(order.estimated_delivery)}"
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
                        1,
                        colors.black,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
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
                        5,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
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
                4 * mm,
            )
        )

        # -------------------------------------------------
        # Barcode
        # -------------------------------------------------

        barcode = code128.Code128(
            barcode_value,
            barHeight=15 * mm,
            barWidth=0.45,
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
                        1,
                        colors.black,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        5,
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
                3 * mm,
            )
        )

        # -------------------------------------------------
        # Product Summary
        # -------------------------------------------------

        item_rows = [
            [
                Paragraph(
                    "<b>Item</b>",
                    small_style,
                ),
                Paragraph(
                    "<b>Qty</b>",
                    small_style,
                ),
            ]
        ]

        for item in order.items.all():
            product_name = safe_text(
                item.product_name
            )

            variant_parts = [
                item.color,
                item.size,
            ]

            variant_text = " / ".join(
                str(value)
                for value in variant_parts
                if value
            )

            if variant_text:
                product_name = (
                    f"{product_name}"
                    f"<br/><font size='6'>"
                    f"{variant_text}"
                    f"</font>"
                )

            item_rows.append(
                [
                    Paragraph(
                        product_name,
                        small_style,
                    ),
                    Paragraph(
                        str(
                            item.quantity
                            or 0
                        ),
                        small_style,
                    ),
                ]
            )

        items_table = Table(
            item_rows,
            colWidths=[
                82 * mm,
                12 * mm,
            ],
        )

        items_table.setStyle(
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
                        0.3,
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
            items_table
        )

        # -------------------------------------------------
        # Build PDF
        # -------------------------------------------------

        document.build(
            story
        )

        pdf_value = (
            buffer.getvalue()
        )

        buffer.close()

        response = HttpResponse(
            pdf_value,
            content_type="application/pdf",
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; filename='
            f'"shipping-label-{order.order_number}.pdf"'
        )

        response[
            "Content-Length"
        ] = len(
            pdf_value
        )

        return response