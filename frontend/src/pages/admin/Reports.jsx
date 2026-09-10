import {
  useEffect,
  useMemo,
  useState,
} from "react";


// =========================================================
// API Configuration
// =========================================================

const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");


// =========================================================
// Helpers
// =========================================================

function formatCurrency(
  value
) {
  const amount =
    Number(
      value ?? 0
    );

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "₹0.00";
  }

  return amount.toLocaleString(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
}


function formatNumber(
  value
) {
  const amount =
    Number(
      value ?? 0
    );

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "0";
  }

  return amount.toLocaleString(
    "en-IN"
  );
}


function formatDateTime(
  value
) {
  if (!value) {
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
}


function getAccessToken() {
  return (
    localStorage.getItem(
      "yuvon_access_token"
    ) ||
    localStorage.getItem(
      "access"
    ) ||
    localStorage.getItem(
      "access_token"
    ) ||
    ""
  );
}


function buildQueryString(
  filters
) {
  const params =
    new URLSearchParams();

  Object.entries(
    filters
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {
      if (
        value !== undefined &&
        value !== null &&
        String(
          value
        ).trim() !== ""
      ) {
        params.set(
          key,
          String(
            value
          ).trim()
        );
      }
    }
  );

  return params.toString();
}


function getErrorMessage(
  data,
  fallback
) {
  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    if (
      typeof data.detail ===
      "string"
    ) {
      return data.detail;
    }

    if (
      typeof data.message ===
      "string"
    ) {
      return data.message;
    }

    if (
      typeof data.error ===
      "string"
    ) {
      return data.error;
    }
  }

  return fallback;
}


// =========================================================
// Main Component
// =========================================================

function Reports() {

  // =======================================================
  // Filters
  // =======================================================

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    endDate,
    setEndDate,
  ] =
    useState("");

  const [
    orderStatus,
    setOrderStatus,
  ] =
    useState("");

  const [
    paymentStatus,
    setPaymentStatus,
  ] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState("");


  // =======================================================
  // Applied Filters
  // =======================================================

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState({
      start_date:
        "",

      end_date:
        "",

      order_status:
        "",

      payment_status:
        "",

      payment_method:
        "",
    });


  // =======================================================
  // Report Data
  // =======================================================

  const [
    report,
    setReport,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    downloading,
    setDownloading,
  ] =
    useState(false);


  // =======================================================
  // Fetch Report
  // =======================================================

  useEffect(
    () => {

      let cancelled =
        false;


      async function loadReport() {

        try {

          setLoading(
            true
          );

          setError(
            ""
          );


          const token =
            getAccessToken();


          if (!token) {

            throw new Error(
              "Admin login token not found. Please login again."
            );
          }


          const query =
            buildQueryString(
              appliedFilters
            );


          const url =
            `${API_BASE_URL}/reports/sales/${
              query
                ? `?${query}`
                : ""
            }`;


          const response =
            await fetch(
              url,
              {
                method:
                  "GET",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );


          let data = null;


          try {

            data =
              await response.json();

          } catch {

            data = null;
          }


          if (
            !response.ok
          ) {

            throw new Error(
              getErrorMessage(
                data,
                `Unable to load report. HTTP ${response.status}`
              )
            );
          }


          if (
            !cancelled
          ) {

            setReport(
              data
            );
          }

        } catch (
          loadError
        ) {

          if (
            !cancelled
          ) {

            setReport(
              null
            );

            setError(
              loadError?.message ||
                "Unable to load sales report."
            );
          }

        } finally {

          if (
            !cancelled
          ) {

            setLoading(
              false
            );
          }
        }
      }


      loadReport();


      return () => {

        cancelled =
          true;
      };

    },
    [
      appliedFilters,
    ]
  );


  // =======================================================
  // Derived Data
  // =======================================================

  const summary =
    report?.summary ||
    {};

  const results =
    Array.isArray(
      report?.results
    )
      ? report.results
      : [];


  const hasFilters =
    useMemo(
      () =>
        Boolean(
          startDate ||
          endDate ||
          orderStatus ||
          paymentStatus ||
          paymentMethod
        ),
      [
        startDate,
        endDate,
        orderStatus,
        paymentStatus,
        paymentMethod,
      ]
    );


  // =======================================================
  // Apply Filters
  // =======================================================

  const handleApplyFilters =
    (
      event
    ) => {

      event.preventDefault();


      if (
        startDate &&
        endDate &&
        startDate >
          endDate
      ) {

        setError(
          "Start date cannot be after end date."
        );

        return;
      }


      setError(
        ""
      );


      setAppliedFilters(
        {
          start_date:
            startDate,

          end_date:
            endDate,

          order_status:
            orderStatus,

          payment_status:
            paymentStatus,

          payment_method:
            paymentMethod,
        }
      );
    };


  // =======================================================
  // Reset Filters
  // =======================================================

  const handleResetFilters =
    () => {

      setStartDate(
        ""
      );

      setEndDate(
        ""
      );

      setOrderStatus(
        ""
      );

      setPaymentStatus(
        ""
      );

      setPaymentMethod(
        ""
      );

      setError(
        ""
      );

      setAppliedFilters(
        {
          start_date:
            "",

          end_date:
            "",

          order_status:
            "",

          payment_status:
            "",

          payment_method:
            "",
        }
      );
    };


  // =======================================================
  // Excel Download
  // =======================================================

  const handleDownloadExcel =
    async () => {

      try {

        setDownloading(
          true
        );

        setError(
          ""
        );


        const token =
          getAccessToken();


        if (!token) {

          throw new Error(
            "Admin login token not found. Please login again."
          );
        }


        const query =
          buildQueryString(
            appliedFilters
          );


        const url =
          `${API_BASE_URL}/reports/sales/export/${
            query
              ? `?${query}`
              : ""
          }`;


        const response =
          await fetch(
            url,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        if (
          !response.ok
        ) {

          let errorData = null;


          try {

            const contentType =
              response.headers.get(
                "content-type"
              ) ||
              "";


            if (
              contentType.includes(
                "application/json"
              )
            ) {

              errorData =
                await response.json();

            } else {

              const errorText =
                await response.text();


              errorData =
                errorText;
            }

          } catch {

            errorData =
              null;
          }


          throw new Error(
            getErrorMessage(
              errorData,
              `Excel export failed. HTTP ${response.status}`
            )
          );
        }


        const blob =
          await response.blob();


        if (
          !blob ||
          blob.size === 0
        ) {

          throw new Error(
            "Excel file is empty."
          );
        }


        const objectUrl =
          URL.createObjectURL(
            blob
          );


        const contentDisposition =
          response.headers.get(
            "content-disposition"
          );


        let filename =
          "yuvon_sales_report.xlsx";


        if (
          contentDisposition
        ) {

          const utf8Match =
            contentDisposition.match(
              /filename\*=UTF-8''([^;]+)/i
            );


          const normalMatch =
            contentDisposition.match(
              /filename="?([^";]+)"?/i
            );


          if (
            utf8Match?.[1]
          ) {

            filename =
              decodeURIComponent(
                utf8Match[1]
              );

          } else if (
            normalMatch?.[1]
          ) {

            filename =
              normalMatch[1];
          }
        }


        const link =
          document.createElement(
            "a"
          );


        link.href =
          objectUrl;

        link.download =
          filename;


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        setTimeout(
          () => {

            URL.revokeObjectURL(
              objectUrl
            );

          },
          1000
        );

      } catch (
        downloadError
      ) {

        setError(
          downloadError?.message ||
            "Unable to download Excel report."
        );

      } finally {

        setDownloading(
          false
        );
      }
    };


  // =======================================================
  // Render
  // =======================================================

  return (

    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-[1600px]">


        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Admin Reports
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
              Sales & GST Report
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-gray-600 sm:text-base">
              View item-level sales data, customer details,
              GST breakup, payment information and export the
              same report to Excel.
            </p>

          </div>


          <button
            type="button"
            onClick={
              handleDownloadExcel
            }
            disabled={
              downloading ||
              loading
            }
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading
              ? "Preparing Excel..."
              : "Download Excel"}
          </button>

        </div>


        {/* =================================================
            Filters
        ================================================= */}

        <form
          onSubmit={
            handleApplyFilters
          }
          className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">


            {/* Start Date */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Start Date
              </label>

              <input
                type="date"
                value={
                  startDate
                }
                onChange={
                  (
                    event
                  ) =>
                    setStartDate(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            {/* End Date */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                End Date
              </label>

              <input
                type="date"
                value={
                  endDate
                }
                onChange={
                  (
                    event
                  ) =>
                    setEndDate(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            {/* Order Status */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Order Status
              </label>

              <select
                value={
                  orderStatus
                }
                onChange={
                  (
                    event
                  ) =>
                    setOrderStatus(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All Orders
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="confirmed">
                  Confirmed
                </option>

                <option value="processing">
                  Processing
                </option>

                <option value="packed">
                  Packed
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="in_transit">
                  In Transit
                </option>

                <option value="out_for_delivery">
                  Out For Delivery
                </option>

                <option value="delivered">
                  Delivered
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

                <option value="return_requested">
                  Return Requested
                </option>

                <option value="exchange_requested">
                  Exchange Requested
                </option>

                <option value="return_approved">
                  Return Approved
                </option>

                <option value="exchange_approved">
                  Exchange Approved
                </option>

                <option value="return_in_transit">
                  Return In Transit
                </option>

                <option value="returned">
                  Returned
                </option>

                <option value="exchanged">
                  Exchanged
                </option>

              </select>

            </div>


            {/* Payment Status */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Payment Status
              </label>

              <select
                value={
                  paymentStatus
                }
                onChange={
                  (
                    event
                  ) =>
                    setPaymentStatus(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All Payments
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="failed">
                  Failed
                </option>

                <option value="partially_refunded">
                  Partially Refunded
                </option>

                <option value="refunded">
                  Refunded
                </option>

              </select>

            </div>


            {/* Payment Method */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Payment Method
              </label>

              <select
                value={
                  paymentMethod
                }
                onChange={
                  (
                    event
                  ) =>
                    setPaymentMethod(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All Methods
                </option>

                <option value="cod">
                  Cash on Delivery
                </option>

                <option value="razorpay">
                  Razorpay
                </option>

                <option value="upi">
                  UPI
                </option>

                <option value="card">
                  Card
                </option>

                <option value="net_banking">
                  Net Banking
                </option>

              </select>

            </div>

          </div>


          {/* Filter Buttons */}

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              type="submit"
              disabled={
                loading
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? "Loading..."
                : "Apply Filters"}
            </button>


            <button
              type="button"
              onClick={
                handleResetFilters
              }
              disabled={
                loading ||
                !hasFilters
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>

          </div>

        </form>


        {/* =================================================
            Error
        ================================================= */}

        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>

        )}


        {/* =================================================
            Loading
        ================================================= */}

        {loading && (

          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">

            <p className="text-lg font-semibold text-gray-700">
              Loading sales report...
            </p>

          </div>

        )}


        {/* =================================================
            Report
        ================================================= */}

        {!loading &&
          report && (

          <>

            {/* =============================================
                Summary Cards
            ============================================= */}

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

              <SummaryCard
                title="Total Orders"
                value={
                  formatNumber(
                    summary.total_orders
                  )
                }
              />

              <SummaryCard
                title="Total Quantity"
                value={
                  formatNumber(
                    summary.total_quantity
                  )
                }
              />

              <SummaryCard
                title="Taxable Value"
                value={
                  formatCurrency(
                    summary.total_taxable_value
                  )
                }
              />

              <SummaryCard
                title="Total GST"
                value={
                  formatCurrency(
                    summary.calculated_total_gst
                  )
                }
              />

              <SummaryCard
                title="Total Discount"
                value={
                  formatCurrency(
                    summary.total_discount
                  )
                }
              />

              <SummaryCard
                title="Grand Total"
                value={
                  formatCurrency(
                    summary.grand_total
                  )
                }
              />

            </div>


            {/* =============================================
                GST Summary
            ============================================= */}

            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

              <SummaryCard
                title="CGST"
                value={
                  formatCurrency(
                    summary.calculated_cgst
                  )
                }
              />

              <SummaryCard
                title="SGST"
                value={
                  formatCurrency(
                    summary.calculated_sgst
                  )
                }
              />

              <SummaryCard
                title="Shipping"
                value={
                  formatCurrency(
                    summary.total_shipping
                  )
                }
              />

              <SummaryCard
                title="Rows"
                value={
                  formatNumber(
                    summary.total_rows
                  )
                }
              />

            </div>


            {/* =============================================
                GST Rule Notice
            ============================================= */}

            <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <h2 className="font-bold text-blue-900">
                GST Rule Used
              </h2>

              <p className="mt-2 text-sm text-blue-800">
                GST is calculated on the actual discounted
                unit selling price, not on MRP.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">

                <div className="rounded-lg bg-white p-3 text-sm text-gray-700">
                  Below ₹2,500:
                  <strong>
                    {" "}
                    GST 5% = CGST 2.5% + SGST 2.5%
                  </strong>
                </div>

                <div className="rounded-lg bg-white p-3 text-sm text-gray-700">
                  ₹2,500 and above:
                  <strong>
                    {" "}
                    GST 18% = CGST 9% + SGST 9%
                  </strong>
                </div>

              </div>

            </div>


            {/* =============================================
                Table
            ============================================= */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              <div className="border-b border-gray-200 px-5 py-4">

                <h2 className="text-lg font-bold text-gray-900">
                  Sales Report Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  One row represents one order item.
                </p>

              </div>


              {results.length ===
              0 ? (

                <div className="px-6 py-16 text-center">

                  <p className="text-lg font-semibold text-gray-700">
                    No sales data found
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Try changing the report filters.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="min-w-[2600px] w-full text-left text-sm">

                    <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-700">

                      <tr>

                        <TableHead>
                          Order Number
                        </TableHead>

                        <TableHead>
                          Order Date
                        </TableHead>

                        <TableHead>
                          Customer
                        </TableHead>

                        <TableHead>
                          Phone
                        </TableHead>

                        <TableHead>
                          City
                        </TableHead>

                        <TableHead>
                          State
                        </TableHead>

                        <TableHead>
                          Pincode
                        </TableHead>

                        <TableHead>
                          Product
                        </TableHead>

                        <TableHead>
                          Product SKU
                        </TableHead>

                        <TableHead>
                          Variant SKU
                        </TableHead>

                        <TableHead>
                          Color
                        </TableHead>

                        <TableHead>
                          Size
                        </TableHead>

                        <TableHead>
                          Qty
                        </TableHead>

                        <TableHead>
                          Final Unit Price
                        </TableHead>

                        <TableHead>
                          Taxable Value
                        </TableHead>

                        <TableHead>
                          GST %
                        </TableHead>

                        <TableHead>
                          CGST %
                        </TableHead>

                        <TableHead>
                          CGST Amount
                        </TableHead>

                        <TableHead>
                          SGST %
                        </TableHead>

                        <TableHead>
                          SGST Amount
                        </TableHead>

                        <TableHead>
                          Total GST
                        </TableHead>

                        <TableHead>
                          Value With GST
                        </TableHead>

                        <TableHead>
                          Order Discount
                        </TableHead>

                        <TableHead>
                          Shipping
                        </TableHead>

                        <TableHead>
                          Order Total
                        </TableHead>

                        <TableHead>
                          Coupon
                        </TableHead>

                        <TableHead>
                          Payment Method
                        </TableHead>

                        <TableHead>
                          Payment Status
                        </TableHead>

                        <TableHead>
                          Order Status
                        </TableHead>

                      </tr>

                    </thead>


                    <tbody className="divide-y divide-gray-100">

                      {results.map(
                        (
                          row,
                          index
                        ) => (

                          <tr
                            key={
                              `${row.order_id}-${row.variant_sku}-${index}`
                            }
                            className="hover:bg-gray-50"
                          >

                            <TableCell>
                              {row.order_number ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {formatDateTime(
                                row.order_date
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="font-medium text-gray-900">
                                {row.customer_name ||
                                  "-"}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {row.customer_email ||
                                  ""}
                              </div>
                            </TableCell>

                            <TableCell>
                              {row.phone ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.city ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.state ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.postal_code ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.product_name ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.product_sku ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.variant_sku ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.color ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.size ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {formatNumber(
                                row.quantity
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.discounted_unit_price
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.taxable_value
                              )}
                            </TableCell>

                            <TableCell>
                              {row.gst_rate}%
                            </TableCell>

                            <TableCell>
                              {row.cgst_rate}%
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.cgst_amount
                              )}
                            </TableCell>

                            <TableCell>
                              {row.sgst_rate}%
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.sgst_amount
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.total_gst
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.value_with_gst
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.order_discount
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.shipping_charge
                              )}
                            </TableCell>

                            <TableCell>
                              {formatCurrency(
                                row.order_total
                              )}
                            </TableCell>

                            <TableCell>
                              {row.coupon_code ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.payment_method ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.payment_status ||
                                "-"}
                            </TableCell>

                            <TableCell>
                              {row.order_status ||
                                "-"}
                            </TableCell>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </>

        )}

      </div>

    </div>
  );
}


// =========================================================
// Summary Card
// =========================================================

function SummaryCard({
  title,
  value,
}) {

  return (

    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>

    </div>
  );
}


// =========================================================
// Table Head
// =========================================================

function TableHead({
  children,
}) {

  return (

    <th className="whitespace-nowrap px-4 py-3 font-semibold">
      {children}
    </th>
  );
}


// =========================================================
// Table Cell
// =========================================================

function TableCell({
  children,
}) {

  return (

    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
      {children}
    </td>
  );
}


export default Reports;