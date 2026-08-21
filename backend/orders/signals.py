import logging

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Order, Payment
from .tasks import (
    send_admin_order_notification_task,
    send_order_confirmation_email_task,
    send_order_status_email_task,
    send_payment_success_email_task,
)


logger = logging.getLogger(__name__)


# ==========================================================
# Safe Celery Queue Helpers
# ==========================================================

def queue_task_safely(task, order_id, task_name):
    """
    Queue a Celery task safely.

    Email notifications are secondary operations. A temporary
    Celery/Redis/broker failure must never cause a successful
    order, payment, or status update API request to return 500.
    """
    try:
        task.delay(order_id)

        logger.info(
            "%s queued successfully for order ID %s.",
            task_name,
            order_id,
        )

    except Exception:
        logger.exception(
            "Unable to queue %s for order ID %s. "
            "The order operation itself remains successful.",
            task_name,
            order_id,
        )


def queue_after_commit(task, order_id, task_name):
    """
    Queue the Celery task only after the current database
    transaction has committed successfully.
    """
    transaction.on_commit(
        lambda: queue_task_safely(
            task,
            order_id,
            task_name,
        )
    )


# ==========================================================
# Store Previous Order Values
# ==========================================================

@receiver(pre_save, sender=Order)
def store_previous_order_values(
    sender,
    instance,
    **kwargs,
):
    """
    Store the previous order status and payment status.

    These values are used by the post_save signal to determine
    whether a status/payment notification actually needs to be
    queued.
    """

    if not instance.pk:
        instance._previous_status = None
        instance._previous_payment_status = None
        return

    try:
        previous_order = (
            Order.objects
            .only(
                "status",
                "payment_status",
            )
            .get(pk=instance.pk)
        )

        instance._previous_status = (
            previous_order.status
        )

        instance._previous_payment_status = (
            previous_order.payment_status
        )

    except Order.DoesNotExist:
        instance._previous_status = None
        instance._previous_payment_status = None


# ==========================================================
# Order Created / Updated
# ==========================================================

@receiver(post_save, sender=Order)
def handle_order_saved(
    sender,
    instance,
    created,
    raw=False,
    **kwargs,
):
    """
    Queue order notification emails after database commit.

    New order:
    - Customer order confirmation
    - Admin new-order notification

    Existing order:
    - Order status update notification
    - Payment-success notification

    Celery/Redis failures are isolated from the main order
    operation so they cannot turn a successful checkout into
    an HTTP 500 response.
    """

    if raw:
        return

    order_id = instance.pk

    # ------------------------------------------------------
    # New Order
    # ------------------------------------------------------

    if created:
        queue_after_commit(
            send_order_confirmation_email_task,
            order_id,
            "order-confirmation email task",
        )

        queue_after_commit(
            send_admin_order_notification_task,
            order_id,
            "admin new-order email task",
        )

        logger.info(
            "New-order notification tasks registered "
            "for order %s.",
            instance.order_number,
        )

        return

    # ------------------------------------------------------
    # Existing Order
    # ------------------------------------------------------

    previous_status = getattr(
        instance,
        "_previous_status",
        None,
    )

    previous_payment_status = getattr(
        instance,
        "_previous_payment_status",
        None,
    )

    # ------------------------------------------------------
    # Order Status Changed
    # ------------------------------------------------------

    if (
        previous_status is not None
        and previous_status != instance.status
    ):
        queue_after_commit(
            send_order_status_email_task,
            order_id,
            "order-status email task",
        )

        logger.info(
            "Order-status notification task registered "
            "for order %s: %s -> %s.",
            instance.order_number,
            previous_status,
            instance.status,
        )

    # ------------------------------------------------------
    # Payment Became Paid
    # ------------------------------------------------------

    if (
        instance.payment_status == "paid"
        and previous_payment_status != "paid"
    ):
        queue_after_commit(
            send_payment_success_email_task,
            order_id,
            "payment-success email task",
        )

        logger.info(
            "Payment-success notification task registered "
            "for order %s.",
            instance.order_number,
        )


# ==========================================================
# Payment Safety Signal
# ==========================================================

@receiver(post_save, sender=Payment)
def handle_payment_saved(
    sender,
    instance,
    created,
    raw=False,
    **kwargs,
):
    """
    Payment-success notification fallback.

    If a Payment becomes captured and the related Order is
    already marked paid, queue a payment-success notification.

    Celery/broker failures are intentionally isolated from the
    payment operation.
    """

    if raw or created:
        return

    if instance.status != "captured":
        return

    order = instance.order

    if order.payment_status != "paid":
        return

    queue_after_commit(
        send_payment_success_email_task,
        order.pk,
        "payment-success fallback email task",
    )

    logger.info(
        "Payment-success fallback notification task registered "
        "for order %s.",
        order.order_number,
    )