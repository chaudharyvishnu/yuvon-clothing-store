import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  fetchAdminReturnRequests,
} from "../../services/api";


// =========================================================
// Options
// =========================================================

const STATUS_OPTIONS = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "requested",
    label: "Requested",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "pickup_scheduled",
    label: "Pickup Scheduled",
  },
  {
    value: "picked_up",
    label: "Picked Up",
  },
  {
    value: "in_transit",
    label: "In Transit",
  },
  {
    value: "received",
    label: "Received",
  },
  {
    value: "inspection_pending",
    label: "Inspection Pending",
  },
  {
    value: "inspection_completed",
    label: "Inspection Completed",
  },
  {
    value: "refund_pending",
    label: "Refund Pending",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
  {
    value: "exchange_pending",
    label: "Exchange Pending",
  },
  {
    value: "exchange_shipped",
    label: "Exchange Shipped",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];


const TYPE_OPTIONS = [
  {
    value: "",
    label: "All Types",
  },
  {
    value: "return",
    label: "Return",
  },
  {
    value: "exchange",
    label: "Exchange",
  },
];


// =========================================================
// Helpers
// =========================================================

function getResults(
  response
) {
  if (
    Array.isArray(
      response
    )
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return response.results;
  }

  return [];
}


function getCount(
  response,
  items
) {
  if (
    Number.isFinite(
      Number(
        response?.count
      )
    )
  ) {
    return Number(
      response.count
    );
  }

  return items.length;
}


function formatDate(
  value
) {
  if (
    !value
  ) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return String(
      value
    );
  }
}


function formatCurrency(
  value
) {
  const amount =
    Number(
      value || 0
    );

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
    Number.isFinite(
      amount
    )
      ? amount
      : 0
  );
}


function formatStatus(
  value
) {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
}


function getStatusClasses(
  status
) {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  if (
    normalized ===
      "completed" ||
    normalized ===
      "refunded"
  ) {
    return (
      "bg-green-100 text-green-700"
    );
  }

  if (
    normalized ===
      "rejected" ||
    normalized ===
      "cancelled"
  ) {
    return (
      "bg-red-100 text-red-700"
    );
  }

  if (
    normalized ===
      "approved" ||
    normalized ===
      "received" ||
    normalized ===
      "exchange_shipped"
  ) {
    return (
      "bg-blue-100 text-blue-700"
    );
  }

  if (
    normalized ===
      "pickup_scheduled" ||
    normalized ===
      "picked_up" ||
    normalized ===
      "in_transit"
  ) {
    return (
      "bg-purple-100 text-purple-700"
    );
  }

  return (
    "bg-amber-100 text-amber-700"
  );
}


function getErrorMessage(
  error,
  fallback =
    "Unable to load return / exchange requests."
) {
  if (
    typeof error?.data?.detail ===
    "string"
  ) {
    return error.data.detail;
  }

  if (
    typeof error?.data?.message ===
    "string"
  ) {
    return error.data.message;
  }

  if (
    typeof error?.message ===
    "string" &&
    !error.message.startsWith(
      "API Error:"
    )
  ) {
    return error.message;
  }

  return fallback;
}


// =========================================================
// Component
// =========================================================

const AdminReturns = () => {

  // =======================================================
  // Data
  // =======================================================

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    totalCount,
    setTotalCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    error,
    setError,
  ] = useState("");


  // =======================================================
  // Filters
  // =======================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("");

  const [
    dateFrom,
    setDateFrom,
  ] = useState("");

  const [
    dateTo,
    setDateTo,
  ] = useState("");


  // =======================================================
  // Summary
  // =======================================================

  const summary =
    useMemo(
      () => {
        let requested = 0;
        let approved = 0;
        let returnCount = 0;
        let exchangeCount = 0;

        requests.forEach(
          (
            item
          ) => {
            if (
              item.status ===
              "requested"
            ) {
              requested += 1;
            }

            if (
              item.status ===
              "approved"
            ) {
              approved += 1;
            }

            if (
              item.request_type ===
              "return"
            ) {
              returnCount += 1;
            }

            if (
              item.request_type ===
              "exchange"
            ) {
              exchangeCount += 1;
            }
          }
        );

        return {
          requested,
          approved,
          returnCount,
          exchangeCount,
        };
      },
      [
        requests,
      ]
    );


  // =======================================================
  // Load Requests
  // =======================================================

  const loadRequests =
    async (
      overrides = {}
    ) => {
      setLoading(
        true
      );

      setError(
        ""
      );

      try {
        const params = {
          search:
            overrides.search ??
            search,

          status:
            overrides.status ??
            statusFilter,

          request_type:
            overrides.request_type ??
            typeFilter,

          date_from:
            overrides.date_from ??
            dateFrom,

          date_to:
            overrides.date_to ??
            dateTo,

          ordering:
            "-created_at",
        };


        const response =
          await fetchAdminReturnRequests(
            params
          );


        const items =
          getResults(
            response
          );


        setRequests(
          items
        );

        setTotalCount(
          getCount(
            response,
            items
          )
        );
      } catch (
        loadError
      ) {
        console.error(
          "Admin return requests load error:",
          loadError
        );

        setRequests(
          []
        );

        setTotalCount(
          0
        );

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  // =======================================================
  // Initial Load
  // =======================================================

  useEffect(
    () => {
      loadRequests();
    },
    []
  );


  // =======================================================
  // Apply Filters
  // =======================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      loadRequests();
    };


  // =======================================================
  // Reset Filters
  // =======================================================

  const handleReset =
    () => {
      setSearch(
        ""
      );

      setStatusFilter(
        ""
      );

      setTypeFilter(
        ""
      );

      setDateFrom(
        ""
      );

      setDateTo(
        ""
      );


      loadRequests({
        search:
          "",

        status:
          "",

        request_type:
          "",

        date_from:
          "",

        date_to:
          "",
      });
    };


  // =======================================================
  // Render
  // =======================================================

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">


        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Admin Management
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
              Returns & Exchanges
            </h1>

            <p className="mt-2 max-w-2xl text-gray-500">
              Review customer return and exchange requests,
              inspect request details and manage their
              processing status.
            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <Link
              to="/admin/dashboard"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Dashboard
            </Link>


            <button
              type="button"
              onClick={() =>
                loadRequests()
              }
              disabled={
                loading
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

        </div>


        {/* =================================================
            Summary
        ================================================= */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Total Requests
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalCount}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Requested
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {summary.requested}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Approved
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {summary.approved}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Returns
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.returnCount}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Exchanges
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.exchangeCount}
            </p>

          </div>

        </div>


        {/* =================================================
            Filters
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">

          <form
            onSubmit={
              handleSubmit
            }
            className="grid gap-4 lg:grid-cols-6"
          >

            <div className="lg:col-span-2">

              <label
                htmlFor="admin-return-search"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Search
              </label>

              <input
                id="admin-return-search"
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Return number, order, customer..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <div>

              <label
                htmlFor="admin-return-status"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Status
              </label>

              <select
                id="admin-return-status"
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              >
                {STATUS_OPTIONS.map(
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


            <div>

              <label
                htmlFor="admin-return-type"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Type
              </label>

              <select
                id="admin-return-type"
                value={
                  typeFilter
                }
                onChange={(
                  event
                ) =>
                  setTypeFilter(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              >
                {TYPE_OPTIONS.map(
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


            <div>

              <label
                htmlFor="admin-return-date-from"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                From
              </label>

              <input
                id="admin-return-date-from"
                type="date"
                value={
                  dateFrom
                }
                onChange={(
                  event
                ) =>
                  setDateFrom(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />

            </div>


            <div>

              <label
                htmlFor="admin-return-date-to"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                To
              </label>

              <input
                id="admin-return-date-to"
                type="date"
                value={
                  dateTo
                }
                onChange={(
                  event
                ) =>
                  setDateTo(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />

            </div>


            <div className="flex gap-3 lg:col-span-6">

              <button
                type="submit"
                disabled={
                  loading
                }
                className="rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                Apply Filters
              </button>


              <button
                type="button"
                onClick={
                  handleReset
                }
                disabled={
                  loading
                }
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Reset
              </button>

            </div>

          </form>

        </section>


        {/* =================================================
            Error
        ================================================= */}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}


        {/* =================================================
            Table
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-5 py-5 md:px-6">

            <h2 className="text-xl font-bold text-gray-900">
              Customer Requests
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {totalCount} return / exchange request(s)
            </p>

          </div>


          {loading &&
          requests.length ===
            0 ? (

            <div className="px-6 py-16 text-center text-gray-500">
              Loading return / exchange requests...
            </div>

          ) : requests.length ===
            0 ? (

            <div className="px-6 py-16 text-center">

              <div className="text-4xl">
                📦
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-900">
                No return requests found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Customer return and exchange requests
                will appear here.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-gray-200">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Request
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Order
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Type
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Reason
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Refund
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Requested
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-gray-100 bg-white">

                  {requests.map(
                    (
                      item
                    ) => (

                      <tr
                        key={
                          item.return_number ||
                          item.id
                        }
                        className="transition hover:bg-gray-50"
                      >

                        <td className="whitespace-nowrap px-5 py-4">

                          <p className="font-semibold text-gray-900">
                            {
                              item.return_number
                            }
                          </p>

                        </td>


                        <td className="whitespace-nowrap px-5 py-4">

                          <p className="font-medium text-gray-800">
                            {
                              item.order_number ||
                              item.order ||
                              "-"
                            }
                          </p>

                        </td>


                        <td className="px-5 py-4">

                          <p className="max-w-[220px] truncate font-medium text-gray-800">
                            {
                              item.customer_email ||
                              "-"
                            }
                          </p>

                          {item.user && (
                            <p className="mt-1 text-xs text-gray-500">
                              User #{item.user}
                            </p>
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4">

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                            {
                              item.request_type_display ||
                              formatStatus(
                                item.request_type
                              )
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <p className="max-w-[180px] text-sm text-gray-700">
                            {
                              item.reason_display ||
                              formatStatus(
                                item.reason
                              ) ||
                              "-"
                            }
                          </p>

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-gray-800">

                          {formatCurrency(
                            item.refund_amount
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              item.status
                            )}`}
                          >
                            {
                              item.status_display ||
                              formatStatus(
                                item.status
                              )
                            }
                          </span>

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">

                          {formatDate(
                            item.created_at
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-right">

                          <Link
                            to={`/admin/returns/${encodeURIComponent(
                              item.return_number
                            )}`}
                            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            View
                          </Link>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* =================================================
            Bottom Navigation
        ================================================= */}

        <div className="mt-8 flex flex-wrap gap-3">

          <Link
            to="/admin/dashboard"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Dashboard
          </Link>


          <Link
            to="/admin/orders"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Orders
          </Link>

        </div>

      </div>

    </main>
  );
};


export default AdminReturns;