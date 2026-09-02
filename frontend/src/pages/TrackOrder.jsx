import { useMemo, useState } from "react";

import { trackGuestOrder } from "../services/api";


const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");


const ORDER_STEPS = [
  {
    key: "pending",
    title: "Order Placed",
    description:
      "Your order has been successfully placed.",
  },
  {
    key: "confirmed",
    title: "Order Confirmed",
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
      "Your products have been packed.",
  },
  {
    key: "shipped",
    title: "Shipped",
    description:
      "Your order has been handed over to the courier.",
  },
  {
    key: "in_transit",
    title: "In Transit",
    description:
      "Your shipment is on the way to your city.",
  },
  {
    key: "out_for_delivery",
    title: "Out for Delivery",
    description:
      "Your order is out for delivery.",
  },
  {
    key: "delivered",
    title: "Delivered",
    description:
      "Your order has been delivered successfully.",
  },
];


const STATUS_INDEX = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  packed: 3,
  shipped: 4,
  in_transit: 5,
  out_for_delivery: 6,
  delivered: 7,
};


const STATUS_LABELS = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  in_transit: "In Transit",
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


const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
};


function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Order details could not be loaded."
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


function formatDateOnly(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}


function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(amount)
      ? amount
      : 0
  );
}


function getProductImageUrl(image) {
  if (!image) {
    return "";
  }

  const value = String(image).trim();

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return `${API_BASE_URL}${
    value.startsWith("/")
      ? value
      : `/${value}`
  }`;
}


function getStatusClasses(status) {
  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  if (
    status === "returned" ||
    status === "refunded"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "delivered") {
    return "bg-green-100 text-green-700";
  }

  if (
    status === "shipped" ||
    status === "in_transit" ||
    status === "out_for_delivery"
  ) {
    return "bg-purple-100 text-purple-700";
  }

  return "bg-blue-100 text-blue-700";
}


function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [mobile, setMobile] = useState("");

  const [order, setOrder] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const currentStatusIndex = useMemo(() => {
    if (!order) {
      return -1;
    }

    return (
      STATUS_INDEX[order.status] ??
      -1
    );
  }, [order]);


  const isCancelled =
    order?.status === "cancelled";

  const isReturned =
    order?.status === "returned";

  const isRefunded =
    order?.status === "refunded";

  const isDelivered =
    order?.status === "delivered";


  const hasCourierDetails = Boolean(
    order?.courier_name ||
      order?.courier_service ||
      order?.awb_code ||
      order?.tracking_id ||
      order?.tracking_url ||
      order?.shipping_status ||
      order?.shipment_id ||
      order?.shiprocket_shipment_id
  );


  const trackingNumber =
    order?.awb_code ||
    order?.tracking_id ||
    "";


  const shippingStatus =
    order?.shipping_status ||
    "";


  const handleTrack = async (event) => {
    event.preventDefault();

    setError("");
    setOrder(null);

    const cleanedOrderId =
      orderId.trim();

    const cleanedMobile =
      mobile.replace(/\D/g, "");

    if (!cleanedOrderId) {
      setError(
        "Please enter your Order ID."
      );
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

      const response =
        await trackGuestOrder(
          cleanedOrderId,
          cleanedMobile
        );

      const responseOrder =
        response?.order ||
        response?.data ||
        response;

      setOrder(responseOrder);

      setOrderId(
        responseOrder?.order_number ||
          cleanedOrderId
      );

      setMobile(cleanedMobile);
    } catch (trackError) {
      console.error(
        "Order tracking error:",
        trackError
      );

      setError(
        formatApiError(trackError)
      );
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* =================================================
            Search Card
        ================================================= */}

        <div className="rounded-3xl bg-white p-7 shadow-xl md:p-12">

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Order Tracking
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-950 md:text-4xl">
            Track Your Order
          </h1>

          <p className="mt-3 max-w-2xl text-gray-500">
            Enter your order number and the
            same mobile number used during
            checkout to see your latest order
            and delivery status.
          </p>


          <form
            onSubmit={handleTrack}
            className="mt-8"
          >
            <div className="grid gap-5 md:grid-cols-2">

              <input
                type="text"
                value={orderId}
                autoComplete="off"
                onChange={(event) =>
                  setOrderId(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Example: YUV-ABC1234567"
                className="rounded-xl border border-gray-300 px-5 py-4 uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />


              <div className="flex items-center rounded-xl border border-gray-300 bg-white px-5 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">

                <span className="mr-3 border-r pr-3 text-gray-500">
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
              <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
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


        {/* =================================================
            Order Details
        ================================================= */}

        {order && (
          <div className="mt-10 overflow-hidden rounded-3xl bg-white shadow-xl">

            {/* Header */}

            <div className="border-b p-7 md:p-10">

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div>
                  <p className="text-sm text-gray-500">
                    Order Number
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-gray-950">
                    {order.order_number}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Placed on{" "}
                    {formatDate(
                      order.placed_at
                    )}
                  </p>
                </div>


                <span
                  className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                    order.status
                  )}`}
                >
                  {STATUS_LABELS[
                    order.status
                  ] ||
                    order.status ||
                    "Unknown"}
                </span>

              </div>

            </div>


            {/* Order summary */}

            <div className="grid gap-8 p-7 sm:grid-cols-2 md:grid-cols-4 md:p-10">

              <div>
                <p className="text-sm text-gray-500">
                  Customer
                </p>

                <p className="mt-1 font-semibold text-gray-950">
                  {order.full_name || "—"}
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

                <p className="mt-1 font-semibold text-gray-950">
                  {PAYMENT_LABELS[
                    order.payment_method
                  ] ||
                    order.payment_method ||
                    "—"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Status:{" "}
                  {PAYMENT_STATUS_LABELS[
                    order.payment_status
                  ] ||
                    order.payment_status ||
                    "—"}
                </p>
              </div>


              <div>
                <p className="text-sm text-gray-500">
                  Order Total
                </p>

                <p className="mt-1 text-xl font-bold text-blue-600">
                  {formatCurrency(
                    order.total_amount
                  )}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {order.total_items ??
                    order.items?.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        Number(
                          item.quantity ||
                            0
                        ),
                      0
                    ) ??
                    0}{" "}
                  item(s)
                </p>
              </div>


              <div>
                <p className="text-sm text-gray-500">
                  Estimated Delivery
                </p>

                <p className="mt-1 font-semibold text-gray-950">
                  {order.estimated_delivery
                    ? formatDateOnly(
                        order.estimated_delivery
                      )
                    : isDelivered
                      ? "Delivered"
                      : "Updating soon"}
                </p>

                {isDelivered &&
                  order.delivered_at && (
                    <p className="mt-1 text-sm text-green-600">
                      {formatDate(
                        order.delivered_at
                      )}
                    </p>
                  )}
              </div>

            </div>


            {/* =================================================
                Courier / Shipment Information
            ================================================= */}

            {hasCourierDetails && (
              <div className="border-t bg-slate-50 p-7 md:p-10">

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-purple-600">
                      Delivery Partner
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-gray-950">
                      {order.courier_name ||
                        order.courier_service ||
                        "Courier Assigned"}
                    </h3>

                    {order.courier_service &&
                      order.courier_name !==
                        order.courier_service && (
                        <p className="mt-1 text-gray-600">
                          {
                            order.courier_service
                          }
                        </p>
                      )}
                  </div>


                  {shippingStatus && (
                    <span className="w-fit rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold capitalize text-purple-700">
                      {String(
                        shippingStatus
                      )
                        .replaceAll("_", " ")
                        .replaceAll("-", " ")}
                    </span>
                  )}

                </div>


                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      AWB / Tracking ID
                    </p>

                    <p className="mt-2 break-all font-bold text-gray-950">
                      {trackingNumber ||
                        "Not assigned yet"}
                    </p>
                  </div>


                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Shipment ID
                    </p>

                    <p className="mt-2 break-all font-bold text-gray-950">
                      {order.shiprocket_shipment_id ||
                        order.shipment_id ||
                        "Not created yet"}
                    </p>
                  </div>


                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Pickup
                    </p>

                    <p className="mt-2 font-bold text-gray-950">
                      {order.pickup_scheduled
                        ? "Scheduled"
                        : "Pending"}
                    </p>

                    {order.pickup_scheduled_at && (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(
                          order.pickup_scheduled_at
                        )}
                      </p>
                    )}
                  </div>


                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Estimated Delivery
                    </p>

                    <p className="mt-2 font-bold text-gray-950">
                      {order.estimated_delivery
                        ? formatDateOnly(
                            order.estimated_delivery
                          )
                        : "Updating soon"}
                    </p>
                  </div>

                </div>


                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700"
                  >
                    Track with Courier
                  </a>
                )}

              </div>
            )}


            {/* =================================================
                Cancelled
            ================================================= */}

            {isCancelled && (
              <div className="border-t p-7 md:p-10">

                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">

                  <h3 className="text-xl font-bold text-red-700">
                    Order Cancelled
                  </h3>

                  <p className="mt-2 text-red-600">
                    This order was cancelled
                    {order.cancelled_at
                      ? ` on ${formatDate(
                          order.cancelled_at
                        )}`
                      : ""}
                    .
                  </p>

                </div>

              </div>
            )}


            {/* =================================================
                Returned / Refunded
            ================================================= */}

            {(isReturned || isRefunded) && (
              <div className="border-t p-7 md:p-10">

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-center">

                  <h3 className="text-xl font-bold text-amber-700">
                    {isRefunded
                      ? "Order Refunded"
                      : "Order Returned"}
                  </h3>

                  <p className="mt-2 text-amber-700">
                    {isRefunded
                      ? "The refund for this order has been processed."
                      : "This order has been marked as returned."}
                  </p>

                </div>

              </div>
            )}


            {/* =================================================
                Timeline
            ================================================= */}

            {!isCancelled &&
              !isReturned &&
              !isRefunded && (
                <div className="border-t p-7 md:p-10">

                  <h3 className="text-2xl font-bold text-gray-950">
                    Delivery Progress
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Follow your order from
                    confirmation to delivery.
                  </p>


                  <div className="mt-8 space-y-0">

                    {ORDER_STEPS.map(
                      (
                        step,
                        index
                      ) => {
                        const completed =
                          currentStatusIndex >=
                          index;

                        const current =
                          currentStatusIndex ===
                          index;

                        let stepDate = null;

                        if (
                          step.key ===
                          "pending"
                        ) {
                          stepDate =
                            order.placed_at;
                        }

                        if (
                          step.key ===
                          "shipped"
                        ) {
                          stepDate =
                            order.shipped_at;
                        }

                        if (
                          step.key ===
                          "in_transit"
                        ) {
                          stepDate =
                            order.in_transit_at;
                        }

                        if (
                          step.key ===
                          "out_for_delivery"
                        ) {
                          stepDate =
                            order.out_for_delivery_at;
                        }

                        if (
                          step.key ===
                          "delivered"
                        ) {
                          stepDate =
                            order.delivered_at;
                        }

                        return (
                          <div
                            key={step.key}
                            className="flex gap-5"
                          >

                            <div className="flex flex-col items-center">

                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                                  completed
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-300 bg-white text-gray-400"
                                }`}
                              >
                                {completed
                                  ? "✓"
                                  : index +
                                    1}
                              </div>


                              {index !==
                                ORDER_STEPS.length -
                                  1 && (
                                <div
                                  className={`h-20 w-1 ${
                                    currentStatusIndex >
                                    index
                                      ? "bg-blue-600"
                                      : "bg-gray-200"
                                  }`}
                                />
                              )}

                            </div>


                            <div className="min-w-0 flex-1 pb-8">

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
                                {
                                  step.description
                                }
                              </p>


                              {stepDate && (
                                <p className="mt-2 text-xs font-medium text-gray-500">
                                  {formatDate(
                                    stepDate
                                  )}
                                </p>
                              )}

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>
              )}


            {/* =================================================
                Items
            ================================================= */}

            <div className="border-t p-7 md:p-10">

              <h3 className="text-xl font-bold text-gray-950">
                Items
              </h3>


              {order.items?.length ? (
                <div className="mt-5 space-y-4">

                  {order.items.map(
                    (item) => {
                      const imageUrl =
                        getProductImageUrl(
                          item.product_image
                        );

                      return (
                        <div
                          key={
                            item.id ||
                            `${item.product_name}-${item.variant_sku}`
                          }
                          className="flex gap-4 rounded-2xl border border-gray-200 p-4"
                        >

                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={
                                item.product_name ||
                                "Product"
                              }
                              className="h-24 w-20 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-center text-xs text-gray-400">
                              No Image
                            </div>
                          )}


                          <div className="min-w-0 flex-1">

                            <h4 className="line-clamp-2 font-semibold text-gray-950">
                              {
                                item.product_name
                              }
                            </h4>


                            {(item.variant_sku ||
                              item.product_sku) && (
                              <p className="mt-1 text-xs text-gray-400">
                                SKU:{" "}
                                {item.variant_sku ||
                                  item.product_sku}
                              </p>
                            )}


                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">

                              {item.color && (
                                <span>
                                  Color:{" "}
                                  {item.color}
                                </span>
                              )}

                              {item.size && (
                                <span>
                                  Size:{" "}
                                  {item.size}
                                </span>
                              )}

                              <span>
                                Qty:{" "}
                                {item.quantity}
                              </span>

                            </div>


                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

                              <p className="text-sm text-gray-500">
                                {formatCurrency(
                                  item.unit_price
                                )}{" "}
                                each
                              </p>

                              <p className="font-bold text-blue-600">
                                {formatCurrency(
                                  item.total_price
                                )}
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              ) : (
                <p className="mt-4 text-gray-500">
                  No item details available.
                </p>
              )}

            </div>


            {/* =================================================
                Shipping Address
            ================================================= */}

            <div className="border-t bg-gray-50 p-7 md:p-10">

              <h3 className="text-xl font-bold text-gray-950">
                Delivery Address
              </h3>

              <p className="mt-3 max-w-3xl leading-7 text-gray-600">
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
                    .join(", ") ||
                  "Address not available"}
              </p>


              <div className="mt-7 flex flex-wrap gap-3">

                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
                  >
                    Track Shipment
                  </a>
                )}


                <button
                  type="button"
                  onClick={resetTracking}
                  className="rounded-full border border-black px-6 py-3 font-semibold transition hover:bg-black hover:text-white"
                >
                  Track Another Order
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </section>
  );
}


export default TrackOrder;