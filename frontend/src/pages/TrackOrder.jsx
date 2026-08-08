import { useMemo, useState } from "react";

import { trackGuestOrder } from "../services/api";

const ORDER_STEPS = [
  {
    key: "pending",
    title: "Order Placed",
    description: "Your order has been successfully placed.",
  },
  {
    key: "confirmed",
    title: "Order Confirmed",
    description: "Your order has been confirmed.",
  },
  {
    key: "processing",
    title: "Processing",
    description: "Your order is being prepared.",
  },
  {
    key: "packed",
    title: "Packed",
    description: "Your products have been packed.",
  },
  {
    key: "shipped",
    title: "Shipped",
    description: "Your order has been shipped.",
  },
  {
    key: "out_for_delivery",
    title: "Out for Delivery",
    description: "The delivery partner will contact you soon.",
  },
  {
    key: "delivered",
    title: "Delivered",
    description: "Your order has been delivered successfully.",
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

const STATUS_LABELS = {
  pending: "Order Placed",
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

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  razorpay: "Razorpay",
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
};

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Order details load nahi ho paayi."
    );
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    return error.data.detail;
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(" ")
        : String(messages);

      return `${field}: ${message}`;
    })
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [mobile, setMobile] = useState("");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentStatusIndex = useMemo(() => {
    if (!order) {
      return -1;
    }

    return STATUS_INDEX[order.status] ?? -1;
  }, [order]);

  const isCancelled =
    order?.status === "cancelled";

  const handleTrack = async (event) => {
    event.preventDefault();

    setError("");
    setOrder(null);

    const cleanedOrderId = orderId.trim();
    const cleanedMobile = mobile.replace(/\D/g, "");

    if (!cleanedOrderId) {
      setError("Please enter your Order ID.");
      return;
    }

    if (cleanedMobile.length !== 10) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await trackGuestOrder(
        cleanedOrderId,
        cleanedMobile
      );

      setOrder(response);
      setOrderId(
        response.order_number || cleanedOrderId
      );
      setMobile(cleanedMobile);
    } catch (trackError) {
      console.error(
        "Order tracking error:",
        trackError
      );

      setError(formatApiError(trackError));
    } finally {
      setLoading(false);
    }
  };

  const resetTracking = () => {
    setOrder(null);
    setError("");
    setOrderId("");
    setMobile("");
  };

  return (
    <section className="min-h-screen bg-gray-100 py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl bg-white p-7 shadow-xl md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Order Tracking
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Track Your Order
          </h1>

          <p className="mt-3 text-gray-500">
            Enter your order number and the same mobile
            number used during checkout.
          </p>

          <form
            onSubmit={handleTrack}
            className="mt-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <input
                type="text"
                value={orderId}
                onChange={(event) =>
                  setOrderId(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Example: YUV-ABC1234567"
                className="rounded-xl border px-5 py-4 uppercase outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center rounded-xl border bg-white px-5">
                <span className="mr-3 text-gray-500">
                  +91
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) =>
                    setMobile(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="10-digit Mobile Number"
                  className="w-full py-4 outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading
                ? "Tracking Order..."
                : "Track Order"}
            </button>
          </form>
        </div>

        {order && (
          <div className="mt-10 overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="border-b p-7 md:p-10">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Order Number
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {order.order_number}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Placed on{" "}
                    {formatDate(order.placed_at)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-4 py-2 font-semibold ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {STATUS_LABELS[order.status] ||
                    order.status}
                </span>
              </div>
            </div>

            <div className="grid gap-8 p-7 md:grid-cols-3 md:p-10">
              <div>
                <p className="text-sm text-gray-500">
                  Customer
                </p>

                <p className="mt-1 font-semibold">
                  {order.full_name}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  +91 {order.phone}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Payment
                </p>

                <p className="mt-1 font-semibold">
                  {PAYMENT_LABELS[
                    order.payment_method
                  ] || order.payment_method}
                </p>

                <p className="mt-1 text-sm capitalize text-gray-600">
                  Status:{" "}
                  {order.payment_status}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Order Total
                </p>

                <p className="mt-1 text-xl font-bold text-blue-600">
                  ₹
                  {Number(
                    order.total_amount || 0
                  ).toFixed(2)}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {order.total_items || 0} item(s)
                </p>
              </div>
            </div>

            {isCancelled ? (
              <div className="border-t p-7 md:p-10">
                <div className="rounded-2xl bg-red-50 p-6 text-center">
                  <h3 className="text-xl font-bold text-red-700">
                    Order Cancelled
                  </h3>

                  <p className="mt-2 text-red-600">
                    This order was cancelled on{" "}
                    {formatDate(
                      order.cancelled_at
                    )}
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-t p-7 md:p-10">
                <h3 className="text-2xl font-bold">
                  Order Status
                </h3>

                <div className="mt-8 space-y-0">
                  {ORDER_STEPS.map(
                    (step, index) => {
                      const completed =
                        currentStatusIndex >= index;

                      const current =
                        currentStatusIndex === index;

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
                              <h4
                                className={`text-lg font-bold ${
                                  completed
                                    ? "text-gray-950"
                                    : "text-gray-400"
                                }`}
                              >
                                {step.title}
                              </h4>

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
              </div>
            )}

            <div className="border-t p-7 md:p-10">
              <h3 className="text-xl font-bold">
                Items
              </h3>

              <div className="mt-5 space-y-4">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border p-4"
                  >
                    {item.product_image ? (
                      <img
                        src={
                          item.product_image.startsWith(
                            "http"
                          )
                            ? item.product_image
                            : `http://127.0.0.1:8000${item.product_image}`
                        }
                        alt={item.product_name}
                        className="h-24 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-20 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                        No Image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 font-semibold">
                        {item.product_name}
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                        {item.color && (
                          <span>
                            Color: {item.color}
                          </span>
                        )}

                        {item.size && (
                          <span>
                            Size: {item.size}
                          </span>
                        )}

                        <span>
                          Qty: {item.quantity}
                        </span>
                      </div>

                      <p className="mt-2 font-bold text-blue-600">
                        ₹
                        {Number(
                          item.total_price || 0
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t bg-gray-50 p-7 md:p-10">
              <h3 className="text-xl font-bold">
                Shipping Address
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {order.full_address ||
                  [
                    order.address_line_1,
                    order.address_line_2,
                    order.landmark,
                    order.city,
                    order.state,
                    order.postal_code,
                    order.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
              </p>

              <button
                type="button"
                onClick={resetTracking}
                className="mt-6 rounded-full border border-black px-6 py-3 font-semibold transition hover:bg-black hover:text-white"
              >
                Track Another Order
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default TrackOrder;