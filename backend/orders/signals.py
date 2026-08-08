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
# Store Previous Order Values
# ==========================================================

@receiver(pre_save, sender=Order)
def store_previous_order_values(
    sender,
    instance,
    **kwargs,
):
    """
    Store previous order status and payment status before save.

    Ye values post_save signal me compare karne ke kaam aayengi.
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
    Queue emails after the database transaction commits.

    New order:
    - Customer order confirmation
    - Admin new-order notification

    Existing order:
    - Order status update
    - Payment-success email when payment_status changes to paid
    """

    if raw:
        return

    order_id = instance.pk

    if created:
        transaction.on_commit(
            lambda: (
                send_order_confirmation_email_task.delay(
                    order_id
                )
            )
        )

        transaction.on_commit(
            lambda: (
                send_admin_order_notification_task.delay(
                    order_id
                )
            )
        )

        logger.info(
            "New-order email tasks queued for order %s",
            instance.order_number,
        )

        return

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

    if (
        previous_status is not None
        and previous_status != instance.status
    ):
        transaction.on_commit(
            lambda: (
                send_order_status_email_task.delay(
                    order_id
                )
            )
        )

        logger.info(
            "Order-status email task queued for order %s: %s -> %s",
            instance.order_number,
            previous_status,
            instance.status,
        )

    if (
        instance.payment_status == "paid"
        and previous_payment_status != "paid"
    ):
        transaction.on_commit(
            lambda: (
                send_payment_success_email_task.delay(
                    order_id
                )
            )
        )

        logger.info(
            "Payment-success email task queued for order %s",
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
    Safety fallback:

    Agar Payment captured ho gaya ho lekin kisi reason se Order signal
    payment email queue na kar paya ho, to payment task queue karta hai.

    Task ko repeat hone se bachane ke liye Order.payment_status bhi paid
    hona zaroori hai.
    """

    if raw or created:
        return

    if instance.status != "captured":
        return

    order = instance.order

    if order.payment_status != "paid":
        return

    transaction.on_commit(
        lambda: (
            send_payment_success_email_task.delay(
                order.pk
            )
        )
    )

    logger.info(
        "Payment-success fallback task queued for order %s",
        order.order_number,
    )