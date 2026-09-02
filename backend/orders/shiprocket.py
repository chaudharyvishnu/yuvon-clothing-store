import logging
from decimal import Decimal, InvalidOperation

import requests

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


logger = logging.getLogger(__name__)


# =========================================================
# Exceptions
# =========================================================

class ShiprocketError(Exception):
    """Base exception for Shiprocket integration errors."""


class ShiprocketAuthenticationError(ShiprocketError):
    """Raised when Shiprocket authentication fails."""


class ShiprocketRequestError(ShiprocketError):
    """Raised when a Shiprocket API request fails."""


# =========================================================
# Utility Helpers
# =========================================================

def _decimal(value, default="0"):
    try:
        return Decimal(str(value if value not in (None, "") else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(str(default))


def _positive_decimal(value, default):
    number = _decimal(value, default)
    if number <= 0:
        return Decimal(str(default))
    return number


def _first_non_empty(*values):
    for value in values:
        if value not in (None, "", [], {}):
            return value
    return ""


def _nested_get(data, *path, default=None):
    current = data

    for key in path:
        if not isinstance(current, dict):
            return default

        current = current.get(key)

        if current is None:
            return default

    return current


def _extract_url(data, *keys):
    """
    Find a URL from a Shiprocket response without depending on
    only one exact response shape.
    """

    if not isinstance(data, dict):
        return ""

    for key in keys:
        value = data.get(key)

        if isinstance(value, str) and value.startswith(
            ("http://", "https://")
        ):
            return value

    for nested_key in (
        "response",
        "data",
        "payload",
    ):
        nested = data.get(nested_key)

        if isinstance(nested, dict):
            value = _extract_url(
                nested,
                *keys,
            )

            if value:
                return value

    return ""


# =========================================================
# Shiprocket Client
# =========================================================

class ShiprocketClient:
    """
    Reusable Shiprocket API client.

    Handles:
    - Authentication
    - Courier serviceability
    - Order creation
    - AWB assignment
    - Pickup scheduling
    - Shipment tracking
    - Label generation
    - Manifest generation
    - Manifest printing
    """

    TOKEN_CACHE_KEY = "shiprocket:external_api_token"

    def __init__(self):
        self.base_url = str(
            getattr(
                settings,
                "SHIPROCKET_BASE_URL",
                "https://apiv2.shiprocket.in/v1/external",
            )
        ).rstrip("/")

        self.email = str(
            getattr(
                settings,
                "SHIPROCKET_EMAIL",
                "",
            )
        ).strip()

        self.password = str(
            getattr(
                settings,
                "SHIPROCKET_PASSWORD",
                "",
            )
        ).strip()

        self.pickup_location = str(
            getattr(
                settings,
                "SHIPROCKET_PICKUP_LOCATION",
                "",
            )
        ).strip()

        self.timeout = int(
            getattr(
                settings,
                "SHIPROCKET_TIMEOUT",
                30,
            )
        )

        # Shiprocket tokens are documented as long lived.
        # Cache for 9 days so we refresh before the documented
        # 10-day expiry.
        self.token_cache_timeout = int(
            getattr(
                settings,
                "SHIPROCKET_TOKEN_CACHE_TIMEOUT",
                9 * 24 * 60 * 60,
            )
        )

        self.token = cache.get(
            self.TOKEN_CACHE_KEY
        )

        if not self.email:
            raise ShiprocketAuthenticationError(
                "SHIPROCKET_EMAIL is not configured."
            )

        if not self.password:
            raise ShiprocketAuthenticationError(
                "SHIPROCKET_PASSWORD is not configured."
            )

    # =====================================================
    # Internal Helpers
    # =====================================================

    def _url(self, path):
        return (
            f"{self.base_url}/"
            f"{str(path).lstrip('/')}"
        )

    def _headers(self):
        if not self.token:
            self.authenticate()

        return {
            "Authorization": (
                f"Bearer {self.token}"
            ),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _parse_response(
        self,
        response,
        *,
        action,
    ):
        try:
            data = response.json()
        except ValueError:
            data = {
                "detail": response.text,
            }

        if not response.ok:
            logger.error(
                "Shiprocket %s failed. status=%s response=%s",
                action,
                response.status_code,
                data,
            )

            raise ShiprocketRequestError(
                (
                    f"Shiprocket {action} failed "
                    f"with status {response.status_code}: {data}"
                )
            )

        return data

    def _request(
        self,
        method,
        path,
        *,
        params=None,
        payload=None,
        action="API request",
        retry_auth=True,
    ):
        try:
            response = requests.request(
                method=method,
                url=self._url(path),
                headers=self._headers(),
                params=params,
                json=payload,
                timeout=self.timeout,
            )

        except requests.RequestException as error:
            raise ShiprocketRequestError(
                (
                    f"Shiprocket {action} "
                    f"request failed: {error}"
                )
            ) from error

        # Token may have expired/revoked. Re-authenticate once.
        if (
            response.status_code == 401
            and retry_auth
        ):
            self.token = None
            cache.delete(
                self.TOKEN_CACHE_KEY
            )
            self.authenticate()

            return self._request(
                method,
                path,
                params=params,
                payload=payload,
                action=action,
                retry_auth=False,
            )

        return self._parse_response(
            response,
            action=action,
        )

    def _get(
        self,
        path,
        *,
        params=None,
        action="GET request",
    ):
        return self._request(
            "GET",
            path,
            params=params,
            action=action,
        )

    def _post(
        self,
        path,
        *,
        payload=None,
        action="POST request",
    ):
        return self._request(
            "POST",
            path,
            payload=payload or {},
            action=action,
        )

    # =====================================================
    # Authentication
    # =====================================================

    def authenticate(self, force=False):
        """
        Authenticate using the Shiprocket API user credentials.
        """

        if not force:
            cached_token = cache.get(
                self.TOKEN_CACHE_KEY
            )

            if cached_token:
                self.token = cached_token
                return cached_token

        try:
            response = requests.post(
                self._url(
                    "auth/login"
                ),
                json={
                    "email": self.email,
                    "password": self.password,
                },
                timeout=self.timeout,
            )

        except requests.RequestException as error:
            raise ShiprocketAuthenticationError(
                (
                    "Unable to connect to Shiprocket "
                    f"authentication API: {error}"
                )
            ) from error

        try:
            data = response.json()
        except ValueError:
            data = {
                "detail": response.text,
            }

        if not response.ok:
            logger.error(
                "Shiprocket authentication failed. "
                "status=%s response=%s",
                response.status_code,
                data,
            )

            raise ShiprocketAuthenticationError(
                (
                    "Shiprocket authentication failed "
                    f"with status {response.status_code}: {data}"
                )
            )

        token = data.get(
            "token"
        )

        if not token:
            raise ShiprocketAuthenticationError(
                (
                    "Shiprocket authentication response "
                    "did not contain a token."
                )
            )

        self.token = token

        cache.set(
            self.TOKEN_CACHE_KEY,
            token,
            timeout=self.token_cache_timeout,
        )

        return token

    # =====================================================
    # Courier Serviceability
    # =====================================================

    def check_serviceability(
        self,
        *,
        pickup_postcode,
        delivery_postcode,
        weight,
        cod=False,
        declared_value=None,
    ):
        pickup_postcode = str(
            pickup_postcode
        ).strip()

        delivery_postcode = str(
            delivery_postcode
        ).strip()

        if not pickup_postcode:
            raise ShiprocketRequestError(
                "Pickup postcode is required."
            )

        if not delivery_postcode:
            raise ShiprocketRequestError(
                "Delivery postcode is required."
            )

        shipping_weight = _positive_decimal(
            weight,
            "0.50",
        )

        params = {
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": float(
                shipping_weight
            ),
            "cod": (
                1
                if cod
                else 0
            ),
        }

        if declared_value is not None:
            params[
                "declared_value"
            ] = float(
                max(
                    _decimal(
                        declared_value,
                        "0",
                    ),
                    Decimal("0"),
                )
            )

        return self._get(
            "courier/serviceability/",
            params=params,
            action="courier serviceability",
        )

    # =====================================================
    # Create Shiprocket Order
    # =====================================================

    def create_order(self, order):
        if not self.pickup_location:
            raise ShiprocketRequestError(
                (
                    "SHIPROCKET_PICKUP_LOCATION "
                    "is not configured."
                )
            )

        items = list(
            order.items.all()
        )

        if not items:
            raise ShiprocketRequestError(
                "Cannot create a Shiprocket order without items."
            )

        order_items = []

        for item in items:
            sku = (
                item.variant_sku
                or item.product_sku
                or f"ITEM-{item.pk}"
            )

            order_items.append(
                {
                    "name": (
                        item.product_name
                        or "Product"
                    ),
                    "sku": str(
                        sku
                    ),
                    "units": max(
                        1,
                        int(
                            item.quantity
                            or 1
                        ),
                    ),
                    "selling_price": float(
                        max(
                            _decimal(
                                item.unit_price,
                                "0",
                            ),
                            Decimal("0"),
                        )
                    ),
                    "discount": 0,
                    "tax": 0,
                    "hsn": "",
                }
            )

        payment_method = (
            "COD"
            if order.payment_method == "cod"
            else "Prepaid"
        )

        customer_email = ""

        if order.user:
            customer_email = str(
                getattr(
                    order.user,
                    "email",
                    "",
                )
                or ""
            ).strip()

        # Shiprocket expects an email in the order payload.
        # For guest orders, use the configured fallback email.
        if not customer_email:
            customer_email = str(
                getattr(
                    settings,
                    "SHIPROCKET_FALLBACK_EMAIL",
                    getattr(
                        settings,
                        "DEFAULT_FROM_EMAIL",
                        "",
                    ),
                )
                or ""
            ).strip()

        package_weight = _positive_decimal(
            getattr(
                order,
                "package_weight",
                None,
            ),
            "0.50",
        )

        package_length = _positive_decimal(
            getattr(
                order,
                "package_length",
                None,
            ),
            "10",
        )

        package_breadth = _positive_decimal(
            getattr(
                order,
                "package_breadth",
                None,
            ),
            "10",
        )

        package_height = _positive_decimal(
            getattr(
                order,
                "package_height",
                None,
            ),
            "5",
        )

        billing_address_2_parts = [
            getattr(
                order,
                "address_line_2",
                "",
            ),
            getattr(
                order,
                "landmark",
                "",
            ),
        ]

        billing_address_2 = ", ".join(
            str(value).strip()
            for value in billing_address_2_parts
            if str(
                value or ""
            ).strip()
        )

        payload = {
            "order_id": order.order_number,
            "order_date": timezone.localtime(
                order.placed_at
            ).strftime(
                "%Y-%m-%d %H:%M"
            ),
            "pickup_location": self.pickup_location,
            "comment": (
                order.customer_note
                or ""
            ),
            "billing_customer_name": order.full_name,
            "billing_last_name": "",
            "billing_address": order.address_line_1,
            "billing_address_2": billing_address_2,
            "billing_city": order.city,
            "billing_pincode": str(
                order.postal_code
            ),
            "billing_state": order.state,
            "billing_country": (
                order.country
                or "India"
            ),
            "billing_email": customer_email,
            "billing_phone": str(
                order.phone
            ),
            "shipping_is_billing": True,
            "order_items": order_items,
            "payment_method": payment_method,
            "shipping_charges": float(
                max(
                    _decimal(
                        order.shipping_charge,
                        "0",
                    ),
                    Decimal("0"),
                )
            ),
            "giftwrap_charges": 0,
            "transaction_charges": 0,
            "total_discount": float(
                max(
                    _decimal(
                        order.discount_amount,
                        "0",
                    ),
                    Decimal("0"),
                )
            ),
            "sub_total": float(
                max(
                    _decimal(
                        order.subtotal,
                        "0",
                    ),
                    Decimal("0"),
                )
            ),
            "length": float(
                package_length
            ),
            "breadth": float(
                package_breadth
            ),
            "height": float(
                package_height
            ),
            "weight": float(
                package_weight
            ),
        }

        return self._post(
            "orders/create/adhoc",
            payload=payload,
            action="order creation",
        )

    # =====================================================
    # Assign AWB
    # =====================================================

    def assign_awb(
        self,
        *,
        shipment_id,
        courier_id=None,
    ):
        if not shipment_id:
            raise ShiprocketRequestError(
                "Shipment ID is required for AWB assignment."
            )

        payload = {
            "shipment_id": int(
                shipment_id
            ),
        }

        if courier_id not in (
            None,
            "",
        ):
            payload[
                "courier_id"
            ] = int(
                courier_id
            )

        return self._post(
            "courier/assign/awb",
            payload=payload,
            action="AWB assignment",
        )

    # =====================================================
    # Schedule Pickup
    # =====================================================

    def schedule_pickup(
        self,
        *,
        shipment_id,
    ):
        if not shipment_id:
            raise ShiprocketRequestError(
                "Shipment ID is required for pickup scheduling."
            )

        return self._post(
            "courier/generate/pickup",
            payload={
                "shipment_id": [
                    int(
                        shipment_id
                    )
                ],
            },
            action="pickup scheduling",
        )

    # =====================================================
    # Generate Label
    # =====================================================

    def generate_label(
        self,
        *,
        shipment_id,
    ):
        if not shipment_id:
            raise ShiprocketRequestError(
                "Shipment ID is required for label generation."
            )

        return self._post(
            "courier/generate/label",
            payload={
                "shipment_id": [
                    int(
                        shipment_id
                    )
                ],
            },
            action="shipping label generation",
        )

    # =====================================================
    # Generate / Print Manifest
    # =====================================================

    def generate_manifest(
        self,
        *,
        shipment_id,
    ):
        if not shipment_id:
            raise ShiprocketRequestError(
                "Shipment ID is required for manifest generation."
            )

        return self._post(
            "manifests/generate",
            payload={
                "shipment_id": [
                    int(
                        shipment_id
                    )
                ],
            },
            action="manifest generation",
        )

    def print_manifest(
        self,
        *,
        order_ids,
    ):
        if not order_ids:
            raise ShiprocketRequestError(
                "Shiprocket order ID is required for manifest printing."
            )

        if not isinstance(
            order_ids,
            (list, tuple, set),
        ):
            order_ids = [
                order_ids
            ]

        clean_ids = [
            int(
                value
            )
            for value in order_ids
            if value not in (
                None,
                "",
            )
        ]

        if not clean_ids:
            raise ShiprocketRequestError(
                "Shiprocket order ID is required for manifest printing."
            )

        return self._post(
            "manifests/print",
            payload={
                "order_ids": clean_ids,
            },
            action="manifest printing",
        )

    # =====================================================
    # Track Shipment
    # =====================================================

    def track_awb(
        self,
        awb_code,
    ):
        awb_code = str(
            awb_code
            or ""
        ).strip()

        if not awb_code:
            raise ShiprocketRequestError(
                "AWB code is required."
            )

        return self._get(
            (
                "courier/track/awb/"
                f"{awb_code}"
            ),
            action="shipment tracking",
        )


# =========================================================
# Factory
# =========================================================

def get_shiprocket_client():
    return ShiprocketClient()


# =========================================================
# Convenience Functions
# =========================================================

def check_order_serviceability(
    order,
    *,
    pickup_postcode,
):
    client = get_shiprocket_client()

    response = client.check_serviceability(
        pickup_postcode=pickup_postcode,
        delivery_postcode=order.postal_code,
        weight=getattr(
            order,
            "package_weight",
            Decimal("0.50"),
        ),
        cod=(
            order.payment_method
            == "cod"
        ),
        declared_value=order.total_amount,
    )

    order.serviceability_response = response

    order.save(
        update_fields=[
            "serviceability_response",
            "updated_at",
        ]
    )

    return response


def create_shiprocket_order(order):
    """
    Create the Shiprocket order exactly once and store
    the returned Shiprocket order/shipment IDs locally.
    """

    if (
        getattr(
            order,
            "shiprocket_order_id",
            "",
        )
        and getattr(
            order,
            "shiprocket_shipment_id",
            "",
        )
    ):
        return {
            "already_created": True,
            "order_id": order.shiprocket_order_id,
            "shipment_id": order.shiprocket_shipment_id,
            "status": (
                order.shipping_status
                or "created"
            ),
        }

    client = get_shiprocket_client()

    response = client.create_order(
        order
    )

    shiprocket_order_id = _first_non_empty(
        response.get(
            "order_id"
        ),
        _nested_get(
            response,
            "response",
            "order_id",
        ),
        _nested_get(
            response,
            "data",
            "order_id",
        ),
    )

    shipment_id = _first_non_empty(
        response.get(
            "shipment_id"
        ),
        _nested_get(
            response,
            "response",
            "shipment_id",
        ),
        _nested_get(
            response,
            "data",
            "shipment_id",
        ),
    )

    if not shiprocket_order_id:
        raise ShiprocketRequestError(
            (
                "Shiprocket order creation succeeded but "
                "no order_id was returned."
            )
        )

    if not shipment_id:
        raise ShiprocketRequestError(
            (
                "Shiprocket order creation succeeded but "
                "no shipment_id was returned."
            )
        )

    order.shiprocket_order_id = str(
        shiprocket_order_id
    )

    order.shiprocket_shipment_id = str(
        shipment_id
    )

    # Generic compatibility fields
    order.shipping_order_id = (
        order.shiprocket_order_id
    )
    order.shipment_id = (
        order.shiprocket_shipment_id
    )

    shipping_status = _first_non_empty(
        response.get(
            "status"
        ),
        response.get(
            "status_code"
        ),
        "created",
    )

    order.shipping_status = str(
        shipping_status
    )

    status_code = response.get(
        "status_code"
    )

    if hasattr(
        order,
        "shipping_status_code",
    ):
        order.shipping_status_code = str(
            status_code
            or ""
        )

    order.shipping_response = response

    if (
        order.shipment_created_at
        is None
    ):
        order.shipment_created_at = (
            timezone.now()
        )

    update_fields = [
        "shiprocket_order_id",
        "shiprocket_shipment_id",
        "shipping_order_id",
        "shipment_id",
        "shipping_status",
        "shipping_response",
        "shipment_created_at",
        "updated_at",
    ]

    if hasattr(
        order,
        "shipping_status_code",
    ):
        update_fields.append(
            "shipping_status_code"
        )

    order.save(
        update_fields=update_fields
    )

    return response


def assign_order_awb(
    order,
    *,
    courier_id=None,
):
    """
    Assign AWB and persist the selected courier and tracking ID.
    """

    if getattr(
        order,
        "awb_code",
        "",
    ):
        return {
            "already_assigned": True,
            "awb_code": order.awb_code,
            "courier_name": (
                order.courier_name
                or ""
            ),
        }

    shipment_id = (
        getattr(
            order,
            "shiprocket_shipment_id",
            "",
        )
        or getattr(
            order,
            "shipment_id",
            "",
        )
    )

    if not shipment_id:
        raise ShiprocketRequestError(
            (
                "Shiprocket shipment ID "
                "is not available for this order."
            )
        )

    client = get_shiprocket_client()

    response = client.assign_awb(
        shipment_id=shipment_id,
        courier_id=courier_id,
    )

    awb_data = _nested_get(
        response,
        "response",
        "data",
        default={},
    )

    if not isinstance(
        awb_data,
        dict,
    ):
        awb_data = {}

    awb_code = _first_non_empty(
        awb_data.get(
            "awb_code"
        ),
        response.get(
            "awb_code"
        ),
    )

    courier_name = _first_non_empty(
        awb_data.get(
            "courier_name"
        ),
        response.get(
            "courier_name"
        ),
    )

    courier_company_id = _first_non_empty(
        awb_data.get(
            "courier_company_id"
        ),
        response.get(
            "courier_company_id"
        ),
        courier_id,
    )

    if not awb_code:
        raise ShiprocketRequestError(
            (
                "AWB assignment response did not "
                "contain an AWB code."
            )
        )

    order.awb_code = str(
        awb_code
    )

    order.tracking_id = (
        order.awb_code
    )

    if courier_name:
        order.courier_name = str(
            courier_name
        )

    if hasattr(
        order,
        "courier_company_id",
    ):
        order.courier_company_id = str(
            courier_company_id
            or ""
        )

    order.awb_response = response

    if (
        order.awb_assigned_at
        is None
    ):
        order.awb_assigned_at = (
            timezone.now()
        )

    update_fields = [
        "awb_code",
        "tracking_id",
        "courier_name",
        "awb_response",
        "awb_assigned_at",
        "updated_at",
    ]

    if hasattr(
        order,
        "courier_company_id",
    ):
        update_fields.append(
            "courier_company_id"
        )

    order.save(
        update_fields=update_fields
    )

    return response


def schedule_order_pickup(order):
    """
    Schedule pickup once and persist the raw response.
    """

    if getattr(
        order,
        "pickup_scheduled",
        False,
    ):
        return {
            "already_scheduled": True,
            "pickup_scheduled_at": (
                order.pickup_scheduled_at
            ),
        }

    shipment_id = (
        getattr(
            order,
            "shiprocket_shipment_id",
            "",
        )
        or getattr(
            order,
            "shipment_id",
            "",
        )
    )

    if not shipment_id:
        raise ShiprocketRequestError(
            "Shipment ID is required."
        )

    client = get_shiprocket_client()

    response = client.schedule_pickup(
        shipment_id=shipment_id,
    )

    order.pickup_response = response
    order.pickup_scheduled = True

    if (
        order.pickup_scheduled_at
        is None
    ):
        order.pickup_scheduled_at = (
            timezone.now()
        )

    pickup_token = _first_non_empty(
        response.get(
            "pickup_token_number"
        ),
        response.get(
            "pickup_token"
        ),
        _nested_get(
            response,
            "response",
            "pickup_token_number",
        ),
    )

    update_fields = [
        "pickup_response",
        "pickup_scheduled",
        "pickup_scheduled_at",
        "updated_at",
    ]

    if (
        pickup_token
        and hasattr(
            order,
            "pickup_token",
        )
    ):
        order.pickup_token = str(
            pickup_token
        )
        update_fields.append(
            "pickup_token"
        )

    order.save(
        update_fields=update_fields
    )

    return response


def generate_order_label(order):
    """
    Generate and store the Shiprocket shipping-label URL.
    """

    shipment_id = (
        getattr(
            order,
            "shiprocket_shipment_id",
            "",
        )
        or getattr(
            order,
            "shipment_id",
            "",
        )
    )

    if not shipment_id:
        raise ShiprocketRequestError(
            "Shipment ID is required for label generation."
        )

    client = get_shiprocket_client()

    response = client.generate_label(
        shipment_id=shipment_id,
    )

    label_url = _extract_url(
        response,
        "label_url",
        "label_url_download",
        "url",
    )

    if label_url:
        order.shipping_label_url = (
            label_url
        )

        order.save(
            update_fields=[
                "shipping_label_url",
                "updated_at",
            ]
        )

    return response


def generate_order_manifest(order):
    """
    Generate a manifest and, when possible, store its PDF URL.
    """

    shipment_id = (
        getattr(
            order,
            "shiprocket_shipment_id",
            "",
        )
        or getattr(
            order,
            "shipment_id",
            "",
        )
    )

    if not shipment_id:
        raise ShiprocketRequestError(
            "Shipment ID is required for manifest generation."
        )

    client = get_shiprocket_client()

    generate_response = (
        client.generate_manifest(
            shipment_id=shipment_id,
        )
    )

    manifest_url = _extract_url(
        generate_response,
        "manifest_url",
        "url",
    )

    # Shiprocket documents manifest generation and manifest
    # printing as two separate API operations.
    if (
        not manifest_url
        and getattr(
            order,
            "shiprocket_order_id",
            "",
        )
    ):
        print_response = client.print_manifest(
            order_ids=[
                order.shiprocket_order_id
            ],
        )

        manifest_url = _extract_url(
            print_response,
            "manifest_url",
            "url",
        )

        response = {
            "generate": generate_response,
            "print": print_response,
        }
    else:
        response = generate_response

    if manifest_url:
        order.manifest_url = (
            manifest_url
        )

        order.save(
            update_fields=[
                "manifest_url",
                "updated_at",
            ]
        )

    return response


def _map_tracking_status(order, tracking_data):
    """
    Best-effort mapping of Shiprocket tracking response to
    the local order timeline without hardcoding one response shape.
    """

    shipment_track = _nested_get(
        tracking_data,
        "tracking_data",
        "shipment_track",
        default=[],
    )

    current = {}

    if (
        isinstance(
            shipment_track,
            list,
        )
        and shipment_track
        and isinstance(
            shipment_track[0],
            dict,
        )
    ):
        current = shipment_track[0]

    elif isinstance(
        shipment_track,
        dict,
    ):
        current = shipment_track

    shipment_status = str(
        _first_non_empty(
            current.get(
                "current_status"
            ),
            current.get(
                "status"
            ),
            _nested_get(
                tracking_data,
                "tracking_data",
                "track_status",
            ),
        )
        or ""
    ).strip()

    status_code = _first_non_empty(
        current.get(
            "shipment_status"
        ),
        current.get(
            "status_code"
        ),
        _nested_get(
            tracking_data,
            "tracking_data",
            "shipment_status",
        ),
    )

    courier_name = _first_non_empty(
        current.get(
            "courier_name"
        ),
        current.get(
            "courier"
        ),
    )

    estimated_delivery = _first_non_empty(
        current.get(
            "edd"
        ),
        _nested_get(
            tracking_data,
            "tracking_data",
            "etd",
        ),
    )

    if shipment_status:
        order.shipping_status = (
            shipment_status
        )

    if (
        status_code not in (
            None,
            "",
        )
        and hasattr(
            order,
            "shipping_status_code",
        )
    ):
        order.shipping_status_code = str(
            status_code
        )

    if courier_name:
        order.courier_name = str(
            courier_name
        )

    tracking_url = _extract_url(
        tracking_data,
        "track_url",
        "tracking_url",
        "url",
    )

    if tracking_url:
        order.tracking_url = (
            tracking_url
        )

    normalized = (
        shipment_status
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )

    now = timezone.now()

    if (
        "delivered" in normalized
        and "undelivered" not in normalized
    ):
        order.status = "delivered"

        if (
            order.delivered_at
            is None
        ):
            order.delivered_at = now

    elif "out for delivery" in normalized:
        order.status = "out_for_delivery"

        if (
            getattr(
                order,
                "out_for_delivery_at",
                None,
            )
            is None
        ):
            order.out_for_delivery_at = now

    elif any(
        phrase in normalized
        for phrase in (
            "in transit",
            "in-transit",
            "picked up",
            "pickup complete",
        )
    ):
        order.status = "in_transit"

        if (
            getattr(
                order,
                "in_transit_at",
                None,
            )
            is None
        ):
            order.in_transit_at = now

        if (
            order.shipped_at
            is None
        ):
            order.shipped_at = now

    elif any(
        phrase in normalized
        for phrase in (
            "shipped",
            "manifested",
            "pickup scheduled",
        )
    ):
        if order.status not in (
            "delivered",
            "out_for_delivery",
            "in_transit",
        ):
            order.status = "shipped"

        if (
            order.shipped_at
            is None
        ):
            order.shipped_at = now

    return estimated_delivery


def track_order_shipment(order):
    """
    Fetch latest tracking data, persist the raw response and
    synchronize useful shipment/order status fields.
    """

    awb_code = (
        getattr(
            order,
            "awb_code",
            "",
        )
        or getattr(
            order,
            "tracking_id",
            "",
        )
    )

    if not awb_code:
        raise ShiprocketRequestError(
            (
                "AWB/tracking ID is "
                "not available."
            )
        )

    client = get_shiprocket_client()

    response = client.track_awb(
        awb_code
    )

    order.tracking_response = (
        response
    )

    estimated_delivery = (
        _map_tracking_status(
            order,
            response,
        )
    )

    update_fields = [
        "tracking_response",
        "shipping_status",
        "courier_name",
        "tracking_url",
        "status",
        "shipped_at",
        "delivered_at",
        "updated_at",
    ]

    if hasattr(
        order,
        "shipping_status_code",
    ):
        update_fields.append(
            "shipping_status_code"
        )

    if hasattr(
        order,
        "in_transit_at",
    ):
        update_fields.append(
            "in_transit_at"
        )

    if hasattr(
        order,
        "out_for_delivery_at",
    ):
        update_fields.append(
            "out_for_delivery_at"
        )

    if (
        estimated_delivery
        and hasattr(
            order,
            "estimated_delivery",
        )
    ):
        # Keep raw EDD only when Django can safely parse it on save
        # via assignment of an already-valid YYYY-MM-DD-like value.
        try:
            if isinstance(
                estimated_delivery,
                str,
            ):
                candidate = (
                    estimated_delivery
                    .strip()
                    .split(" ")[0]
                )

                if (
                    len(candidate) == 10
                    and candidate[4] == "-"
                    and candidate[7] == "-"
                ):
                    order.estimated_delivery = candidate
                    update_fields.append(
                        "estimated_delivery"
                    )
        except Exception:
            pass

    order.save(
        update_fields=list(
            dict.fromkeys(
                update_fields
            )
        )
    )

    return response
