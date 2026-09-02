import {
  useCallback,
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
  fetchOrderTracking,
} from "../services/api";


const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";


const STATUS_LABELS = {
  pending: "Pending",
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

  in_transit:
    "bg-sky-100 text-sky-700",

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


const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
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
      "Your order has been handed over to the courier.",
  },

  {
    key: "in_transit",
    title: "In Transit",
    description:
      "Your shipment is travelling towards your delivery location.",
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
  in_transit: 5,
  out_for_delivery: 6,
  delivered: 7,
};


const CANCELLABLE_STATUSES =
  new Set([
    "pending",
    "confirmed",
    "processing",
  ]);


// =========================================================
// Formatting Helpers
// =========================================================

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}


function formatMoney(
  value
) {
  const amount =
    Number(
      value || 0
    );


  if (
    Number.isNaN(
      amount
    )
  ) {
    return "0.00";
  }


  return amount.toFixed(
    2
  );
}


function formatApiError(
  error
) {
  if (
    !error?.data
  ) {
    return (
      error?.message ||
      "Order details load nahi ho paayi."
    );
  }


  if (
    typeof error.data ===
    "string"
  ) {
    return error.data;
  }


  if (
    error.data.detail
  ) {
    return String(
      error.data.detail
    );
  }


  if (
    error.data.message
  ) {
    return String(
      error.data.message
    );
  }


  return Object.entries(
    error.data
  )
    .map(
      (
        [
          field,
          messages,
        ]
      ) => {
        if (
          Array.isArray(
            messages
          )
        ) {
          return `${field}: ${messages.join(
            " "
          )}`;
        }


        if (
          typeof messages ===
          "object" &&
          messages !==
          null
        ) {
          return `${field}: ${JSON.stringify(
            messages
          )}`;
        }


        return `${field}: ${String(
          messages
        )}`;
      }
    )
    .join(
      " "
    );
}


// =========================================================
// Image Helper
// =========================================================

function getImageUrl(
  image
) {
  if (!image) {
    return "";
  }


  const imageValue =
    typeof image ===
    "string"
      ? image
      : image?.url ||
        image?.image ||
        "";


  if (!imageValue) {
    return "";
  }


  if (
    imageValue.startsWith(
      "http://"
    ) ||
    imageValue.startsWith(
      "https://"
    ) ||
    imageValue.startsWith(
      "data:"
    ) ||
    imageValue.startsWith(
      "blob:"
    )
  ) {
    return imageValue;
  }


  return `${BACKEND_URL}${
    imageValue.startsWith(
      "/"
    )
      ? imageValue
      : `/${imageValue}`
  }`;
}


// =========================================================
// Order Helpers
// =========================================================

function getOrderItems(
  order
) {
  if (
    Array.isArray(
      order?.items
    )
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


function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


function getTrackingPayload(
  response
) {
  if (!response) {
    return null;
  }


  return (
    response?.tracking ||
    response?.shipment ||
    response?.data ||
    response
  );
}


function getTrackingStatus(
  order,
  tracking
) {
  const possibleStatus =
    tracking?.shipping_status ||
    tracking?.shipment_status ||
    tracking?.status ||
    order?.shipping_status ||
    order?.status ||
    "pending";


  const normalized =
    normalizeStatus(
      possibleStatus
    );


  if (
    normalized ===
    "in_transit" ||
    normalized ===
    "intransit"
  ) {
    return "in_transit";
  }


  if (
    normalized ===
    "out_for_delivery" ||
    normalized ===
    "outfordelivery"
  ) {
    return "out_for_delivery";
  }


  if (
    normalized ===
    "delivered"
  ) {
    return "delivered";
  }


  if (
    normalized ===
    "shipped"
  ) {
    return "shipped";
  }


  /*
   * Courier APIs may return statuses that do not directly
   * match our internal order workflow.
   *
   * In that case, preserve the normal order.status.
   */
  if (
    STATUS_INDEX[
      normalized
    ] !==
    undefined
  ) {
    return normalized;
  }


  return normalizeStatus(
    order?.status ||
    "pending"
  );
}


function getStepTimestamp(
  stepKey,
  order,
  tracking
) {
  const timestamps = {
    pending:
      order?.placed_at ||
      order?.created_at,

    confirmed:
      order?.confirmed_at,

    processing:
      order?.processing_at,

    packed:
      order?.packed_at,

    shipped:
      tracking?.shipped_at ||
      order?.shipped_at,

    in_transit:
      tracking?.in_transit_at ||
      order?.in_transit_at,

    out_for_delivery:
      tracking?.out_for_delivery_at ||
      order?.out_for_delivery_at,

    delivered:
      tracking?.delivered_at ||
      order?.delivered_at,
  };


  return (
    timestamps[
      stepKey
    ] ||
    null
  );
}


// =========================================================
// Component
// =========================================================

function OrderDetails() {
  const {
    orderNumber,
  } = useParams();


  const navigate =
    useNavigate();


  const [
    order,
    setOrder,
  ] = useState(
    null
  );


  const [
    tracking,
    setTracking,
  ] = useState(
    null
  );


  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  const [
    cancelling,
    setCancelling,
  ] = useState(
    false
  );


  const [
    trackingLoading,
    setTrackingLoading,
  ] = useState(
    false
  );


  const [
    trackingError,
    setTrackingError,
  ] = useState(
    ""
  );


  // =======================================================
  // Load Order
  // =======================================================

  const loadOrder =
    useCallback(
      async () => {
        if (
          !orderNumber
        ) {
          setOrder(
            null
          );

          setTracking(
            null
          );

          setError(
            "Order number is missing."
          );

          setLoading(
            false
          );

          return;
        }


        setLoading(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await fetchOrder(
              orderNumber
            );


          const loadedOrder =
            response?.order ||
            response?.data ||
            response;


          setOrder(
            loadedOrder
          );


          /*
           * Tracking should not prevent the whole
           * Order Details page from loading.
           */
          setTrackingLoading(
            true
          );

          setTrackingError(
            ""
          );


          try {
            const trackingResponse =
              await fetchOrderTracking(
                loadedOrder?.order_number ||
                orderNumber
              );


            setTracking(
              getTrackingPayload(
                trackingResponse
              )
            );
          } catch (
            trackingFetchError
          ) {
            console.warn(
              "Order tracking load error:",
              trackingFetchError
            );


            setTracking(
              null
            );


            /*
             * 404 / no shipment yet is normal for a new order.
             * We keep it as a small shipping-section message.
             */
            setTrackingError(
              trackingFetchError?.status ===
                404
                ? ""
                : formatApiError(
                    trackingFetchError
                  )
            );
          } finally {
            setTrackingLoading(
              false
            );
          }
        } catch (
          fetchError
        ) {
          console.error(
            "Order details error:",
            fetchError
          );


          setError(
            formatApiError(
              fetchError
            )
          );


          setOrder(
            null
          );


          setTracking(
            null
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        orderNumber,
      ]
    );


  useEffect(
    () => {
      loadOrder();
    },
    [
      loadOrder,
    ]
  );


  // =======================================================
  // Derived Order Data
  // =======================================================

  const items =
    useMemo(
      () =>
        getOrderItems(
          order
        ),
      [
        order,
      ]
    );


  const orderStatus =
    normalizeStatus(
      order?.status ||
      "pending"
    );


  const shipmentStatus =
    getTrackingStatus(
      order,
      tracking
    );


  const timelineStatus =
    orderStatus ===
      "cancelled" ||
    orderStatus ===
      "returned" ||
    orderStatus ===
      "refunded"
      ? orderStatus
      : shipmentStatus;


  const currentStatusIndex =
    STATUS_INDEX[
      timelineStatus
    ] ??
    STATUS_INDEX[
      orderStatus
    ] ??
    -1;


  const isCancelled =
    orderStatus ===
    "cancelled";


  const isReturned =
    orderStatus ===
    "returned";


  const isRefunded =
    orderStatus ===
    "refunded";


  const hasShipment =
    Boolean(
      order?.shiprocket_shipment_id ||
      order?.shipment_id ||
      tracking?.shiprocket_shipment_id ||
      tracking?.shipment_id
    );


  const canCancel =
    typeof order?.is_cancellable ===
    "boolean"
      ? order.is_cancellable
      : (
          CANCELLABLE_STATUSES.has(
            orderStatus
          ) &&
          !hasShipment
        );


  const fullAddress =
    useMemo(
      () => {
        if (
          !order
        ) {
          return "";
        }


        if (
          order.full_address
        ) {
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
          .filter(
            Boolean
          )
          .join(
            ", "
          );
      },
      [
        order,
      ]
    );


  const totalItems =
    order?.total_items ??
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ||
          1
        ),
      0
    );


  // =======================================================
  // Shipping Details
  // =======================================================

  const courierName =
    tracking?.courier_name ||
    tracking?.courier ||
    order?.courier_name ||
    "";


  const courierService =
    tracking?.courier_service ||
    tracking?.service ||
    order?.courier_service ||
    "";


  const awbCode =
    tracking?.awb_code ||
    tracking?.tracking_id ||
    order?.awb_code ||
    order?.tracking_id ||
    "";


  const trackingUrl =
    tracking?.tracking_url ||
    order?.tracking_url ||
    "";


  const estimatedDelivery =
    tracking?.estimated_delivery ||
    tracking?.estimated_delivery_date ||
    order?.estimated_delivery ||
    "";


  const pickupScheduled =
    tracking?.pickup_scheduled ??
    order?.pickup_scheduled ??
    false;


  const shippingStatusText =
    tracking?.shipping_status ||
    tracking?.shipment_status ||
    order?.shipping_status ||
    "";


  // =======================================================
  // Cancel Order
  // =======================================================

  const handleCancel =
    async () => {
      if (
        !order ||
        !canCancel
      ) {
        return;
      }


      const currentOrderNumber =
        order.order_number ||
        orderNumber;


      const confirmed =
        window.confirm(
          `Cancel order ${currentOrderNumber}?`
        );


      if (
        !confirmed
      ) {
        return;
      }


      try {
        setCancelling(
          true
        );


        const response =
          await cancelOrder(
            currentOrderNumber
          );


        const updatedOrder =
          response?.order ||
          response?.data ||
          {
            ...order,

            status:
              response?.status ||
              "cancelled",

            cancelled_at:
              response?.cancelled_at ||
              new Date().toISOString(),
          };


        setOrder(
          (
            current
          ) => ({
            ...current,
            ...updatedOrder,
          })
        );


        window.alert(
          response?.message ||
          "Order cancelled successfully."
        );
      } catch (
        cancelError
      ) {
        console.error(
          "Order cancellation error:",
          cancelError
        );


        window.alert(
          formatApiError(
            cancelError
          )
        );
      } finally {
        setCancelling(
          false
        );
      }
    };


  // =======================================================
  // Loading State
  // =======================================================

  if (
    loading
  ) {
    return (
      <section className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mt-8 space-y-6">
            <div className="h-48 animate-pulse rounded-3xl bg-white" />

            <div className="h-72 animate-pulse rounded-3xl bg-white" />

            <div className="h-56 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </section>
    );
  }


  // =======================================================
  // Error State
  // =======================================================

  if (
    error ||
    !order
  ) {
    return (
      <section className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 text-center shadow-sm">
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
              onClick={
                loadOrder
              }
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


  // =======================================================
  // Main Page
  // =======================================================

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Back */}

        <button
          type="button"
          onClick={() =>
            navigate(
              "/my-orders"
            )
          }
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to My Orders
        </button>


        {/* =================================================
            Order Header
        ================================================= */}

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
                    orderStatus
                  ] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABELS[
                  orderStatus
                ] ||
                  orderStatus}
              </span>

              <span className="text-2xl font-bold text-blue-600">
                ₹
                {formatMoney(
                  order.total_amount ??
                  order.total
                )}
              </span>
            </div>
          </div>


          {/* Basic Information */}

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

              <p className="mt-1 text-sm text-gray-600">
                Status:{" "}
                {PAYMENT_STATUS_LABELS[
                  order.payment_status
                ] ||
                  order.payment_status ||
                  "Pending"}
              </p>
            </div>


            <div>
              <p className="text-sm text-gray-500">
                Items
              </p>

              <p className="mt-1 font-semibold">
                {totalItems}{" "}
                item(s)
              </p>
            </div>
          </div>
        </div>


        {/* =================================================
            Order Timeline
        ================================================= */}

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
                    order.phone ||
                    ""
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
          ) : isReturned ? (
            <div className="mt-7 rounded-2xl bg-gray-100 p-6 text-center">
              <h3 className="text-xl font-bold text-gray-700">
                Order Returned
              </h3>

              <p className="mt-2 text-gray-600">
                This order has been marked as returned.
              </p>
            </div>
          ) : isRefunded ? (
            <div className="mt-7 rounded-2xl bg-teal-50 p-6 text-center">
              <h3 className="text-xl font-bold text-teal-700">
                Order Refunded
              </h3>

              <p className="mt-2 text-teal-600">
                Refund processing for this order has been completed.
              </p>
            </div>
          ) : (
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


                  const timestamp =
                    getStepTimestamp(
                      step.key,
                      order,
                      tracking
                    );


                  return (
                    <div
                      key={
                        step.key
                      }
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
                            : index +
                              1}
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
                            {
                              step.title
                            }
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
                          {
                            step.description
                          }
                        </p>

                        {timestamp && (
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDate(
                              timestamp
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>


        {/* =================================================
            Courier / Shipment Information
        ================================================= */}

        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Shipping & Tracking
              </h2>

              <p className="mt-2 text-gray-500">
                Courier and shipment information for this order.
              </p>
            </div>

            {trackingLoading && (
              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
                Updating...
              </span>
            )}
          </div>


          {trackingError && (
            <div className="mt-5 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700">
              {trackingError}
            </div>
          )}


          {!hasShipment &&
          !awbCode &&
          !courierName ? (
            <div className="mt-6 rounded-2xl bg-gray-50 p-6">
              <p className="font-semibold text-gray-700">
                Shipment not created yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Courier details will appear here after your order is prepared for shipping.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Courier
                </p>

                <p className="mt-2 font-bold">
                  {courierName ||
                    "—"}
                </p>

                {courierService && (
                  <p className="mt-1 text-sm text-gray-500">
                    {courierService}
                  </p>
                )}
              </div>


              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  AWB / Tracking ID
                </p>

                <p className="mt-2 break-all font-bold">
                  {awbCode ||
                    "—"}
                </p>
              </div>


              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Shipping Status
                </p>

                <p className="mt-2 font-bold">
                  {shippingStatusText
                    ? STATUS_LABELS[
                        normalizeStatus(
                          shippingStatusText
                        )
                      ] ||
                      shippingStatusText
                    : STATUS_LABELS[
                        shipmentStatus
                      ] ||
                      shipmentStatus ||
                      "—"}
                </p>
              </div>


              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Estimated Delivery
                </p>

                <p className="mt-2 font-bold">
                  {estimatedDelivery
                    ? formatDate(
                        estimatedDelivery
                      )
                    : "—"}
                </p>
              </div>


              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Pickup
                </p>

                <p className="mt-2 font-bold">
                  {pickupScheduled
                    ? "Scheduled"
                    : "Not Scheduled"}
                </p>

                {order.pickup_scheduled_at && (
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(
                      order.pickup_scheduled_at
                    )}
                  </p>
                )}
              </div>


              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Shipment ID
                </p>

                <p className="mt-2 break-all font-bold">
                  {tracking?.shiprocket_shipment_id ||
                    tracking?.shipment_id ||
                    order.shiprocket_shipment_id ||
                    order.shipment_id ||
                    "—"}
                </p>
              </div>
            </div>
          )}


          {trackingUrl && (
            <div className="mt-6">
              <a
                href={
                  trackingUrl
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Track with Courier
              </a>
            </div>
          )}
        </div>


        {/* =================================================
            Ordered Items
        ================================================= */}

        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">
            Ordered Items
          </h2>

          {items.length ===
          0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              No order items found.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map(
                (
                  item,
                  index
                ) => {
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
                    item.product
                      ?.id;


                  const unitPrice =
                    item.unit_price ??
                    item.price ??
                    0;


                  const itemTotal =
                    item.total_price ??
                    item.subtotal ??
                    Number(
                      unitPrice ||
                      0
                    ) *
                      Number(
                        item.quantity ||
                        1
                      );


                  const sku =
                    item.variant_sku ||
                    item.sku ||
                    item.product_sku ||
                    "";


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
                              {
                                item.size
                              }
                            </span>
                          )}

                          <span>
                            Quantity:{" "}
                            {item.quantity ||
                              1}
                          </span>

                          {sku && (
                            <span>
                              SKU:{" "}
                              {
                                sku
                              }
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

                          {unitPrice !==
                            undefined &&
                            unitPrice !==
                              null && (
                            <p className="text-sm text-gray-500">
                              ₹
                              {formatMoney(
                                unitPrice
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

                        {orderStatus ===
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


        {/* =================================================
            Shipping Address + Price Summary
        ================================================= */}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">

          {/* Shipping Address */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">
              Shipping Address
            </h2>

            <p className="mt-4 font-semibold">
              {order.full_name ||
                "Customer"}
            </p>

            <p className="mt-2 leading-7 text-gray-600">
              {fullAddress ||
                "—"}
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


          {/* Price Summary */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">
              Price Summary
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>
                  Subtotal
                </span>

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


              {Number(
                order.tax_amount ||
                0
              ) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    Tax
                  </span>

                  <span>
                    ₹
                    {formatMoney(
                      order.tax_amount
                    )}
                  </span>
                </div>
              )}


              <div className="flex justify-between text-gray-600">
                <span>
                  Discount
                </span>

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
                <span>
                  Total
                </span>

                <span className="text-blue-600">
                  ₹
                  {formatMoney(
                    order.total_amount ??
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
                disabled={
                  cancelling
                }
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