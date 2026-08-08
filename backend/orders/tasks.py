import logging

from celery import shared_task

from .models import Order
from .utils import (
    send_admin_order_notification,
    send_order_confirmation_email,
    send_order_status_email,
    send_payment_success_email,
)


logger = logging.getLogger(__name__)


# =========================================================
# Common Helpers
# =========================================================

def get_order_for_email(order_id):
    """
    Load complete order data required by all email templates.
    """
    return (
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
        )
        .get(pk=order_id)
    )


def ensure_email_sent(result, email_type, order):
    """
    Email utility functions return False when sending fails.

    Raise an exception so Celery retries the task.
    """
    if result is False:
        raise RuntimeError(
            f"{email_type} email could not be sent "
            f"for order {order.order_number}."
        )


def success_response(order, email_type):
    return {
        "success": True,
        "order_id": order.pk,
        "order_number": order.order_number,
        "email_type": email_type,
    }


def order_not_found_response(order_id, email_type):
    return {
        "success": False,
        "order_id": order_id,
        "email_type": email_type,
        "error": "Order not found",
    }


# =========================================================
# Order Confirmation Email
# =========================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def send_order_confirmation_email_task(
    self,
    order_id,
):
    """
    Send order confirmation email asynchronously.
    """
    try:
        order = get_order_for_email(
            order_id
        )

        result = send_order_confirmation_email(
            order
        )

        ensure_email_sent(
            result,
            "Order confirmation",
            order,
        )

        logger.info(
            "Order confirmation email sent for order %s.",
            order.order_number,
        )

        return success_response(
            order,
            "order_confirmation",
        )

    except Order.DoesNotExist:
        logger.warning(
            "Order not found for confirmation email. "
            "Order ID: %s",
            order_id,
        )

        return order_not_found_response(
            order_id,
            "order_confirmation",
        )


# =========================================================
# Admin New Order Email
# =========================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def send_admin_order_notification_task(
    self,
    order_id,
):
    """
    Send new-order notification to configured admins.
    """
    try:
        order = get_order_for_email(
            order_id
        )

        result = send_admin_order_notification(
            order
        )

        ensure_email_sent(
            result,
            "Admin new-order",
            order,
        )

        logger.info(
            "Admin order notification sent for order %s.",
            order.order_number,
        )

        return success_response(
            order,
            "admin_new_order",
        )

    except Order.DoesNotExist:
        logger.warning(
            "Order not found for admin notification. "
            "Order ID: %s",
            order_id,
        )

        return order_not_found_response(
            order_id,
            "admin_new_order",
        )


# =========================================================
# Order Status Email
# =========================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def send_order_status_email_task(
    self,
    order_id,
):
    """
    Send order-status update email asynchronously.
    """
    try:
        order = get_order_for_email(
            order_id
        )

        result = send_order_status_email(
            order
        )

        ensure_email_sent(
            result,
            "Order status",
            order,
        )

        logger.info(
            "Order status email sent for order %s.",
            order.order_number,
        )

        return success_response(
            order,
            "order_status_update",
        )

    except Order.DoesNotExist:
        logger.warning(
            "Order not found for status email. "
            "Order ID: %s",
            order_id,
        )

        return order_not_found_response(
            order_id,
            "order_status_update",
        )


# =========================================================
# Payment Success Email
# =========================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def send_payment_success_email_task(
    self,
    order_id,
):
    """
    Send payment-success email asynchronously.
    """
    try:
        order = get_order_for_email(
            order_id
        )

        result = send_payment_success_email(
            order
        )

        ensure_email_sent(
            result,
            "Payment success",
            order,
        )

        logger.info(
            "Payment success email sent for order %s.",
            order.order_number,
        )

        return success_response(
            order,
            "payment_success",
        )

    except Order.DoesNotExist:
        logger.warning(
            "Order not found for payment email. "
            "Order ID: %s",
            order_id,
        )

        return order_not_found_response(
            order_id,
            "payment_success",
        )