"""
Reusable email helpers for the orders app.
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string
from django.utils import timezone


logger = logging.getLogger(__name__)


# =========================================================
# Generic Helpers
# =========================================================

def _get_customer_email(order):
    """
    Return the best available customer email address.
    """
    order_email = str(
        getattr(order, "email", "") or ""
    ).strip()

    if order_email:
        return order_email

    user = getattr(order, "user", None)

    if user:
        return str(
            getattr(user, "email", "") or ""
        ).strip()

    return ""


def _get_customer_name(order):
    """
    Return the best available customer name.
    """
    full_name = str(
        getattr(order, "full_name", "") or ""
    ).strip()

    if full_name:
        return full_name

    user = getattr(order, "user", None)

    if user and hasattr(user, "get_full_name"):
        user_name = str(
            user.get_full_name() or ""
        ).strip()

        if user_name:
            return user_name

    return "Customer"


def _format_currency(value):
    """
    Format a numeric value as Indian rupees.
    """
    try:
        amount = Decimal(str(value or 0))
    except Exception:
        amount = Decimal("0.00")

    return f"Rs. {amount:,.2f}"


def _format_datetime(value):
    """
    Format a timezone-aware datetime for India.
    """
    if not value:
        return "-"

    try:
        value = timezone.localtime(value)
    except Exception:
        pass

    try:
        return value.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return str(value)


def _build_order_context(order):
    """
    Build a common context dictionary for order emails.
    """
    items = list(
        order.items.all()
    ) if hasattr(order, "items") else []

    return {
        "order": order,
        "items": items,
        "customer_name": _get_customer_name(order),
        "customer_email": _get_customer_email(order),
        "order_number": getattr(
            order,
            "order_number",
            "",
        ),
        "order_status": str(
            getattr(order, "status", "") or ""
        ).replace("_", " ").title(),
        "payment_status": str(
            getattr(order, "payment_status", "") or ""
        ).replace("_", " ").title(),
        "payment_method": str(
            getattr(order, "payment_method", "") or ""
        ).replace("_", " ").upper(),
        "subtotal": _format_currency(
            getattr(order, "subtotal", 0)
        ),
        "discount_amount": _format_currency(
            getattr(order, "discount_amount", 0)
        ),
        "shipping_charge": _format_currency(
            getattr(order, "shipping_charge", 0)
        ),
        "tax_amount": _format_currency(
            getattr(order, "tax_amount", 0)
        ),
        "total_amount": _format_currency(
            getattr(order, "total_amount", 0)
        ),
        "placed_at": _format_datetime(
            getattr(order, "placed_at", None)
        ),
        "estimated_delivery": getattr(
            order,
            "estimated_delivery",
            None,
        ),
        "courier_name": getattr(
            order,
            "courier_name",
            "",
        ),
        "tracking_id": getattr(
            order,
            "tracking_id",
            "",
        ),
        "frontend_url": getattr(
            settings,
            "FRONTEND_URL",
            "",
        ),
        "site_name": "Yuvon",
    }


def _render_email_template(template_name, context):
    """
    Render an HTML template if it exists.

    Returns an empty string until templates are added.
    """
    try:
        return render_to_string(
            template_name,
            context,
        )
    except TemplateDoesNotExist:
        logger.warning(
            "Email template not found: %s",
            template_name,
        )
        return ""


def _send_email(
    *,
    subject,
    recipient_list,
    text_body,
    html_body="",
    reply_to=None,
):
    """
    Send a multipart text/HTML email.
    """
    recipients = [
        str(email).strip()
        for email in recipient_list
        if str(email).strip()
    ]

    if not recipients:
        logger.info(
            "Email skipped because recipient list is empty. Subject: %s",
            subject,
        )
        return False

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            None,
        ),
        to=recipients,
        reply_to=reply_to or None,
    )

    if html_body:
        message.attach_alternative(
            html_body,
            "text/html",
        )

    try:
        message.send(
            fail_silently=False,
        )
        return True

    except Exception:
        logger.exception(
            "Unable to send email. Subject: %s, recipients: %s",
            subject,
            recipients,
        )
        return False


# =========================================================
# Plain-Text Email Bodies
# =========================================================

def _order_confirmation_text(context):
    return (
        f"Hello {context['customer_name']},\n\n"
        "Thank you for shopping with Yuvon. "
        "Your order has been placed successfully.\n\n"
        f"Order number: {context['order_number']}\n"
        f"Order status: {context['order_status']}\n"
        f"Payment method: {context['payment_method']}\n"
        f"Payment status: {context['payment_status']}\n"
        f"Total amount: {context['total_amount']}\n"
        f"Placed at: {context['placed_at']}\n\n"
        "We will notify you when your order status changes.\n\n"
        "Regards,\n"
        "Yuvon Team"
    )


def _admin_new_order_text(context):
    return (
        "A new order has been placed.\n\n"
        f"Order number: {context['order_number']}\n"
        f"Customer: {context['customer_name']}\n"
        f"Customer email: {context['customer_email'] or '-'}\n"
        f"Phone: {getattr(context['order'], 'phone', '') or '-'}\n"
        f"Payment method: {context['payment_method']}\n"
        f"Payment status: {context['payment_status']}\n"
        f"Order total: {context['total_amount']}\n"
        f"Placed at: {context['placed_at']}\n\n"
        "Please review the order in the admin dashboard."
    )


def _order_status_text(context):
    shipping_details = ""

    if context["courier_name"]:
        shipping_details += (
            f"Courier: {context['courier_name']}\n"
        )

    if context["tracking_id"]:
        shipping_details += (
            f"Tracking ID: {context['tracking_id']}\n"
        )

    if context["estimated_delivery"]:
        shipping_details += (
            "Estimated delivery: "
            f"{context['estimated_delivery']}\n"
        )

    return (
        f"Hello {context['customer_name']},\n\n"
        f"The status of your order "
        f"{context['order_number']} has been updated.\n\n"
        f"Current status: {context['order_status']}\n"
        f"{shipping_details}"
        f"Payment status: {context['payment_status']}\n"
        f"Order total: {context['total_amount']}\n\n"
        "Regards,\n"
        "Yuvon Team"
    )


def _payment_success_text(context):
    return (
        f"Hello {context['customer_name']},\n\n"
        "Your payment has been received successfully.\n\n"
        f"Order number: {context['order_number']}\n"
        f"Payment method: {context['payment_method']}\n"
        f"Payment status: {context['payment_status']}\n"
        f"Amount paid: {context['total_amount']}\n\n"
        "Thank you for shopping with Yuvon.\n\n"
        "Regards,\n"
        "Yuvon Team"
    )


# =========================================================
# Public Email Functions
# =========================================================

def send_order_confirmation_email(order):
    """
    Send an order confirmation email to the customer.
    """
    customer_email = _get_customer_email(order)

    if not customer_email:
        logger.info(
            "Order confirmation email skipped for %s: "
            "customer email is unavailable.",
            getattr(order, "order_number", ""),
        )
        return False

    context = _build_order_context(order)

    return _send_email(
        subject=(
            f"Order Confirmed - "
            f"{context['order_number']} | Yuvon"
        ),
        recipient_list=[
            customer_email,
        ],
        text_body=_order_confirmation_text(
            context
        ),
        html_body=_render_email_template(
            "emails/orders/order_confirmation.html",
            context,
        ),
    )


def send_admin_order_notification(order):
    """
    Notify configured admins when a new order is placed.
    """
    admin_emails = list(
        getattr(
            settings,
            "ADMIN_EMAILS",
            [],
        )
    )

    notification_email = str(
        getattr(
            settings,
            "ORDER_NOTIFICATION_EMAIL",
            "",
        ) or ""
    ).strip()

    if (
        notification_email
        and notification_email not in admin_emails
    ):
        admin_emails.append(
            notification_email
        )

    context = _build_order_context(order)

    return _send_email(
        subject=(
            f"New Order Received - "
            f"{context['order_number']}"
        ),
        recipient_list=admin_emails,
        text_body=_admin_new_order_text(
            context
        ),
        html_body=_render_email_template(
            "emails/orders/admin_new_order.html",
            context,
        ),
        reply_to=(
            [context["customer_email"]]
            if context["customer_email"]
            else None
        ),
    )


def send_order_status_email(order):
    """
    Notify the customer when the order status changes.
    """
    customer_email = _get_customer_email(order)

    if not customer_email:
        logger.info(
            "Order status email skipped for %s: "
            "customer email is unavailable.",
            getattr(order, "order_number", ""),
        )
        return False

    context = _build_order_context(order)

    return _send_email(
        subject=(
            f"Order {context['order_status']} - "
            f"{context['order_number']} | Yuvon"
        ),
        recipient_list=[
            customer_email,
        ],
        text_body=_order_status_text(
            context
        ),
        html_body=_render_email_template(
            "emails/orders/order_status_update.html",
            context,
        ),
    )


def send_payment_success_email(order):
    """
    Send payment confirmation to the customer.
    """
    customer_email = _get_customer_email(order)

    if not customer_email:
        logger.info(
            "Payment success email skipped for %s: "
            "customer email is unavailable.",
            getattr(order, "order_number", ""),
        )
        return False

    context = _build_order_context(order)

    return _send_email(
        subject=(
            f"Payment Received - "
            f"{context['order_number']} | Yuvon"
        ),
        recipient_list=[
            customer_email,
        ],
        text_body=_payment_success_text(
            context
        ),
        html_body=_render_email_template(
            "emails/orders/payment_success.html",
            context,
        ),
    )
