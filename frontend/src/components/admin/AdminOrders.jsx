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


/* =========================================================
   Default Filters
========================================================= */

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  payment_status: "",
  payment_method: "",
  shipping_status: "",
  courier: "",
  city: "",
  state: "",
  date_from: "",
  date_to: "",
  ordering: "-placed_at",
};


/* =========================================================
   Order Status Options
========================================================= */

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
    value: "packed",
    label: "Packed",
  },

  {
    value: "shipped",
    label: "Shipped",
  },

  {
    value: "in_transit",
    label: "In Transit",
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


/* =========================================================
   Payment Status Options
========================================================= */

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


/* =========================================================
   Payment Method Options
========================================================= */

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


/* =========================================================
   Shipping Status Options
========================================================= */

const SHIPPING_STATUS_OPTIONS = [
  {
    value: "",
    label: "All Shipping Statuses",
  },

  {
    value: "created",
    label: "Shipment Created",
  },

  {
    value: "ready_to_ship",
    label: "Ready to Ship",
  },

  {
    value: "pickup_scheduled",
    label: "Pickup Scheduled",
  },

  {
    value: "shipped",
    label: "Shipped",
  },

  {
    value: "in_transit",
    label: "In Transit",
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

  {
    value: "rto",
    label: "RTO",
  },

  {
    value: "rto_delivered",
    label: "RTO Delivered",
  },
];


/* =========================================================
   Ordering Options
========================================================= */

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

  {
    value: "-shipped_at",
    label: "Recently Shipped",
  },

  {
    value: "-delivered_at",
    label: "Recently Delivered",
  },
];


/* =========================================================
   Currency Helper
========================================================= */

const formatCurrency = (
  value
) => {
  const amount =
    Number(
      value ||
      0
    );


  if (
    Number.isNaN(
      amount
    )
  ) {
    return "₹0.00";
  }


  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      maximumFractionDigits:
        2,
    }
  ).format(
    amount
  );
};


/* =========================================================
   Date / Time Helpers
========================================================= */

const formatDateTime = (
  value
) => {
  if (
    !value
  ) {
    return "-";
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
    return "-";
  }


  return date.toLocaleString(
    "en-IN",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  );
};


const formatDate = (
  value
) => {
  if (
    !value
  ) {
    return "-";
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
    return "-";
  }


  return date.toLocaleDateString(
    "en-IN",
    {
      dateStyle:
        "medium",
    }
  );
};


/* =========================================================
   Status Formatting
========================================================= */

const formatStatusLabel = (
  value
) => {
  return String(
    value ||
    "-"
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};


/* =========================================================
   Status Badge
========================================================= */

const getStatusClassName = (
  status
) => {
  return [
    "admin-orders-badge",

    `admin-orders-badge-${String(
      status ||
      "unknown"
    )
      .toLowerCase()
      .replace(
        /_/g,
        "-"
      )}`,
  ].join(
    " "
  );
};


/* =========================================================
   API Error
========================================================= */

const formatApiError = (
  error
) => {
  if (
    error?.data?.detail
  ) {
    return String(
      error.data.detail
    );
  }


  if (
    error?.data?.message
  ) {
    return String(
      error.data.message
    );
  }


  if (
    error?.message
  ) {
    return String(
      error.message
    );
  }


  return "Unable to load admin orders.";
};


/* =========================================================
   Response Normalization
========================================================= */

const normalizeOrdersResponse = (
  response
) => {
  /*
   * Standard DRF pagination:
   *
   * {
   *   count,
   *   next,
   *   previous,
   *   results
   * }
   */

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return {
      count:
        Number(
          response.count ||
          0
        ),

      next:
        response.next,

      previous:
        response.previous,

      results:
        response.results,
    };
  }


  /*
   * Wrapped response support:
   *
   * {
   *   data: {
   *     count,
   *     results
   *   }
   * }
   */

  if (
    Array.isArray(
      response?.data?.results
    )
  ) {
    return {
      count:
        Number(
          response.data.count ||
          0
        ),

      next:
        response.data.next,

      previous:
        response.data.previous,

      results:
        response.data.results,
    };
  }


  /*
   * Non-paginated fallback.
   */

  if (
    Array.isArray(
      response
    )
  ) {
    return {
      count:
        response.length,

      next:
        null,

      previous:
        null,

      results:
        response,
    };
  }


  if (
    Array.isArray(
      response?.data
    )
  ) {
    return {
      count:
        response.data.length,

      next:
        null,

      previous:
        null,

      results:
        response.data,
    };
  }


  return {
    count:
      0,

    next:
      null,

    previous:
      null,

    results:
      [],
  };
};


/* =========================================================
   Shipping Helpers
========================================================= */

const getShipmentId = (
  order
) => {
  return (
    order?.shiprocket_shipment_id ||
    order?.shipment_id ||
    ""
  );
};


const getAwbCode = (
  order
) => {
  return (
    order?.awb_code ||
    order?.tracking_id ||
    ""
  );
};


const getCourierName = (
  order
) => {
  return (
    order?.courier_name ||
    order?.courier_service ||
    ""
  );
};


const hasShipment = (
  order
) => {
  return Boolean(
    getShipmentId(
      order
    )
  );
};


/* =========================================================
   Component
========================================================= */

const AdminOrders = () => {

  /* =======================================================
     Filter State
  ======================================================= */

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


  /* =======================================================
     Orders
  ======================================================= */

  const [
    orders,
    setOrders,
  ] = useState(
    []
  );


  const [
    count,
    setCount,
  ] = useState(
    0
  );


  /* =======================================================
     Pagination
  ======================================================= */

  const [
    page,
    setPage,
  ] = useState(
    1
  );


  const [
    pageSize,
    setPageSize,
  ] = useState(
    25
  );


  const [
    hasNext,
    setHasNext,
  ] = useState(
    false
  );


  const [
    hasPrevious,
    setHasPrevious,
  ] = useState(
    false
  );


  /* =======================================================
     Loading / Error
  ======================================================= */

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


  /* =======================================================
     Total Pages
  ======================================================= */

  const totalPages =
    useMemo(
      () => {
        if (
          !count
        ) {
          return 1;
        }


        return Math.max(
          1,
          Math.ceil(
            count /
            pageSize
          )
        );
      },
      [
        count,
        pageSize,
      ]
    );


  /* =======================================================
     Summary Counts For Current Page
  ======================================================= */

  const pageSummary =
    useMemo(
      () => {
        return orders.reduce(
          (
            summary,
            order
          ) => {
            if (
              order?.payment_status ===
              "paid"
            ) {
              summary.paid +=
                1;
            }


            if (
              order?.status ===
              "pending"
            ) {
              summary.pending +=
                1;
            }


            if (
              order?.status ===
              "delivered"
            ) {
              summary.delivered +=
                1;
            }


            if (
              hasShipment(
                order
              )
            ) {
              summary.shipments +=
                1;
            }


            summary.value +=
              Number(
                order?.total_amount ||
                0
              );


            return summary;
          },
          {
            paid:
              0,

            pending:
              0,

            delivered:
              0,

            shipments:
              0,

            value:
              0,
          }
        );
      },
      [
        orders,
      ]
    );


  /* =======================================================
     Load Orders
  ======================================================= */

  const loadOrders =
    useCallback(
      async () => {
        setLoading(
          true
        );


        setError(
          ""
        );


        try {
          const response =
            await fetchAdminOrders({
              ...appliedFilters,

              page,

              page_size:
                pageSize,
            });


          const normalized =
            normalizeOrdersResponse(
              response
            );


          setOrders(
            normalized.results
          );


          setCount(
            normalized.count
          );


          setHasNext(
            Boolean(
              normalized.next
            )
          );


          setHasPrevious(
            Boolean(
              normalized.previous
            )
          );
        } catch (
          requestError
        ) {
          console.error(
            "Admin orders load error:",
            requestError
          );


          setOrders(
            []
          );


          setCount(
            0
          );


          setHasNext(
            false
          );


          setHasPrevious(
            false
          );


          setError(
            formatApiError(
              requestError
            )
          );
        } finally {
          setLoading(
            false
          );
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


  /* =======================================================
     Filter Change
  ======================================================= */

  const handleFilterChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;


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


  /* =======================================================
     Apply Filters
  ======================================================= */

  const handleApplyFilters =
    (
      event
    ) => {
      event.preventDefault();


      setPage(
        1
      );


      setAppliedFilters({
        ...filters,
      });
    };


  /* =======================================================
     Reset Filters
  ======================================================= */

  const handleResetFilters =
    () => {
      setFilters({
        ...DEFAULT_FILTERS,
      });


      setAppliedFilters({
        ...DEFAULT_FILTERS,
      });


      setPage(
        1
      );
    };


  /* =======================================================
     Page Size
  ======================================================= */

  const handlePageSizeChange =
    (
      event
    ) => {
      const nextPageSize =
        Number(
          event.target.value
        );


      setPageSize(
        nextPageSize
      );


      setPage(
        1
      );
    };


  /* =======================================================
     Result Range
  ======================================================= */

  const firstResult =
    count ===
    0
      ? 0
      : (
          (
            page -
            1
          ) *
          pageSize
        ) +
        1;


  const lastResult =
    Math.min(
      page *
      pageSize,

      count
    );


  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="admin-dashboard-page">

      {/* ===================================================
          Header
      =================================================== */}

      <section className="dashboard-header">

        <div>

          <p className="dashboard-eyebrow">
            Yuvon Admin
          </p>


          <h1>
            Orders
          </h1>


          <p className="dashboard-subtitle">
            Search, filter, ship and manage customer orders.
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
            {
              loading
                ? "Refreshing..."
                : "Refresh Orders"
            }
          </button>

        </div>

      </section>


      {/* ===================================================
          Current Page Summary
      =================================================== */}

      <section className="dashboard-three-column">

        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Orders on Page
          </span>


          <strong className="dashboard-panel-value">
            {
              orders.length
            }
          </strong>


          <small>
            {
              count
            }{" "}
            total orders
          </small>

        </article>


        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Shipments Created
          </span>


          <strong className="dashboard-panel-value">
            {
              pageSummary.shipments
            }
          </strong>


          <small>
            Current page
          </small>

        </article>


        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Page Order Value
          </span>


          <strong className="dashboard-panel-value">
            {
              formatCurrency(
                pageSummary.value
              )
            }
          </strong>


          <small>
            Current page
          </small>

        </article>

      </section>


      {/* ===================================================
          Filters
      =================================================== */}

      <section className="dashboard-filter-card">

        <form
          className="admin-orders-filter-form"
          onSubmit={
            handleApplyFilters
          }
        >

          {/* Search */}

          <div className="dashboard-filter-field">

            <label htmlFor="admin-order-search">
              Search
            </label>


            <input
              id="admin-order-search"
              name="search"
              type="search"
              placeholder="Order, customer, phone, AWB, tracking..."
              value={
                filters.search
              }
              onChange={
                handleFilterChange
              }
            />

          </div>


          {/* Order Status */}

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

              {
                STATUS_OPTIONS.map(
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
                )
              }

            </select>

          </div>


          {/* Payment Status */}

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

              {
                PAYMENT_STATUS_OPTIONS.map(
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
                )
              }

            </select>

          </div>


          {/* Payment Method */}

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

              {
                PAYMENT_METHOD_OPTIONS.map(
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
                )
              }

            </select>

          </div>


          {/* Shipping Status */}

          <div className="dashboard-filter-field">

            <label htmlFor="admin-shipping-status">
              Shipping Status
            </label>


            <select
              id="admin-shipping-status"
              name="shipping_status"
              value={
                filters.shipping_status
              }
              onChange={
                handleFilterChange
              }
            >

              {
                SHIPPING_STATUS_OPTIONS.map(
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
                )
              }

            </select>

          </div>


          {/* Courier */}

          <div className="dashboard-filter-field">

            <label htmlFor="admin-courier">
              Courier
            </label>


            <input
              id="admin-courier"
              name="courier"
              type="text"
              placeholder="DTDC, Delhivery..."
              value={
                filters.courier
              }
              onChange={
                handleFilterChange
              }
            />

          </div>


          {/* City */}

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


          {/* State */}

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


          {/* Date From */}

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


          {/* Date To */}

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


          {/* Ordering */}

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

              {
                ORDERING_OPTIONS.map(
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
                )
              }

            </select>

          </div>


          {/* Filter Actions */}

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


      {/* ===================================================
          Error
      =================================================== */}

      {error && (
        <section className="dashboard-error">
          {error}
        </section>
      )}


      {/* ===================================================
          Orders Table
      =================================================== */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                All Orders
              </h2>


              <p>
                {
                  count
                    ? `Showing ${firstResult}-${lastResult} of ${count} orders`
                    : "No orders found"
                }
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
                    Order Status
                  </th>


                  <th>
                    Payment
                  </th>


                  <th>
                    Total
                  </th>


                  <th>
                    Shipping
                  </th>


                  <th>
                    Courier / AWB
                  </th>


                  <th>
                    Delivery
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

                {
                  loading
                    ? (
                      <tr>

                        <td
                          colSpan="11"
                          className="admin-orders-empty-cell"
                        >
                          Loading orders...
                        </td>

                      </tr>
                    )
                    : orders.length
                      ? (
                        orders.map(
                          (
                            order
                          ) => {
                            const shipmentId =
                              getShipmentId(
                                order
                              );


                            const awbCode =
                              getAwbCode(
                                order
                              );


                            const courier =
                              getCourierName(
                                order
                              );


                            const shippingStatus =
                              order.shipping_status ||
                              "";


                            return (
                              <tr
                                key={
                                  order.id ??
                                  order.order_number
                                }
                              >

                                {/* Order */}

                                <td>

                                  <strong>
                                    {
                                      order.order_number
                                    }
                                  </strong>


                                  <small className="dashboard-table-subtext">
                                    {
                                      order.total_items ||
                                      0
                                    }{" "}
                                    item
                                    {
                                      Number(
                                        order.total_items ||
                                        0
                                      ) ===
                                      1
                                        ? ""
                                        : "s"
                                    }
                                  </small>


                                  {
                                    shipmentId && (
                                      <small className="dashboard-table-subtext">
                                        Shipment:{" "}
                                        {
                                          shipmentId
                                        }
                                      </small>
                                    )
                                  }

                                </td>


                                {/* Customer */}

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
                                      order.user?.email ||
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


                                {/* Location */}

                                <td>

                                  {
                                    [
                                      order.city,
                                      order.state,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ", "
                                      ) ||
                                    "-"
                                  }


                                  {
                                    order.postal_code && (
                                      <small className="dashboard-table-subtext">
                                        PIN:{" "}
                                        {
                                          order.postal_code
                                        }
                                      </small>
                                    )
                                  }

                                </td>


                                {/* Status */}

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


                                {/* Payment */}

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


                                {/* Total */}

                                <td>

                                  <strong>
                                    {
                                      formatCurrency(
                                        order.total_amount
                                      )
                                    }
                                  </strong>

                                </td>


                                {/* Shipping */}

                                <td>

                                  {
                                    shippingStatus
                                      ? (
                                        <span
                                          className={
                                            getStatusClassName(
                                              shippingStatus
                                            )
                                          }
                                        >
                                          {
                                            formatStatusLabel(
                                              shippingStatus
                                            )
                                          }
                                        </span>
                                      )
                                      : shipmentId
                                        ? (
                                          <span
                                            className={
                                              getStatusClassName(
                                                "created"
                                              )
                                            }
                                          >
                                            Shipment Created
                                          </span>
                                        )
                                        : (
                                          <span className="dashboard-table-subtext">
                                            Not Created
                                          </span>
                                        )
                                  }


                                  {
                                    order.pickup_scheduled && (
                                      <small className="dashboard-table-subtext">
                                        Pickup scheduled
                                      </small>
                                    )
                                  }

                                </td>


                                {/* Courier */}

                                <td>

                                  <strong>
                                    {
                                      courier ||
                                      "-"
                                    }
                                  </strong>


                                  {
                                    order.courier_service && (
                                      <small className="dashboard-table-subtext">
                                        {
                                          order.courier_service
                                        }
                                      </small>
                                    )
                                  }


                                  {
                                    awbCode && (
                                      <small className="dashboard-table-subtext">
                                        AWB:{" "}
                                        {
                                          awbCode
                                        }
                                      </small>
                                    )
                                  }

                                </td>


                                {/* Delivery */}

                                <td>

                                  {
                                    formatDate(
                                      order.estimated_delivery
                                    )
                                  }


                                  {
                                    order.delivered_at && (
                                      <small className="dashboard-table-subtext">
                                        Delivered:{" "}
                                        {
                                          formatDate(
                                            order.delivered_at
                                          )
                                        }
                                      </small>
                                    )
                                  }

                                </td>


                                {/* Placed */}

                                <td>

                                  {
                                    formatDateTime(
                                      order.placed_at
                                    )
                                  }

                                </td>


                                {/* Action */}

                                <td>

                                  <Link
                                    to={`/admin/orders/${encodeURIComponent(
                                      order.order_number
                                    )}`}
                                    className="dashboard-button dashboard-button-secondary admin-orders-view-button"
                                  >
                                    View Order
                                  </Link>

                                </td>

                              </tr>
                            );
                          }
                        )
                      )
                      : (
                        <tr>

                          <td
                            colSpan="11"
                            className="admin-orders-empty-cell"
                          >
                            No orders match the selected filters.
                          </td>

                        </tr>
                      )
                }

              </tbody>

            </table>

          </div>


          {/* =================================================
              Pagination
          ================================================= */}

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

                      currentPage -
                      1
                    )
                )
              }
              disabled={
                loading ||
                !hasPrevious ||
                page <=
                  1
              }
            >
              Previous
            </button>


            <span>

              Page{" "}

              <strong>
                {
                  page
                }
              </strong>{" "}

              of{" "}

              <strong>
                {
                  totalPages
                }
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

                      currentPage +
                      1
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