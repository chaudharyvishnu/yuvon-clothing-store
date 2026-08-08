import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  cancelOrder,
  fetchOrder,
} from "../services/api";

const BACKEND_URL =
  "http://127.0.0.1:8000";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

const STATUS_STYLES = {
  pending:
    "bg-yellow-100 text-yellow-700",
  confirmed:
    "bg-blue-100 text-blue-700",
  processing:
    "bg-purple-100 text-purple-700",
  packed:
    "bg-indigo-100 text-indigo-700",
  shipped:
    "bg-cyan-100 text-cyan-700",
  out_for_delivery:
    "bg-orange-100 text-orange-700",
  delivered:
    "bg-green-100 text-green-700",
  cancelled:
    "bg-red-100 text-red-700",
  returned:
    "bg-gray-200 text-gray-700",
  refunded:
    "bg-teal-100 text-teal-700",
};

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  razorpay: "Razorpay",
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
};

const ORDER_STEPS = [
  {
    key: "pending",
    title: "Order Placed",
    description:
      "Your order has been placed successfully.",
  },
  {
    key: "confirmed",
    title: "Confirmed",
    description:
      "Your order has been confirmed.",
  },
  {
    key: "processing",
    title: "Processing",
    description:
      "Your order is being prepared.",
  },
  {
    key: "packed",
    title: "Packed",
    description:
      "Your items have been packed.",
  },
  {
    key: "shipped",
    title: "Shipped",
    description:
      "Your order is on the way.",
  },
  {
    key: "out_for_delivery",
    title: "Out for Delivery",
    description:
      "The delivery partner will contact you soon.",
  },
  {
    key: "delivered",
    title: "Delivered",
    description:
      "Your order has been delivered.",
  },
];

const STATUS_INDEX = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  packed: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
};

const CANCELLABLE_STATUSES =
  new Set([
    "pending",
    "confirmed",
    "processing",
  ]);

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatMoney(value) {
  return Number(value || 0).toFixed(
    2
  );
}

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Order details load nahi ho paayi."
    );
  }

  if (
    typeof error.data === "string"
  ) {
    return error.data;
  }

  if (error.data.detail) {
    return String(
      error.data.detail
    );
  }

  return Object.entries(
    error.data
  )
    .map(([field, messages]) => {
      if (
        Array.isArray(messages)
      ) {
        return `${field}: ${messages.join(
          " "
        )}`;
      }

      return `${field}: ${String(
        messages
      )}`;
    })
    .join(" ");
}

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${
    image.startsWith("/")
      ? image
      : `/${image}`
  }`;
}

function getOrderItems(order) {
  if (
    Array.isArray(order?.items)
  ) {
    return order.items;
  }

  if (
    Array.isArray(
      order?.order_items
    )
  ) {
    return order.order_items;
  }

  return [];
}

function OrderDetails() {
  const {
    orderNumber,
  } = useParams();

  const navigate = useNavigate();

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    cancelling,
    setCancelling,
  ] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetchOrder(
          orderNumber
        );

      setOrder(
        response.order ||
          response
      );
    } catch (fetchError) {
      console.error(
        "Order details error:",
        fetchError
      );

      setError(
        formatApiError(
          fetchError
        )
      );

      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderNumber]);

  const items = useMemo(
    () => getOrderItems(order),
    [order]
  );

  const status =
    order?.status || "pending";

  const currentStatusIndex =
    STATUS_INDEX[status] ?? -1;

  const canCancel =
    CANCELLABLE_STATUSES.has(
      status
    );

  const isCancelled =
    status === "cancelled";

  const fullAddress = useMemo(() => {
    if (!order) {
      return "";
    }

    if (order.full_address) {
      return order.full_address;
    }

    return [
      order.address_line_1,
      order.address_line_2,
      order.landmark,
      order.city,
      order.state,
      order.postal_code,
      order.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, [order]);

  const handleCancel = async () => {
    if (!order) {
      return;
    }

    const confirmed =
      window.confirm(
        `Cancel order ${
          order.order_number ||
          orderNumber
        }?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);

      const response =
        await cancelOrder(
          order.order_number ||
            orderNumber
        );

      const updatedOrder =
        response.order || {
          ...order,
          status:
            response.status ||
            "cancelled",
          cancelled_at:
            response.cancelled_at ||
            new Date().toISOString(),
        };

      setOrder((current) => ({
        ...current,
        ...updatedOrder,
      }));

      alert(
        response.message ||
          "Order cancelled successfully."
      );
    } catch (cancelError) {
      console.error(
        "Order cancellation error:",
        cancelError
      );

      alert(
        formatApiError(
          cancelError
        )
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />

          <div className="mt-8 space-y-6">
            <div className="h-48 animate-pulse rounded-3xl bg-white" />
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
            <div className="h-56 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">
            📦
          </div>

          <h1 className="mt-4 text-3xl font-bold">
            Order not found
          </h1>

          <p className="mt-3 text-gray-500">
            {error ||
              "This order is not available."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={loadOrder}
              className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
            >
              Try Again
            </button>

            <Link
              to="/my-orders"
              className="rounded-full border border-gray-300 px-6 py-3 font-semibold"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <button
          type="button"
          onClick={() =>
            navigate("/my-orders")
          }
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to My Orders
        </button>

        <div className="mt-8 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b bg-gray-50 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <p className="text-sm text-gray-500">
                Order Number
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                {order.order_number ||
                  orderNumber}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Placed on{" "}
                {formatDate(
                  order.placed_at ||
                    order.created_at
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  STATUS_STYLES[
                    status
                  ] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABELS[
                  status
                ] || status}
              </span>

              <span className="text-2xl font-bold text-blue-600">
                ₹
                {formatMoney(
                  order.total_amount ||
                    order.total
                )}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
            <div>
              <p className="text-sm text-gray-500">
                Customer
              </p>

              <p className="mt-1 font-semibold">
                {order.full_name ||
                  "Customer"}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {order.phone
                  ? `+91 ${order.phone}`
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Payment
              </p>

              <p className="mt-1 font-semibold">
                {PAYMENT_LABELS[
                  order.payment_method
                ] ||
                  order.payment_method ||
                  "—"}
              </p>

              <p className="mt-1 text-sm capitalize text-gray-600">
                Status:{" "}
                {order.payment_status ||
                  "pending"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Items
              </p>

              <p className="mt-1 font-semibold">
                {order.total_items ||
                  items.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.quantity || 1
                      ),
                    0
                  )}{" "}
                item(s)
              </p>
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Order Status
              </h2>

              <p className="mt-2 text-gray-500">
                Follow the progress of your order.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/track-order?order=${encodeURIComponent(
                    order.order_number ||
                      orderNumber
                  )}&phone=${encodeURIComponent(
                    order.phone || ""
                  )}`
                )
              }
              className="w-fit rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
            >
              Track Order
            </button>
          </div>

          {isCancelled ? (
            <div className="mt-7 rounded-2xl bg-red-50 p-6 text-center">
              <h3 className="text-xl font-bold text-red-700">
                Order Cancelled
              </h3>

              <p className="mt-2 text-red-600">
                Cancelled on{" "}
                {formatDate(
                  order.cancelled_at
                )}
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-0">
              {ORDER_STEPS.map(
                (step, index) => {
                  const completed =
                    currentStatusIndex >=
                    index;

                  const current =
                    currentStatusIndex ===
                    index;

                  return (
                    <div
                      key={step.key}
                      className="flex gap-5"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold ${
                            completed
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white text-gray-400"
                          }`}
                        >
                          {completed
                            ? "✓"
                            : index + 1}
                        </div>

                        {index !==
                          ORDER_STEPS.length -
                            1 && (
                          <div
                            className={`h-16 w-1 ${
                              currentStatusIndex >
                              index
                                ? "bg-blue-600"
                                : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>

                      <div className="pb-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-lg font-bold ${
                              completed
                                ? "text-gray-950"
                                : "text-gray-400"
                            }`}
                          >
                            {step.title}
                          </h3>

                          {current && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Current Status
                            </span>
                          )}
                        </div>

                        <p
                          className={`mt-1 ${
                            completed
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Ordered Items */}
        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">
            Ordered Items
          </h2>

          {items.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              No order items found.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map(
                (item, index) => {
                  const image =
                    item.product_image ||
                    item.image ||
                    item.product
                      ?.main_image_url ||
                    item.product
                      ?.main_image ||
                    "";

                  const productId =
                    item.product_id ||
                    item.product?.id;

                  const itemTotal =
                    item.total_price ||
                    item.subtotal ||
                    Number(
                      item.price || 0
                    ) *
                      Number(
                        item.quantity || 1
                      );

                  return (
                    <article
                      key={
                        item.id ||
                        `${order.order_number}-${index}`
                      }
                      className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row"
                    >
                      {image ? (
                        <img
                          src={getImageUrl(
                            image
                          )}
                          alt={
                            item.product_name ||
                            item.name ||
                            "Product"
                          }
                          onError={(
                            event
                          ) => {
                            event.currentTarget.onerror =
                              null;

                            event.currentTarget.src =
                              "https://placehold.co/300x400?text=No+Image";
                          }}
                          className="h-32 w-full rounded-xl object-cover sm:w-28"
                        />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400 sm:w-28">
                          No Image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold">
                          {item.product_name ||
                            item.name ||
                            item.product
                              ?.name ||
                            "Product"}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                          {item.color && (
                            <span>
                              Color:{" "}
                              {
                                item.color
                              }
                            </span>
                          )}

                          {item.size && (
                            <span>
                              Size:{" "}
                              {item.size}
                            </span>
                          )}

                          <span>
                            Quantity:{" "}
                            {item.quantity ||
                              1}
                          </span>

                          {(item.sku ||
                            item.variant_sku) && (
                            <span>
                              SKU:{" "}
                              {item.sku ||
                                item.variant_sku}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <p className="font-bold text-blue-600">
                            ₹
                            {formatMoney(
                              itemTotal
                            )}
                          </p>

                          {item.price && (
                            <p className="text-sm text-gray-500">
                              ₹
                              {formatMoney(
                                item.price
                              )}{" "}
                              each
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start gap-2 sm:flex-col">
                        {productId && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/product/${productId}`
                              )
                            }
                            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold"
                          >
                            View Product
                          </button>
                        )}

                        {status ===
                          "delivered" &&
                          productId && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/product/${productId}#customer-reviews`
                                )
                              }
                              className="rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600"
                            >
                              Write Review
                            </button>
                          )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Shipping & Summary */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">
              Shipping Address
            </h2>

            <p className="mt-4 font-semibold">
              {order.full_name ||
                "Customer"}
            </p>

            <p className="mt-2 leading-7 text-gray-600">
              {fullAddress || "—"}
            </p>

            {order.phone && (
              <p className="mt-3 text-gray-600">
                Phone: +91{" "}
                {order.phone}
              </p>
            )}

            {order.alternate_phone && (
              <p className="mt-1 text-gray-600">
                Alternate: +91{" "}
                {
                  order.alternate_phone
                }
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">
              Price Summary
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>

                <span>
                  ₹
                  {formatMoney(
                    order.subtotal
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>
                  Shipping
                </span>

                <span>
                  ₹
                  {formatMoney(
                    order.shipping_charge
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Discount</span>

                <span className="text-green-600">
                  -₹
                  {formatMoney(
                    order.discount_amount
                  )}
                </span>
              </div>

              {order.coupon_code && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    Coupon
                  </span>

                  <span className="font-semibold">
                    {
                      order.coupon_code
                    }
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-4 text-lg font-bold">
                <span>Total</span>

                <span className="text-blue-600">
                  ₹
                  {formatMoney(
                    order.total_amount ||
                      order.total
                  )}
                </span>
              </div>
            </div>

            {canCancel && (
              <button
                type="button"
                onClick={
                  handleCancel
                }
                disabled={cancelling}
                className="mt-6 w-full rounded-full border border-red-500 py-3 font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling
                  ? "Cancelling..."
                  : "Cancel Order"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrderDetails;