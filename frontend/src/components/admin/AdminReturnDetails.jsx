import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  fetchAdminReturnRequestDetail,
  processAdminReturnRefund,
  updateAdminReturnItemInspection,
  updateAdminReturnRequestStatus,
} from "../../services/api";


// =========================================================
// Status Options
// =========================================================

const STATUS_OPTIONS = [
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

  /*
   * IMPORTANT:
   *
   * Refunded status backend se manually set nahi karna.
   * Dedicated refund API use hoti hai.
   *
   * Option sirf existing refunded request display karne
   * ke liye rakha hai.
   */
  {
    value: "refunded",
    label: "Refunded",
    disabled: true,
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


// =========================================================
// Inspection Constants
// =========================================================

const INSPECTION_ALLOWED_STATUSES =
  new Set([
    "received",
    "inspection_pending",
    "inspection_completed",
    "refund_pending",
    "exchange_pending",
  ]);


// =========================================================
// Helpers
// =========================================================

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


function formatDate(
  value
) {
  if (
    !value
  ) {
    return "-";
  }


  try {
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
      value ||
        0
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


// =========================================================
// Request Status Colors
// =========================================================

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


// =========================================================
// Inspection Status Colors
// =========================================================

function getInspectionStatusClasses(
  status
) {
  const normalized =
    String(
      status || ""
    ).toLowerCase();


  if (
    normalized ===
      "approved" ||
    normalized ===
      "passed"
  ) {
    return (
      "bg-green-100 text-green-700"
    );
  }


  if (
    normalized ===
      "rejected" ||
    normalized ===
      "failed"
  ) {
    return (
      "bg-red-100 text-red-700"
    );
  }


  return (
    "bg-amber-100 text-amber-700"
  );
}


// =========================================================
// API Error Helper
// =========================================================

function getErrorMessage(
  error,
  fallback =
    "Something went wrong."
) {
  const data =
    error?.data;


  if (
    typeof data?.detail ===
    "string"
  ) {
    return data.detail;
  }


  if (
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }


  if (
    data &&
    typeof data ===
      "object"
  ) {
    const firstEntry =
      Object.entries(
        data
      )[0];


    if (
      firstEntry
    ) {
      const [
        field,
        value,
      ] =
        firstEntry;


      if (
        Array.isArray(
          value
        )
      ) {
        return value
          .map(
            (
              item
            ) =>
              typeof item ===
                "object"
                ? JSON.stringify(
                    item
                  )
                : String(
                    item
                  )
          )
          .join(
            " "
          );
      }


      if (
        typeof value ===
        "string"
      ) {
        return value;
      }


      if (
        value &&
        typeof value ===
          "object"
      ) {
        return `${field}: ${JSON.stringify(
          value
        )}`;
      }
    }
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
// Safe Object Display Helpers
// =========================================================

function getEntityId(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return "-";
  }


  if (
    typeof value ===
    "object"
  ) {
    return (
      value.id ??
      value.pk ??
      "-"
    );
  }


  return value;
}


function getPersonDisplay(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return "-";
  }


  if (
    typeof value !==
    "object"
  ) {
    return String(
      value
    );
  }


  const fullName =
    [
      value.first_name,
      value.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();


  return (
    value.display_name ||
    fullName ||
    value.username ||
    value.email ||
    (
      value.id
        ? `User #${value.id}`
        : "-"
    )
  );
}


// =========================================================
// Order Helpers
// =========================================================

function getOrderNumber(
  requestData
) {
  if (
    requestData
      ?.order_number
  ) {
    return String(
      requestData
        .order_number
    );
  }


  const order =
    requestData
      ?.order;


  if (
    order &&
    typeof order ===
      "object"
  ) {
    return (
      order.order_number ||
      (
        order.id
          ? `Order #${order.id}`
          : "-"
      )
    );
  }


  return order
    ? String(
        order
      )
    : "-";
}


function getPaymentMethod(
  requestData
) {
  const order =
    requestData
      ?.order;


  if (
    order &&
    typeof order ===
      "object"
  ) {
    return String(
      order.payment_method ||
      order.payment_method_display ||
      requestData
        ?.payment_method ||
      requestData
        ?.order_payment_method ||
      ""
    )
      .trim()
      .toLowerCase();
  }


  return String(
    requestData
      ?.payment_method ||
    requestData
      ?.order_payment_method ||
    ""
  )
    .trim()
    .toLowerCase();
}


// =========================================================
// Order Item Helpers
// =========================================================

function getOrderItemData(
  item
) {
  const orderItem =
    item
      ?.order_item;


  if (
    orderItem &&
    typeof orderItem ===
      "object"
  ) {
    return orderItem;
  }


  return {};
}


function getOrderItemName(
  item
) {
  const orderItem =
    getOrderItemData(
      item
    );


  return (
    orderItem.product_name ||
    item?.product_name ||
    (
      orderItem.id
        ? `Order Item #${orderItem.id}`
        : item?.order_item
          ? `Order Item #${item.order_item}`
          : "Order Item"
    )
  );
}


function getReplacementVariantDisplay(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return "-";
  }


  if (
    typeof value !==
    "object"
  ) {
    return String(
      value
    );
  }


  return (
    value.variant_sku ||
    value.sku ||
    value.name ||
    [
      value.color,
      value.size,
    ]
      .filter(
        Boolean
      )
      .join(
        " / "
      ) ||
    (
      value.id
        ? `Variant #${value.id}`
        : "-"
    )
  );
}


// =========================================================
// Component
// =========================================================

const AdminReturnDetails =
  () => {

    const {
      returnNumber,
    } =
      useParams();


    // =====================================================
    // Request Data
    // =====================================================

    const [
      requestData,
      setRequestData,
    ] =
      useState(
        null
      );


    const [
      loading,
      setLoading,
    ] =
      useState(
        true
      );


    const [
      error,
      setError,
    ] =
      useState(
        ""
      );


    const [
      success,
      setSuccess,
    ] =
      useState(
        ""
      );


    // =====================================================
    // Status Update State
    // =====================================================

    const [
      selectedStatus,
      setSelectedStatus,
    ] =
      useState(
        ""
      );


    const [
      adminNote,
      setAdminNote,
    ] =
      useState(
        ""
      );


    const [
      saving,
      setSaving,
    ] =
      useState(
        false
      );


    // =====================================================
    // Inspection State
    // =====================================================

    const [
      inspectionForms,
      setInspectionForms,
    ] =
      useState(
        {}
      );


    const [
      inspectingItemId,
      setInspectingItemId,
    ] =
      useState(
        null
      );


    // =====================================================
    // Refund State
    // =====================================================

    const [
      refunding,
      setRefunding,
    ] =
      useState(
        false
      );


    const [
      manualRefundReference,
      setManualRefundReference,
    ] =
      useState(
        ""
      );


    // =====================================================
    // Derived
    // =====================================================

    const isReturn =
      requestData
        ?.request_type ===
      "return";


    const isExchange =
      requestData
        ?.request_type ===
      "exchange";


    const normalizedStatus =
      String(
        requestData
          ?.status ||
          ""
      ).toLowerCase();


    const canInspect =
      INSPECTION_ALLOWED_STATUSES.has(
        normalizedStatus
      );


    const refundAmount =
      Number(
        requestData
          ?.refund_amount ||
          0
      );


    const paymentMethod =
      getPaymentMethod(
        requestData
      );


    const isCodRefund =
      paymentMethod ===
      "cod";


    const isAlreadyRefunded =
      normalizedStatus ===
        "refunded" ||
      Boolean(
        requestData
          ?.refunded_at
      );


    const canProcessRefund =
      isReturn &&
      !isAlreadyRefunded &&
      [
        "inspection_completed",
        "refund_pending",
      ].includes(
        normalizedStatus
      ) &&
      Number.isFinite(
        refundAmount
      ) &&
      refundAmount >
        0;


    const orderNumber =
      useMemo(
        () =>
          getOrderNumber(
            requestData
          ),
        [
          requestData,
        ]
      );


    const itemCount =
      useMemo(
        () =>
          Array.isArray(
            requestData
              ?.items
          )
            ? requestData.items.reduce(
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
              )
            : 0,
        [
          requestData,
        ]
      );


    // =====================================================
    // Inspection Form Builder
    // =====================================================

    const buildInspectionForms =
      (
        items = []
      ) => {

        const forms =
          {};


        items.forEach(
          (
            item
          ) => {

            forms[
              item.id
            ] = {

              inspection_status:
                item.inspection_status ||
                "",

              inspection_note:
                item.inspection_note ||
                "",

              is_accepted:
                item.is_accepted ??
                null,

              refund_amount:
                String(
                  item.refund_amount ??
                    ""
                ),
            };
          }
        );


        return forms;
      };


    // =====================================================
    // Apply Loaded Request
    // =====================================================

    const applyLoadedRequest =
      (
        loadedRequest
      ) => {

        if (
          !loadedRequest ||
          typeof loadedRequest !==
            "object"
        ) {
          return;
        }


        setRequestData(
          loadedRequest
        );


        setSelectedStatus(
          loadedRequest
            ?.status ||
            ""
        );


        setAdminNote(
          loadedRequest
            ?.admin_note ||
            ""
        );


        setInspectionForms(
          buildInspectionForms(
            Array.isArray(
              loadedRequest
                ?.items
            )
              ? loadedRequest.items
              : []
          )
        );
      };


    // =====================================================
    // Load Request
    // =====================================================

    const loadRequest =
      async ({
        showLoader =
          true,

        clearMessages =
          true,
      } = {}) => {

        if (
          !returnNumber
        ) {
          setError(
            "Return request number is missing."
          );


          setLoading(
            false
          );


          return null;
        }


        if (
          showLoader
        ) {
          setLoading(
            true
          );
        }


        if (
          clearMessages
        ) {
          setError(
            ""
          );

          setSuccess(
            ""
          );
        }


        try {

          const response =
            await fetchAdminReturnRequestDetail(
              returnNumber
            );


          const loadedRequest =
            response
              ?.return_request ||
            response;


          applyLoadedRequest(
            loadedRequest
          );


          return loadedRequest;

        } catch (
          loadError
        ) {

          console.error(
            "Admin return request detail load error:",
            loadError
          );


          if (
            showLoader
          ) {
            setRequestData(
              null
            );
          }


          setError(
            getErrorMessage(
              loadError,
              "Unable to load this return / exchange request."
            )
          );


          return null;

        } finally {

          if (
            showLoader
          ) {
            setLoading(
              false
            );
          }
        }
      };


    // =====================================================
    // Initial Load
    // =====================================================

    useEffect(
      () => {

        loadRequest();

      },
      [
        returnNumber,
      ]
    );


    // =====================================================
    // Inspection Form Update
    // =====================================================

    const updateInspectionForm =
      (
        itemId,
        updates
      ) => {

        setInspectionForms(
          (
            current
          ) => ({

            ...current,

            [
              itemId
            ]: {

              ...(
                current[
                  itemId
                ] ||
                {}
              ),

              ...updates,
            },
          })
        );
      };


    // =====================================================
    // Save Item Inspection
    // =====================================================

    const handleInspection =
      async (
        item,
        accepted
      ) => {

        if (
          !requestData
        ) {
          return;
        }


        if (
          !item?.id
        ) {
          setError(
            "Return item ID is missing."
          );

          return;
        }


        if (
          !canInspect
        ) {
          setError(
            "Item inspection is only available after the return has been received."
          );

          return;
        }


        const form =
          inspectionForms[
            item.id
          ] ||
          {};


        const inspectionStatus =
          accepted
            ? "approved"
            : "rejected";


        // -------------------------------------------------
        // Return Refund Amount Validation
        // -------------------------------------------------

        if (
          isReturn &&
          accepted
        ) {
          const approvedRefundAmount =
            Number(
              form.refund_amount
            );


          if (
            !Number.isFinite(
              approvedRefundAmount
            ) ||
            approvedRefundAmount <=
              0
          ) {
            setError(
              "Accepted return item ke liye positive refund amount enter karo."
            );

            return;
          }


          const orderItem =
            getOrderItemData(
              item
            );


          const unitPrice =
            Number(
              orderItem
                ?.unit_price ??
              item
                ?.unit_price ??
              0
            );


          const quantity =
            Number(
              item
                ?.quantity ||
              1
            );


          const maximumRefund =
            unitPrice >
              0 &&
            quantity >
              0
              ? unitPrice *
                quantity
              : null;


          if (
            maximumRefund !==
              null &&
            approvedRefundAmount >
              maximumRefund
          ) {
            setError(
              `Refund amount ${formatCurrency(
                approvedRefundAmount
              )} item value ${formatCurrency(
                maximumRefund
              )} se zyada nahi ho sakta.`
            );

            return;
          }
        }


        setInspectingItemId(
          item.id
        );


        setError(
          ""
        );

        setSuccess(
          ""
        );


        try {

          const payload = {

            inspection_status:
              inspectionStatus,

            inspection_note:
              String(
                form.inspection_note ||
                  ""
              ).trim(),

            is_accepted:
              accepted,

            ...(
              isReturn
                ? {
                    refund_amount:
                      accepted
                        ? String(
                            form.refund_amount ||
                              "0.00"
                          )
                        : "0.00",
                  }
                : {}
            ),
          };


          const response =
            await updateAdminReturnItemInspection(
              requestData
                .return_number,
              item.id,
              payload
            );


          await loadRequest({
            showLoader:
              false,

            clearMessages:
              false,
          });


          setSuccess(
            response
              ?.message ||
            (
              accepted
                ? "Return item accepted after inspection."
                : "Return item rejected after inspection."
            )
          );

        } catch (
          inspectionError
        ) {

          console.error(
            "Admin return item inspection error:",
            inspectionError
          );


          setError(
            getErrorMessage(
              inspectionError,
              "Unable to save item inspection."
            )
          );

        } finally {

          setInspectingItemId(
            null
          );
        }
      };


    // =====================================================
    // Process Refund
    // =====================================================

    const handleRefund =
      async () => {

        if (
          !requestData
        ) {
          return;
        }


        if (
          !isReturn
        ) {
          setError(
            "Refund processing is only available for return requests."
          );

          return;
        }


        if (
          isAlreadyRefunded
        ) {
          setError(
            "This return has already been refunded."
          );

          return;
        }


        if (
          ![
            "inspection_completed",
            "refund_pending",
          ].includes(
            normalizedStatus
          )
        ) {
          setError(
            "Complete item inspection before processing the refund."
          );

          return;
        }


        if (
          !Number.isFinite(
            refundAmount
          ) ||
          refundAmount <=
            0
        ) {
          setError(
            "Refund amount is zero. Accept at least one inspected item with a positive refund amount first."
          );

          return;
        }


        if (
          isCodRefund &&
          !manualRefundReference
            .trim()
        ) {
          setError(
            "COD refund ke liye customer ko manually refund karne ke baad manual refund reference enter karo."
          );

          return;
        }


        const confirmed =
          window.confirm(
            `Process refund of ${formatCurrency(
              requestData
                .refund_amount
            )} for ${requestData.return_number}?`
          );


        if (
          !confirmed
        ) {
          return;
        }


        setRefunding(
          true
        );


        setError(
          ""
        );

        setSuccess(
          ""
        );


        try {

          const payload =
            isCodRefund
              ? {
                  manual_refund_reference:
                    manualRefundReference
                      .trim(),
                }
              : {};


          const response =
            await processAdminReturnRefund(
              requestData
                .return_number,
              payload
            );


          const updatedRequest =
            response
              ?.return_request;


          if (
            updatedRequest
          ) {
            applyLoadedRequest(
              updatedRequest
            );

          } else {

            await loadRequest({
              showLoader:
                false,

              clearMessages:
                false,
            });
          }


          setManualRefundReference(
            ""
          );


          setSuccess(
            response
              ?.message ||
            "Refund processed successfully."
          );

        } catch (
          refundError
        ) {

          console.error(
            "Admin return refund error:",
            refundError
          );


          setError(
            getErrorMessage(
              refundError,
              "Unable to process this refund."
            )
          );

        } finally {

          setRefunding(
            false
          );
        }
      };


    // =====================================================
    // Save Request Status
    // =====================================================

    const handleSave =
      async (
        event
      ) => {

        event.preventDefault();


        if (
          !requestData
        ) {
          return;
        }


        if (
          !selectedStatus
        ) {
          setError(
            "Please select a status."
          );

          return;
        }


        /*
         * Direct refunded status manually block karo.
         * Refund dedicated endpoint se hi process hogi.
         */
        if (
          selectedStatus ===
            "refunded" &&
          requestData.status !==
            "refunded"
        ) {
          setError(
            "Refunded status manually set nahi kiya ja sakta. Process Refund button use karo."
          );

          return;
        }


        setSaving(
          true
        );


        setError(
          ""
        );

        setSuccess(
          ""
        );


        try {

          const response =
            await updateAdminReturnRequestStatus(
              requestData
                .return_number,
              {
                status:
                  selectedStatus,

                admin_note:
                  adminNote
                    .trim(),
              }
            );


          const updatedRequest =
            response
              ?.return_request ||
            response;


          applyLoadedRequest(
            updatedRequest
          );


          setSuccess(
            response
              ?.message ||
            "Return / exchange request updated successfully."
          );

        } catch (
          saveError
        ) {

          console.error(
            "Admin return request update error:",
            saveError
          );


          setError(
            getErrorMessage(
              saveError,
              "Unable to update this return / exchange request."
            )
          );

        } finally {

          setSaving(
            false
          );
        }
      };


    // =====================================================
    // Loading
    // =====================================================

    if (
      loading
    ) {
      return (
        <main className="min-h-screen bg-gray-50 px-4 py-12">

          <div className="mx-auto max-w-7xl">

            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-gray-500 shadow-sm">
              Loading return / exchange request...
            </div>

          </div>

        </main>
      );
    }


    // =====================================================
    // Not Found / Error
    // =====================================================

    if (
      !requestData
    ) {
      return (
        <main className="min-h-screen bg-gray-50 px-4 py-12">

          <div className="mx-auto max-w-3xl">

            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

              <h1 className="text-2xl font-bold text-gray-900">
                Return Request Not Available
              </h1>


              <p className="mt-3 text-red-600">
                {
                  error ||
                  "The requested return / exchange record could not be loaded."
                }
              </p>


              <Link
                to="/admin/returns"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Back to Returns
              </Link>

            </div>

          </div>

        </main>
      );
    }


    // =====================================================
    // Render
    // =====================================================

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">


          {/* =================================================
              Header
          ================================================= */}

          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">

            <div>

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                Admin Return Management
              </p>


              <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
                {
                  requestData
                    .return_number
                }
              </h1>


              <p className="mt-2 text-gray-500">

                Review and manage this customer{" "}

                {
                  isExchange
                    ? "exchange"
                    : "return"
                }{" "}

                request.

              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                to="/admin/returns"
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                ← Returns
              </Link>


              {
                orderNumber !==
                  "-" && (

                  <Link
                    to={`/admin/orders/${encodeURIComponent(
                      orderNumber
                    )}`}
                    className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    View Order
                  </Link>

                )
              }

            </div>

          </div>


          {/* =================================================
              Messages
          ================================================= */}

          {
            error && (

              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
              >
                {error}
              </div>

            )
          }


          {
            success && (

              <div
                role="status"
                className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700"
              >
                {success}
              </div>

            )
          }


          {/* =================================================
              Top Summary
          ================================================= */}

          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                Request Type
              </p>


              <p className="mt-2 text-xl font-bold text-gray-900">

                {
                  requestData
                    .request_type_display ||
                  formatStatus(
                    requestData
                      .request_type
                  )
                }

              </p>

            </div>


            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                Status
              </p>


              <div className="mt-2">

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                    requestData.status
                  )}`}
                >

                  {
                    requestData
                      .status_display ||
                    formatStatus(
                      requestData.status
                    )
                  }

                </span>

              </div>

            </div>


            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                Items
              </p>


              <p className="mt-2 text-xl font-bold text-gray-900">
                {itemCount}
              </p>

            </div>


            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                Refund Amount
              </p>


              <p className="mt-2 text-xl font-bold text-gray-900">

                {
                  formatCurrency(
                    requestData
                      .refund_amount
                  )
                }

              </p>

            </div>

          </div>


          <div className="grid gap-8 xl:grid-cols-3">


            {/* =================================================
                Left Content
            ================================================= */}

            <div className="space-y-8 xl:col-span-2">


              {/* ===============================================
                  Request Information
              =============================================== */}

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-xl font-bold text-gray-900">
                  Request Information
                </h2>


                <div className="mt-6 grid gap-5 sm:grid-cols-2">

                  <div>

                    <p className="text-sm text-gray-500">
                      Return Number
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {
                        requestData
                          .return_number
                      }
                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Order Number
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {orderNumber}
                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Customer
                    </p>

                    <p className="mt-1 break-all font-semibold text-gray-900">

                      {
                        requestData
                          .customer_email ||
                        requestData
                          .order
                          ?.email ||
                        "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      User ID
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        getEntityId(
                          requestData.user
                        )
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Reason
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        requestData
                          .reason_display ||
                        formatStatus(
                          requestData.reason
                        )
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Requested At
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        formatDate(
                          requestData
                            .created_at
                        )
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Processed By
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        getPersonDisplay(
                          requestData
                            .processed_by
                        )
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Updated At
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        formatDate(
                          requestData
                            .updated_at
                        )
                      }

                    </p>

                  </div>

                </div>

              </section>


              {/* ===============================================
                  Customer Explanation
              =============================================== */}

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-xl font-bold text-gray-900">
                  Customer Explanation
                </h2>


                <div className="mt-5 space-y-5">

                  <div>

                    <p className="text-sm font-medium text-gray-500">
                      Reason Details
                    </p>

                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">

                      {
                        requestData
                          .reason_details ||
                        "No reason details provided."
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm font-medium text-gray-500">
                      Customer Note
                    </p>

                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">

                      {
                        requestData
                          .customer_note ||
                        "No additional customer note."
                      }

                    </p>

                  </div>

                </div>

              </section>


              {/* ===============================================
                  Return Items + Inspection
              =============================================== */}

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <h2 className="text-xl font-bold text-gray-900">

                      {
                        isExchange
                          ? "Exchange Items"
                          : "Return Items"
                      }

                    </h2>


                    <p className="mt-1 text-sm text-gray-500">
                      Products included in this request.
                    </p>

                  </div>


                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                    {itemCount} item(s)
                  </span>

                </div>


                {
                  canInspect && (

                    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

                      <p className="font-semibold text-blue-900">
                        Item Inspection
                      </p>


                      <p className="mt-1 text-sm leading-6 text-blue-700">

                        Inspect each received item and choose
                        Accept Item or Reject Item.

                        {
                          isReturn &&
                          " Accepted return items require the approved refund amount."
                        }

                      </p>

                    </div>

                  )
                }


                <div className="mt-6 space-y-4">

                  {
                    Array.isArray(
                      requestData.items
                    ) &&
                    requestData
                      .items
                      .length >
                      0
                      ? (

                        requestData.items.map(
                          (
                            item
                          ) => {

                            const orderItem =
                              getOrderItemData(
                                item
                              );


                            const productImage =
                              orderItem
                                .product_image ||
                              item
                                .product_image ||
                              "";


                            const color =
                              orderItem
                                .color ||
                              item
                                .color ||
                              "";


                            const size =
                              orderItem
                                .size ||
                              item
                                .size ||
                              "";


                            const productSku =
                              orderItem
                                .product_sku ||
                              item
                                .product_sku ||
                              "";


                            const variantSku =
                              orderItem
                                .variant_sku ||
                              item
                                .variant_sku ||
                              "";


                            const unitPrice =
                              orderItem
                                .unit_price ??
                              item
                                .unit_price;


                            const inspectionForm =
                              inspectionForms[
                                item.id
                              ] ||
                              {

                                inspection_status:
                                  "",

                                inspection_note:
                                  "",

                                is_accepted:
                                  null,

                                refund_amount:
                                  "",
                              };


                            const isInspecting =
                              inspectingItemId ===
                              item.id;


                            return (
                              <article
                                key={
                                  item.id
                                }
                                className="rounded-2xl border border-gray-200 p-5"
                              >

                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                                  <div className="flex min-w-0 gap-4">

                                    {
                                      productImage && (

                                        <img
                                          src={
                                            productImage
                                          }
                                          alt={
                                            getOrderItemName(
                                              item
                                            )
                                          }
                                          className="h-20 w-20 flex-shrink-0 rounded-xl border border-gray-200 object-cover"
                                        />

                                      )
                                    }


                                    <div className="min-w-0">

                                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Return Item #{item.id}
                                      </p>


                                      <p className="mt-1 break-words text-base font-bold text-gray-900">

                                        {
                                          getOrderItemName(
                                            item
                                          )
                                        }

                                      </p>


                                      {
                                        (
                                          color ||
                                          size
                                        ) && (

                                          <p className="mt-1 text-sm text-gray-600">

                                            {
                                              [
                                                color,
                                                size,
                                              ]
                                                .filter(
                                                  Boolean
                                                )
                                                .join(
                                                  " / "
                                                )
                                            }

                                          </p>

                                        )
                                      }


                                      {
                                        productSku && (

                                          <p className="mt-1 text-xs text-gray-500">
                                            Product SKU:{" "}
                                            {productSku}
                                          </p>

                                        )
                                      }


                                      {
                                        variantSku && (

                                          <p className="mt-1 text-xs text-gray-500">
                                            Variant SKU:{" "}
                                            {variantSku}
                                          </p>

                                        )
                                      }

                                    </div>

                                  </div>


                                  <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">

                                    Qty:{" "}

                                    {
                                      item.quantity ||
                                      0
                                    }

                                  </span>

                                </div>


                                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                                  <div>

                                    <p className="text-sm text-gray-500">
                                      Original Price
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">

                                      {
                                        unitPrice !==
                                          undefined &&
                                        unitPrice !==
                                          null
                                          ? formatCurrency(
                                              unitPrice
                                            )
                                          : "-"
                                      }

                                    </p>

                                  </div>


                                  <div>

                                    <p className="text-sm text-gray-500">
                                      Refund Amount
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">

                                      {
                                        formatCurrency(
                                          item.refund_amount
                                        )
                                      }

                                    </p>

                                  </div>


                                  {
                                    isExchange && (
                                      <>

                                        <div>

                                          <p className="text-sm text-gray-500">
                                            Replacement Size
                                          </p>

                                          <p className="mt-1 font-semibold text-gray-900">

                                            {
                                              item.replacement_size ||
                                              "-"
                                            }

                                          </p>

                                        </div>


                                        <div>

                                          <p className="text-sm text-gray-500">
                                            Replacement Color
                                          </p>

                                          <p className="mt-1 font-semibold text-gray-900">

                                            {
                                              item.replacement_color ||
                                              "-"
                                            }

                                          </p>

                                        </div>


                                        <div>

                                          <p className="text-sm text-gray-500">
                                            Replacement Variant
                                          </p>

                                          <p className="mt-1 font-semibold text-gray-900">

                                            {
                                              getReplacementVariantDisplay(
                                                item.replacement_variant
                                              )
                                            }

                                          </p>

                                        </div>

                                      </>
                                    )
                                  }


                                  <div>

                                    <p className="text-sm text-gray-500">
                                      Inspection Status
                                    </p>


                                    <div className="mt-1">

                                      {
                                        item.inspection_status
                                          ? (

                                            <span
                                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInspectionStatusClasses(
                                                item.inspection_status
                                              )}`}
                                            >

                                              {
                                                formatStatus(
                                                  item.inspection_status
                                                )
                                              }

                                            </span>

                                          )
                                          : (

                                            <span className="font-semibold text-gray-900">
                                              -
                                            </span>

                                          )
                                      }

                                    </div>

                                  </div>


                                  <div>

                                    <p className="text-sm text-gray-500">
                                      Accepted
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">

                                      {
                                        item.is_accepted ===
                                          true
                                          ? "Yes"
                                          : item.is_accepted ===
                                            false
                                            ? "No"
                                            : "-"
                                      }

                                    </p>

                                  </div>

                                </div>


                                {
                                  item.inspection_note && (

                                    <div className="mt-5 rounded-xl bg-gray-50 p-4">

                                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Saved Inspection Note
                                      </p>


                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                        {
                                          item.inspection_note
                                        }
                                      </p>

                                    </div>

                                  )
                                }


                                {/* =================================
                                    Inspection Controls
                                ================================= */}

                                {
                                  canInspect && (

                                    <div className="mt-6 border-t border-gray-200 pt-5">

                                      <div className="flex flex-wrap items-center justify-between gap-2">

                                        <div>

                                          <p className="font-semibold text-gray-900">
                                            Inspect Item
                                          </p>

                                          <p className="mt-1 text-xs text-gray-500">
                                            Return Item #{item.id}
                                          </p>

                                        </div>


                                        {
                                          inspectionForm
                                            .is_accepted ===
                                            true && (

                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                              Accepted
                                            </span>

                                          )
                                        }


                                        {
                                          inspectionForm
                                            .is_accepted ===
                                            false && (

                                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                              Rejected
                                            </span>

                                          )
                                        }

                                      </div>


                                      <div className="mt-4">

                                        <label
                                          htmlFor={`inspection-note-${item.id}`}
                                          className="mb-2 block text-sm font-semibold text-gray-700"
                                        >
                                          Inspection Note
                                        </label>


                                        <textarea
                                          id={`inspection-note-${item.id}`}
                                          rows="3"
                                          value={
                                            inspectionForm
                                              .inspection_note ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateInspectionForm(
                                              item.id,
                                              {
                                                inspection_note:
                                                  event
                                                    .target
                                                    .value,
                                              }
                                            )
                                          }
                                          disabled={
                                            isInspecting ||
                                            refunding
                                          }
                                          placeholder="Example: Product unused, tags intact, no damage..."
                                          className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                        />

                                      </div>


                                      {
                                        isReturn && (

                                          <div className="mt-4">

                                            <label
                                              htmlFor={`inspection-refund-${item.id}`}
                                              className="mb-2 block text-sm font-semibold text-gray-700"
                                            >
                                              Approved Refund Amount
                                            </label>


                                            <input
                                              id={`inspection-refund-${item.id}`}
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={
                                                inspectionForm
                                                  .refund_amount ??
                                                ""
                                              }
                                              onChange={(
                                                event
                                              ) =>
                                                updateInspectionForm(
                                                  item.id,
                                                  {
                                                    refund_amount:
                                                      event
                                                        .target
                                                        .value,
                                                  }
                                                )
                                              }
                                              disabled={
                                                isInspecting ||
                                                refunding
                                              }
                                              placeholder="0.00"
                                              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                            />


                                            <p className="mt-2 text-xs leading-5 text-gray-500">
                                              Enter the refund amount approved for this returned item.
                                            </p>

                                          </div>

                                        )
                                      }


                                      <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                        <button
                                          type="button"
                                          disabled={
                                            isInspecting ||
                                            refunding
                                          }
                                          onClick={() =>
                                            handleInspection(
                                              item,
                                              true
                                            )
                                          }
                                          className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >

                                          {
                                            isInspecting
                                              ? "Saving..."
                                              : "Accept Item"
                                          }

                                        </button>


                                        <button
                                          type="button"
                                          disabled={
                                            isInspecting ||
                                            refunding
                                          }
                                          onClick={() =>
                                            handleInspection(
                                              item,
                                              false
                                            )
                                          }
                                          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >

                                          {
                                            isInspecting
                                              ? "Saving..."
                                              : "Reject Item"
                                          }

                                        </button>

                                      </div>


                                      <p className="mt-3 text-xs leading-5 text-gray-500">

                                        Accepting or rejecting an item sends
                                        the inspection result to the backend.

                                        {
                                          isReturn &&
                                          " Only accepted items contribute to the final refund amount."
                                        }

                                      </p>

                                    </div>

                                  )
                                }

                              </article>
                            );
                          }
                        )

                      )
                      : (

                        <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                          No return items available.
                        </div>

                      )
                  }

                </div>

              </section>


              {/* ===============================================
                  Refund Information + Processing
              =============================================== */}

              {
                isReturn && (

                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div>

                        <h2 className="text-xl font-bold text-gray-900">
                          Refund Information
                        </h2>


                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Review the accepted refund amount and process the customer refund after inspection.
                        </p>

                      </div>


                      {
                        isAlreadyRefunded && (

                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                            Refunded
                          </span>

                        )
                      }

                    </div>


                    <div className="mt-6 grid gap-5 sm:grid-cols-2">

                      <div>

                        <p className="text-sm text-gray-500">
                          Refund Amount
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">

                          {
                            formatCurrency(
                              requestData
                                .refund_amount
                            )
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-sm text-gray-500">
                          Refund Status
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">

                          {
                            requestData
                              .refund_status
                              ? formatStatus(
                                  requestData
                                    .refund_status
                                )
                              : "-"
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-sm text-gray-500">
                          Refund ID
                        </p>

                        <p className="mt-1 break-all font-semibold text-gray-900">

                          {
                            requestData
                              .refund_id ||
                            "-"
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-sm text-gray-500">
                          Refunded At
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">

                          {
                            formatDate(
                              requestData
                                .refunded_at
                            )
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-sm text-gray-500">
                          Payment Method
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">

                          {
                            paymentMethod
                              ? formatStatus(
                                  paymentMethod
                                )
                              : "-"
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-sm text-gray-500">
                          Refund Ready
                        </p>

                        <p
                          className={`mt-1 font-semibold ${
                            canProcessRefund
                              ? "text-green-700"
                              : "text-gray-900"
                          }`}
                        >

                          {
                            canProcessRefund
                              ? "Yes"
                              : "No"
                          }

                        </p>

                      </div>

                    </div>


                    {
                      refundAmount <=
                        0 &&
                      !isAlreadyRefunded && (

                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">

                          Refund amount is currently{" "}

                          <strong>
                            {
                              formatCurrency(
                                requestData
                                  .refund_amount
                              )
                            }
                          </strong>.

                          {" "}

                          Accept at least one inspected item
                          and enter a positive approved refund
                          amount before processing the refund.

                        </div>

                      )
                    }


                    {
                      !isAlreadyRefunded &&
                      ![
                        "inspection_completed",
                        "refund_pending",
                      ].includes(
                        normalizedStatus
                      ) && (

                        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">

                          Refund processing will become available
                          after all return items have completed
                          inspection.

                        </div>

                      )
                    }


                    {
                      isCodRefund &&
                      !isAlreadyRefunded && (

                        <div className="mt-6">

                          <label
                            htmlFor="manual-refund-reference"
                            className="mb-2 block text-sm font-semibold text-gray-700"
                          >
                            Manual COD Refund Reference
                          </label>


                          <input
                            id="manual-refund-reference"
                            type="text"
                            value={
                              manualRefundReference
                            }
                            onChange={(
                              event
                            ) =>
                              setManualRefundReference(
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              refunding
                            }
                            placeholder="Example: CASH-REFUND-0001"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                          />


                          <p className="mt-2 text-xs leading-5 text-gray-500">

                            COD refund pehle manually customer ko
                            pay karo. Uske baad transaction,
                            UPI, bank, cash receipt ya internal
                            reference yahan enter karo.

                          </p>

                        </div>

                      )
                    }


                    {
                      !isAlreadyRefunded && (

                        <div className="mt-6 border-t border-gray-200 pt-6">

                          <button
                            type="button"
                            onClick={
                              handleRefund
                            }
                            disabled={
                              !canProcessRefund ||
                              refunding ||
                              saving ||
                              inspectingItemId !==
                                null
                            }
                            className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >

                            {
                              refunding
                                ? "Processing Refund..."
                                : `Process Refund ${formatCurrency(
                                    requestData
                                      .refund_amount
                                  )}`
                            }

                          </button>


                          <p className="mt-3 text-xs leading-5 text-gray-500">

                            Razorpay orders are refunded against
                            the original captured payment.
                            COD refunds use the manual refund
                            reference entered above.

                          </p>

                        </div>

                      )
                    }


                    {
                      isAlreadyRefunded && (

                        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">

                          <p className="font-semibold text-green-800">
                            Refund Completed
                          </p>


                          <p className="mt-1 text-sm leading-6 text-green-700">

                            This return has already been refunded.
                            Duplicate refund processing is disabled.

                          </p>

                        </div>

                      )
                    }

                  </section>

                )
              }


              {/* ===============================================
                  Shipping / Return Pickup
              =============================================== */}

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-xl font-bold text-gray-900">
                  Return Shipping
                </h2>


                <div className="mt-6 grid gap-5 sm:grid-cols-2">

                  <div>

                    <p className="text-sm text-gray-500">
                      Courier
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        requestData
                          .courier_name ||
                        "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Courier Service
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        requestData
                          .courier_service ||
                        "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      AWB
                    </p>

                    <p className="mt-1 break-all font-semibold text-gray-900">

                      {
                        requestData
                          .awb_code ||
                        "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Tracking ID
                    </p>

                    <p className="mt-1 break-all font-semibold text-gray-900">

                      {
                        requestData
                          .tracking_id ||
                        "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Shipping Status
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        requestData
                          .shipping_status
                          ? formatStatus(
                              requestData
                                .shipping_status
                            )
                          : "-"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Pickup Scheduled
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        requestData
                          .pickup_scheduled
                          ? "Yes"
                          : "No"
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Pickup Scheduled At
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {
                        formatDate(
                          requestData
                            .pickup_scheduled_at
                        )
                      }

                    </p>

                  </div>


                  <div>

                    <p className="text-sm text-gray-500">
                      Shiprocket Shipment ID
                    </p>

                    <p className="mt-1 break-all font-semibold text-gray-900">

                      {
                        requestData
                          .shiprocket_shipment_id ||
                        "-"
                      }

                    </p>

                  </div>

                </div>


                {
                  requestData
                    .tracking_url && (

                    <a
                      href={
                        requestData
                          .tracking_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Open Tracking
                    </a>

                  )
                }

              </section>


              {/* ===============================================
                  Timeline
              =============================================== */}

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-xl font-bold text-gray-900">
                  Timeline
                </h2>


                <div className="mt-6 grid gap-4 sm:grid-cols-2">

                  {
                    [
                      [
                        "Requested",
                        requestData
                          .created_at,
                      ],
                      [
                        "Approved",
                        requestData
                          .approved_at,
                      ],
                      [
                        "Rejected",
                        requestData
                          .rejected_at,
                      ],
                      [
                        "Received",
                        requestData
                          .received_at,
                      ],
                      [
                        "Refunded",
                        requestData
                          .refunded_at,
                      ],
                      [
                        "Completed",
                        requestData
                          .completed_at,
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (

                        <div
                          key={
                            label
                          }
                          className="rounded-xl bg-gray-50 p-4"
                        >

                          <p className="text-sm text-gray-500">
                            {label}
                          </p>


                          <p className="mt-1 font-semibold text-gray-900">

                            {
                              formatDate(
                                value
                              )
                            }

                          </p>

                        </div>

                      )
                    )
                  }

                </div>

              </section>

            </div>


            {/* =================================================
                Right Admin Panel
            ================================================= */}

            <aside>

              <div className="sticky top-28 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Admin Action
                </p>


                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  Update Request
                </h2>


                <p className="mt-2 text-sm leading-6 text-gray-500">

                  Update the workflow status and add an
                  internal admin note.

                </p>


                <form
                  onSubmit={
                    handleSave
                  }
                  className="mt-6 space-y-5"
                >

                  <div>

                    <label
                      htmlFor="admin-return-detail-status"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Status
                    </label>


                    <select
                      id="admin-return-detail-status"
                      value={
                        selectedStatus
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedStatus(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        saving ||
                        refunding ||
                        inspectingItemId !==
                          null
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >

                      {
                        STATUS_OPTIONS.map(
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
                              disabled={
                                Boolean(
                                  option.disabled
                                ) &&
                                requestData.status !==
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


                  <div>

                    <label
                      htmlFor="admin-return-detail-note"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Admin Note
                    </label>


                    <textarea
                      id="admin-return-detail-note"
                      rows="5"
                      value={
                        adminNote
                      }
                      onChange={(
                        event
                      ) =>
                        setAdminNote(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        saving ||
                        refunding
                      }
                      placeholder="Internal note for this return / exchange..."
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />

                  </div>


                  <button
                    type="submit"
                    disabled={
                      saving ||
                      refunding ||
                      inspectingItemId !==
                        null
                    }
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {
                      saving
                        ? "Saving..."
                        : "Update Request"
                    }

                  </button>

                </form>


                <div className="mt-6 border-t border-gray-200 pt-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Current Status
                  </p>


                  <div className="mt-3">

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        requestData.status
                      )}`}
                    >

                      {
                        requestData
                          .status_display ||
                        formatStatus(
                          requestData.status
                        )
                      }

                    </span>

                  </div>

                </div>


                {
                  requestData
                    .admin_note && (

                    <div className="mt-6 border-t border-gray-200 pt-5">

                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Saved Admin Note
                      </p>


                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {
                          requestData
                            .admin_note
                        }
                      </p>

                    </div>

                  )
                }

              </div>

            </aside>

          </div>

        </div>

      </main>
    );
  };


export default AdminReturnDetails;