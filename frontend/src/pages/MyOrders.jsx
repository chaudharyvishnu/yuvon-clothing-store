import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  cancelOrder,
  downloadInvoice,
  fetchMyOrders,
} from "../services/api";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
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

const CANCELLABLE_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
]);

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Orders load nahi ho paaye."
    );
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    return String(error.data.detail);
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
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

function getOrderItems(order) {
  if (Array.isArray(order.items)) {
    return order.items;
  }

  if (
    Array.isArray(order.order_items)
  ) {
    return order.order_items;
  }

  return [];
}

function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    cancellingOrderNumber,
    setCancellingOrderNumber,
  ] = useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    downloadingInvoiceNumber,
    setDownloadingInvoiceNumber,
  ] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetchMyOrders();

      const orderList = Array.isArray(
        response
      )
        ? response
        : response.results ||
          response.orders ||
          [];

      setOrders(orderList);
    } catch (fetchError) {
      console.error(
        "Orders load error:",
        fetchError
      );

      setError(
        formatApiError(fetchError)
      );

      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders =
    useMemo(() => {
      let result = orders;

      if (activeFilter === "active") {
        result = result.filter(
          (order) =>
            ![
              "delivered",
              "cancelled",
              "returned",
              "refunded",
            ].includes(order.status)
        );
      } else if (activeFilter !== "all") {
        result = result.filter(
          (order) =>
            order.status === activeFilter
        );
      }

      const normalizedSearch = searchTerm
        .trim()
        .toLowerCase();

      if (!normalizedSearch) {
        return result;
      }

      return result.filter((order) => {
        const orderNumber = String(
          order.order_number ||
            order.orderNumber ||
            order.id ||
            ""
        ).toLowerCase();

        return orderNumber.includes(
          normalizedSearch
        );
      });
    }, [
      orders,
      activeFilter,
      searchTerm,
    ]);


  const handleDownloadInvoice = async (
    order
  ) => {
    const orderNumber =
      order.order_number ||
      order.orderNumber ||
      order.id;

    if (!orderNumber) {
      alert(
        "Order number is not available."
      );
      return;
    }

    try {
      setDownloadingInvoiceNumber(
        orderNumber
      );

      const invoiceBlob =
        await downloadInvoice(
          orderNumber
        );

      const fileUrl =
        window.URL.createObjectURL(
          invoiceBlob
        );

      const link =
        document.createElement("a");

      link.href = fileUrl;
      link.download =
        `invoice-${orderNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        fileUrl
      );
    } catch (invoiceError) {
      console.error(
        "Invoice download error:",
        invoiceError
      );

      alert(
        formatApiError(invoiceError)
      );
    } finally {
      setDownloadingInvoiceNumber(
        ""
      );
    }
  };

  const handleCancelOrder = async (
    order
  ) => {
    const orderNumber =
      order.order_number ||
      order.orderNumber;

    if (!orderNumber) {
      return;
    }

    const confirmed =
      window.confirm(
        `Cancel order ${orderNumber}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingOrderNumber(
        orderNumber
      );

      const response =
        await cancelOrder(
          orderNumber
        );

      setOrders((currentOrders) =>
        currentOrders.map(
          (currentOrder) =>
            (
              currentOrder.order_number ||
              currentOrder.orderNumber
            ) === orderNumber
              ? {
                  ...currentOrder,
                  status:
                    response.order
                      ?.status ||
                    response.status ||
                    "cancelled",
                  cancelled_at:
                    response.order
                      ?.cancelled_at ||
                    response.cancelled_at ||
                    new Date().toISOString(),
                }
              : currentOrder
        )
      );

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
        formatApiError(cancelError)
      );
    } finally {
      setCancellingOrderNumber(
        ""
      );
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              My Account
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
              My Orders

              <span className="ml-3 text-lg font-medium text-blue-600">
                ({orders.length})
              </span>
            </h1>

            <p className="mt-2 text-gray-500">
              View, track and manage your
              orders.
            </p>
          </div>

          <Link
            to="/shop"
            className="w-fit rounded-full bg-black px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
          >
            Continue Shopping
          </Link>
        </div>

          <div className="mt-8">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search Order Number..."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {[
            {
              value: "all",
              label: "All Orders",
            },
            {
              value: "active",
              label: "Active",
            },
            {
              value: "delivered",
              label: "Delivered",
            },
            {
              value: "cancelled",
              label: "Cancelled",
            },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                setActiveFilter(
                  filter.value
                )
              }
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                activeFilter ===
                filter.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-600"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-8 space-y-6">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:justify-between">
                    <div className="space-y-3">
                      <div className="h-5 w-52 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                    </div>

                    <div className="h-9 w-28 animate-pulse rounded-full bg-gray-200" />
                  </div>

                  <div className="mt-6 h-28 animate-pulse rounded-2xl bg-gray-100" />
                </div>
              )
            )}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-red-600">
              Orders load nahi ho paaye
            </h2>

            <p className="mt-3 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadOrders}
              className="mt-6 rounded-full bg-black px-6 py-3 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredOrders.length === 0 && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="text-5xl">
                📦
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                No orders found
              </h2>

              <p className="mt-2 text-gray-500">
                Is category me abhi koi
                order available nahi hai.
              </p>

              <Link
                to="/shop"
                className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
              >
                Start Shopping
              </Link>
            </div>
          )}

        {!loading &&
          !error &&
          filteredOrders.length > 0 && (
            <div className="mt-8 space-y-6">
              {filteredOrders.map(
                (order) => {
                  const orderNumber =
                    order.order_number ||
                    order.orderNumber ||
                    order.id;

                  const orderItems =
                    getOrderItems(order);

                  const status =
                    order.status ||
                    "pending";

                  const canCancel =
                    CANCELLABLE_STATUSES.has(
                      status
                    );

                  const isCancelling =
                    cancellingOrderNumber ===
                    orderNumber;

                  return (
                    <article
                      key={orderNumber}
                      className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-5 border-b bg-gray-50 p-6 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            Order Number
                          </p>

                          <h2 className="mt-1 text-xl font-bold">
                            {orderNumber}
                          </h2>

                          <p className="mt-2 text-sm text-gray-500">
                            Placed on{" "}
                            {formatDate(
                              order.placed_at ||
                                order.created_at
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 md:items-end">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                                STATUS_STYLES[status] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {STATUS_LABELS[status] || status}
                            </span>

                            <span className="text-xl font-bold text-blue-600">
                              ₹
                              {Number(
                                order.total_amount ||
                                  order.total ||
                                  0
                              ).toFixed(2)}
                            </span>
                          </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                          <p>
                           Payment Status:
                           <span className="ml-2 font-semibold capitalize text-gray-800">
                             {order.payment_status ||
                              order.payment?.status ||
                               "Pending"}
                            </span>
                          </p>

                          <p>
                           Payment Method:
                            <span className="ml-2 font-semibold uppercase text-gray-800">
                              {order.payment_method ||
                                order.payment?.method ||
                                "COD"}
                            </span>
                          </p>
                        </div>
                      </div>
                      </div>

                      <div className="p-6">
                        <div className="space-y-4">
                          {orderItems
                            .slice(0, 3)
                            .map(
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

                                return (
                                  <div
                                    key={
                                      item.id ||
                                      `${orderNumber}-${index}`
                                    }
                                    className="flex gap-4 rounded-2xl border p-4"
                                  >
                                    {image ? (
                                      <img
                                        src={
                                          image.startsWith(
                                            "http"
                                          )
                                            ? image
                                            : `${API_BASE}${
                                                image.startsWith(
                                                  "/"
                                                )
                                                  ? image
                                                  : `/${image}`
                                              }`
                                        }
                                        alt={
                                          item.product_name ||
                                          item.name ||
                                          "Product"
                                        }
                                        className="h-24 w-20 rounded-xl object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-24 w-20 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                                        No Image
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <h3 className="line-clamp-2 font-semibold">
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
                                          Qty:{" "}
                                          {item.quantity ||
                                            1}
                                        </span>
                                      </div>

                                      <p className="mt-2 font-bold text-blue-600">
                                        ₹
                                        {Number(
                                          item.total_price ||
                                            item.subtotal ||
                                            Number(
                                              item.price ||
                                                0
                                            ) *
                                              Number(
                                                item.quantity ||
                                                  1
                                              )
                                        ).toFixed(
                                          2
                                        )}
                                      </p>
                                    </div>

                                    {status ===
                                      "delivered" &&
                                      (item.product_id ||
                                        item.product
                                          ?.id) && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(
                                              `/product/${
                                                item.product_id ||
                                                item
                                                  .product
                                                  ?.id
                                              }#customer-reviews`
                                            )
                                          }
                                          className="h-fit rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600"
                                        >
                                          Review
                                        </button>
                                      )}
                                  </div>
                                );
                              }
                            )}
                        </div>

                        {orderItems.length >
                          3 && (
                          <p className="mt-4 text-sm text-gray-500">
                            +
                            {orderItems.length -
                              3}{" "}
                            more item(s)
                          </p>
                        )}

                        <div className="mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/track-order?order=${encodeURIComponent(
                                  orderNumber
                                )}&phone=${encodeURIComponent(
                                  order.phone ||
                                    ""
                                )}`
                              )
                            }
                            className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
                          >
                            Track Order
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/my-orders/${encodeURIComponent(
                                  orderNumber
                                )}`
                              )
                            }
                            className="rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-800"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            disabled={
                              downloadingInvoiceNumber ===
                              orderNumber
                            }
                            onClick={() =>
                              handleDownloadInvoice(
                                order
                              )
                            }
                            className="rounded-full border border-blue-600 px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingInvoiceNumber ===
                            orderNumber
                              ? "Downloading..."
                              : "Download Invoice"}
                          </button>

                          {canCancel && (
                            <button
                              type="button"
                              disabled={
                                isCancelling
                              }
                              onClick={() =>
                                handleCancelOrder(
                                  order
                                )
                              }
                              className="rounded-full border border-red-500 px-6 py-3 font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCancelling
                                ? "Cancelling..."
                                : "Cancel Order"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </div>
    </section>
  );
}

export default MyOrders;