import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  fetchAdminOrders,
} from "../../services/api";

import "../../styles/dashboard.css";


const DEFAULT_FILTERS = {
  search: "",
  status: "",
  payment_status: "",
  payment_method: "",
  city: "",
  state: "",
  date_from: "",
  date_to: "",
  ordering: "-placed_at",
};


const STATUS_OPTIONS = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "shipped",
    label: "Shipped",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];


const PAYMENT_STATUS_OPTIONS = [
  {
    value: "",
    label: "All Payment Statuses",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];


const PAYMENT_METHOD_OPTIONS = [
  {
    value: "",
    label: "All Payment Methods",
  },
  {
    value: "cod",
    label: "COD",
  },
  {
    value: "razorpay",
    label: "Razorpay",
  },
];


const ORDERING_OPTIONS = [
  {
    value: "-placed_at",
    label: "Newest First",
  },
  {
    value: "placed_at",
    label: "Oldest First",
  },
  {
    value: "-updated_at",
    label: "Recently Updated",
  },
  {
    value: "updated_at",
    label: "Oldest Updated",
  },
  {
    value: "-total_amount",
    label: "Amount: High to Low",
  },
  {
    value: "total_amount",
    label: "Amount: Low to High",
  },
  {
    value: "estimated_delivery",
    label: "Delivery: Earliest First",
  },
  {
    value: "-estimated_delivery",
    label: "Delivery: Latest First",
  },
];


const formatCurrency = (value) => {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(amount);
};


const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};


const formatStatusLabel = (value) => {
  return String(
    value || "-"
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};


const getStatusClassName = (status) => {
  return [
    "admin-orders-badge",
    `admin-orders-badge-${String(
      status || "unknown"
    ).replace(
      /_/g,
      "-"
    )}`,
  ].join(" ");
};


const AdminOrders = () => {
  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(
    DEFAULT_FILTERS
  );

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    count,
    setCount,
  ] = useState(0);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(25);

  const [
    hasNext,
    setHasNext,
  ] = useState(false);

  const [
    hasPrevious,
    setHasPrevious,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  const totalPages =
    useMemo(
      () => {
        if (!count) {
          return 1;
        }

        return Math.max(
          1,
          Math.ceil(
            count / pageSize
          )
        );
      },
      [
        count,
        pageSize,
      ]
    );


  const loadOrders =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetchAdminOrders({
              ...appliedFilters,

              page,
              page_size:
                pageSize,
            });

          setOrders(
            Array.isArray(
              response?.results
            )
              ? response.results
              : []
          );

          setCount(
            Number(
              response?.count ||
              0
            )
          );

          setHasNext(
            Boolean(
              response?.next
            )
          );

          setHasPrevious(
            Boolean(
              response?.previous
            )
          );
        } catch (
          requestError
        ) {
          setOrders([]);
          setCount(0);
          setHasNext(false);
          setHasPrevious(false);

          setError(
            requestError?.message ||
              "Unable to load admin orders."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        appliedFilters,
        page,
        pageSize,
      ]
    );


  useEffect(
    () => {
      loadOrders();
    },
    [
      loadOrders,
    ]
  );


  const handleFilterChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFilters(
        (
          currentFilters
        ) => ({
          ...currentFilters,
          [name]:
            value,
        })
      );
    };


  const handleApplyFilters =
    (event) => {
      event.preventDefault();

      setPage(1);

      setAppliedFilters({
        ...filters,
      });
    };


  const handleResetFilters =
    () => {
      setFilters(
        DEFAULT_FILTERS
      );

      setAppliedFilters(
        DEFAULT_FILTERS
      );

      setPage(1);
    };


  const handlePageSizeChange =
    (event) => {
      const nextPageSize =
        Number(
          event.target.value
        );

      setPageSize(
        nextPageSize
      );

      setPage(1);
    };


  const firstResult =
    count === 0
      ? 0
      : (
          (page - 1) *
            pageSize
        ) + 1;

  const lastResult =
    Math.min(
      page * pageSize,
      count
    );


  return (
    <main className="admin-dashboard-page">

      <section className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            Yuvon Admin
          </p>

          <h1>
            Orders
          </h1>

          <p className="dashboard-subtitle">
            Search, filter and manage customer orders.
          </p>

          {loading && (
            <p className="dashboard-loading-text">
              Loading orders...
            </p>
          )}
        </div>

        <div className="dashboard-header-actions">
          <Link
            to="/admin/dashboard"
            className="dashboard-button dashboard-button-secondary"
          >
            Dashboard
          </Link>

          <button
            type="button"
            className="dashboard-button dashboard-button-primary"
            onClick={
              loadOrders
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Refreshing..."
              : "Refresh Orders"}
          </button>
        </div>
      </section>


      <section className="dashboard-filter-card">
        <form
          className="admin-orders-filter-form"
          onSubmit={
            handleApplyFilters
          }
        >

          <div className="dashboard-filter-field">
            <label htmlFor="admin-order-search">
              Search
            </label>

            <input
              id="admin-order-search"
              name="search"
              type="search"
              placeholder="Order, customer, phone, tracking..."
              value={
                filters.search
              }
              onChange={
                handleFilterChange
              }
            />
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-order-status">
              Order Status
            </label>

            <select
              id="admin-order-status"
              name="status"
              value={
                filters.status
              }
              onChange={
                handleFilterChange
              }
            >
              {STATUS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value ||
                      "all"
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-payment-status">
              Payment Status
            </label>

            <select
              id="admin-payment-status"
              name="payment_status"
              value={
                filters.payment_status
              }
              onChange={
                handleFilterChange
              }
            >
              {PAYMENT_STATUS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value ||
                      "all"
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-payment-method">
              Payment Method
            </label>

            <select
              id="admin-payment-method"
              name="payment_method"
              value={
                filters.payment_method
              }
              onChange={
                handleFilterChange
              }
            >
              {PAYMENT_METHOD_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value ||
                      "all"
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-city">
              City
            </label>

            <input
              id="admin-city"
              name="city"
              type="text"
              placeholder="Delhi"
              value={
                filters.city
              }
              onChange={
                handleFilterChange
              }
            />
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-state">
              State
            </label>

            <input
              id="admin-state"
              name="state"
              type="text"
              placeholder="Delhi"
              value={
                filters.state
              }
              onChange={
                handleFilterChange
              }
            />
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-date-from">
              From
            </label>

            <input
              id="admin-date-from"
              name="date_from"
              type="date"
              value={
                filters.date_from
              }
              onChange={
                handleFilterChange
              }
            />
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-date-to">
              To
            </label>

            <input
              id="admin-date-to"
              name="date_to"
              type="date"
              value={
                filters.date_to
              }
              onChange={
                handleFilterChange
              }
            />
          </div>


          <div className="dashboard-filter-field">
            <label htmlFor="admin-ordering">
              Sort By
            </label>

            <select
              id="admin-ordering"
              name="ordering"
              value={
                filters.ordering
              }
              onChange={
                handleFilterChange
              }
            >
              {ORDERING_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>


          <div className="dashboard-filter-actions">
            <button
              type="submit"
              className="dashboard-button dashboard-button-primary"
              disabled={
                loading
              }
            >
              Apply Filters
            </button>

            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleResetFilters
              }
              disabled={
                loading
              }
            >
              Reset
            </button>
          </div>

        </form>
      </section>


      {error && (
        <section className="dashboard-error">
          {error}
        </section>
      )}


      <section className="dashboard-section">
        <article className="dashboard-panel">

          <div className="dashboard-section-header">
            <div>
              <h2>
                All Orders
              </h2>

              <p>
                {count
                  ? `Showing ${firstResult}-${lastResult} of ${count} orders`
                  : "No orders found"}
              </p>
            </div>

            <div className="admin-orders-page-size">
              <label htmlFor="admin-orders-page-size">
                Per page
              </label>

              <select
                id="admin-orders-page-size"
                value={
                  pageSize
                }
                onChange={
                  handlePageSizeChange
                }
                disabled={
                  loading
                }
              >
                <option value="10">
                  10
                </option>

                <option value="25">
                  25
                </option>

                <option value="50">
                  50
                </option>

                <option value="100">
                  100
                </option>
              </select>
            </div>
          </div>


          <div className="dashboard-table-wrap">
            <table className="dashboard-table admin-orders-table">
              <thead>
                <tr>
                  <th>
                    Order
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Courier
                  </th>

                  <th>
                    Placed
                  </th>

                  <th>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="admin-orders-empty-cell"
                    >
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map(
                    (
                      order
                    ) => (
                      <tr
                        key={
                          order.id ??
                          order.order_number
                        }
                      >
                        <td>
                          <strong>
                            {
                              order.order_number
                            }
                          </strong>

                          <small className="dashboard-table-subtext">
                            {order.total_items || 0} item
                            {Number(
                              order.total_items ||
                                0
                            ) === 1
                              ? ""
                              : "s"}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {
                              order.full_name ||
                              "-"
                            }
                          </strong>

                          <small className="dashboard-table-subtext">
                            {
                              order.customer_email ||
                              "-"
                            }
                          </small>

                          <small className="dashboard-table-subtext">
                            {
                              order.phone ||
                              "-"
                            }
                          </small>
                        </td>

                        <td>
                          {
                            [
                              order.city,
                              order.state,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(", ") ||
                            "-"
                          }
                        </td>

                        <td>
                          <span
                            className={
                              getStatusClassName(
                                order.status
                              )
                            }
                          >
                            {
                              formatStatusLabel(
                                order.status
                              )
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              String(
                                order.payment_method ||
                                "-"
                              ).toUpperCase()
                            }
                          </strong>

                          <small className="dashboard-table-subtext">
                            {
                              formatStatusLabel(
                                order.payment_status
                              )
                            }
                          </small>
                        </td>

                        <td>
                          <strong>
                            {
                              formatCurrency(
                                order.total_amount
                              )
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            order.courier_name ||
                            "-"
                          }

                          {order.tracking_id && (
                            <small className="dashboard-table-subtext">
                              {
                                order.tracking_id
                              }
                            </small>
                          )}
                        </td>

                        <td>
                          {
                            formatDateTime(
                              order.placed_at
                            )
                          }
                        </td>

                        <td>
                          <Link
                            to={`/admin/orders/${encodeURIComponent(
                              order.order_number
                            )}`}
                            className="dashboard-button dashboard-button-secondary admin-orders-view-button"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="admin-orders-empty-cell"
                    >
                      No orders match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          <div className="admin-orders-pagination">
            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={() =>
                setPage(
                  (
                    currentPage
                  ) =>
                    Math.max(
                      1,
                      currentPage - 1
                    )
                )
              }
              disabled={
                loading ||
                !hasPrevious ||
                page <= 1
              }
            >
              Previous
            </button>

            <span>
              Page{" "}
              <strong>
                {page}
              </strong>{" "}
              of{" "}
              <strong>
                {totalPages}
              </strong>
            </span>

            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={() =>
                setPage(
                  (
                    currentPage
                  ) =>
                    Math.min(
                      totalPages,
                      currentPage + 1
                    )
                )
              }
              disabled={
                loading ||
                !hasNext ||
                page >=
                  totalPages
              }
            >
              Next
            </button>
          </div>

        </article>
      </section>

    </main>
  );
};


export default AdminOrders;