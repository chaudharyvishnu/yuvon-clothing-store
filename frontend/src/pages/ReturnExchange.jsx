import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  cancelReturnRequest,
  createReturnRequest,
  fetchMyReturnRequests,
  fetchOrder,
} from "../services/api";

import {
  useAuth,
} from "../context/AuthContext";


// =========================================================
// Return / Exchange Options
// =========================================================

const REASON_OPTIONS = [
  {
    value: "wrong_size",
    label: "Wrong Size",
  },
  {
    value: "wrong_product",
    label: "Wrong Product",
  },
  {
    value: "damaged",
    label: "Damaged Product",
  },
  {
    value: "defective",
    label: "Defective Product",
  },
  {
    value: "quality_issue",
    label: "Quality Issue",
  },
  {
    value: "not_as_expected",
    label: "Not As Expected",
  },
  {
    value: "colour_issue",
    label: "Colour Issue",
  },
  {
    value: "fit_issue",
    label: "Fit Issue",
  },
  {
    value: "changed_mind",
    label: "Changed Mind",
  },
  {
    value: "other",
    label: "Other",
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


function getErrorMessage(
  error,
  fallbackMessage =
    "Something went wrong. Please try again."
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
      ] = firstEntry;

      if (
        Array.isArray(
          value
        )
      ) {
        return value
          .map(
            (item) =>
              String(
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
    error?.message &&
    !String(
      error.message
    ).startsWith(
      "API Error:"
    )
  ) {
    return error.message;
  }

  return fallbackMessage;
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


function getStatusClasses(
  requestStatus
) {
  const normalized =
    String(
      requestStatus || ""
    ).toLowerCase();

  if (
    normalized ===
      "completed" ||
    normalized ===
      "refunded" ||
    normalized ===
      "exchange_shipped"
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
      "received"
  ) {
    return (
      "bg-blue-100 text-blue-700"
    );
  }

  return (
    "bg-amber-100 text-amber-700"
  );
}


// =========================================================
// Component
// =========================================================

const ReturnExchange = () => {
  const {
    isAuthenticated,
    loading:
      authLoading,
    openLogin,
  } = useAuth();


  // =======================================================
  // Page / Order State
  // =======================================================

  const [
    step,
    setStep,
  ] = useState(1);

  const [
    orderNumber,
    setOrderNumber,
  ] = useState("");

  const [
    order,
    setOrder,
  ] = useState(
    null
  );

  const [
    loadingOrder,
    setLoadingOrder,
  ] = useState(
    false
  );


  // =======================================================
  // Return Form State
  // =======================================================

  const [
    requestType,
    setRequestType,
  ] = useState(
    "return"
  );

  const [
    reason,
    setReason,
  ] = useState(
    "wrong_size"
  );

  const [
    reasonDetails,
    setReasonDetails,
  ] = useState("");

  const [
    customerNote,
    setCustomerNote,
  ] = useState("");

  const [
    selectedItems,
    setSelectedItems,
  ] = useState({});

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false
  );

  const [
    successRequest,
    setSuccessRequest,
  ] = useState(
    null
  );


  // =======================================================
  // Existing Requests
  // =======================================================

  const [
    returnRequests,
    setReturnRequests,
  ] = useState([]);

  const [
    loadingRequests,
    setLoadingRequests,
  ] = useState(
    false
  );

  const [
    cancellingNumber,
    setCancellingNumber,
  ] = useState("");


  // =======================================================
  // Messages
  // =======================================================

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  // =======================================================
  // Derived
  // =======================================================

  const selectedItemCount =
    useMemo(
      () =>
        Object.values(
          selectedItems
        ).filter(
          (
            item
          ) =>
            item?.selected
        ).length,
      [
        selectedItems,
      ]
    );


  // =======================================================
  // Load Existing Return Requests
  // =======================================================

  const loadReturnRequests =
    async () => {
      if (
        !isAuthenticated
      ) {
        setReturnRequests(
          []
        );

        return;
      }

      setLoadingRequests(
        true
      );

      try {
        const response =
          await fetchMyReturnRequests();

        setReturnRequests(
          getResults(
            response
          )
        );
      } catch (
        loadError
      ) {
        console.error(
          "Return requests load error:",
          loadError
        );
      } finally {
        setLoadingRequests(
          false
        );
      }
    };


  useEffect(
    () => {
      if (
        authLoading
      ) {
        return;
      }

      if (
        isAuthenticated
      ) {
        loadReturnRequests();
      } else {
        setReturnRequests(
          []
        );
      }
    },
    [
      authLoading,
      isAuthenticated,
    ]
  );


  // =======================================================
  // Reset Form
  // =======================================================

  const resetRequestForm =
    () => {
      setRequestType(
        "return"
      );

      setReason(
        "wrong_size"
      );

      setReasonDetails(
        ""
      );

      setCustomerNote(
        ""
      );

      setSelectedItems(
        {}
      );

      setSuccessRequest(
        null
      );
    };


  // =======================================================
  // Find Order
  // =======================================================

  const handleFindOrder =
    async (
      event
    ) => {
      event.preventDefault();

      setError(
        ""
      );

      setSuccess(
        ""
      );

      const cleanOrderNumber =
        orderNumber
          .trim()
          .toUpperCase();

      if (
        !cleanOrderNumber
      ) {
        setError(
          "Please enter your order number."
        );

        return;
      }

      if (
        !isAuthenticated
      ) {
        setError(
          "Please login first to start a return or exchange request."
        );

        if (
          typeof openLogin ===
          "function"
        ) {
          openLogin();
        }

        return;
      }

      setLoadingOrder(
        true
      );

      try {
        const response =
          await fetchOrder(
            cleanOrderNumber
          );

        if (
          !response
        ) {
          throw new Error(
            "Order was not found."
          );
        }

        if (
          response.status !==
          "delivered"
        ) {
          setOrder(
            null
          );

          setError(
            `This order is currently "${String(
              response.status || ""
            ).replaceAll(
              "_",
              " "
            )}". Return or exchange can only be requested after delivery.`
          );

          return;
        }

        if (
          !Array.isArray(
            response.items
          ) ||
          response.items.length ===
            0
        ) {
          setOrder(
            null
          );

          setError(
            "No eligible items were found in this order."
          );

          return;
        }

        setOrder(
          response
        );

        setOrderNumber(
          response.order_number ||
            cleanOrderNumber
        );

        const initialItems =
          {};

        response.items.forEach(
          (
            item
          ) => {
            initialItems[
              item.id
            ] = {
              selected:
                false,

              quantity:
                1,

              replacement_size:
                "",

              replacement_color:
                "",
            };
          }
        );

        setSelectedItems(
          initialItems
        );

        setStep(
          2
        );
      } catch (
        findError
      ) {
        setOrder(
          null
        );

        setError(
          getErrorMessage(
            findError,
            "Unable to find this order."
          )
        );
      } finally {
        setLoadingOrder(
          false
        );
      }
    };


  // =======================================================
  // Item Selection
  // =======================================================

  const toggleItem =
    (
      itemId
    ) => {
      setSelectedItems(
        (
          previous
        ) => ({
          ...previous,

          [
            itemId
          ]: {
            ...(
              previous[
                itemId
              ] || {}
            ),

            selected:
              !previous[
                itemId
              ]?.selected,

            quantity:
              previous[
                itemId
              ]?.quantity ||
              1,

            replacement_size:
              previous[
                itemId
              ]
                ?.replacement_size ||
              "",

            replacement_color:
              previous[
                itemId
              ]
                ?.replacement_color ||
              "",
          },
        })
      );
    };


  const updateItemField =
    (
      itemId,
      field,
      value
    ) => {
      setSelectedItems(
        (
          previous
        ) => ({
          ...previous,

          [
            itemId
          ]: {
            ...(
              previous[
                itemId
              ] || {}
            ),

            [
              field
            ]:
              value,
          },
        })
      );
    };


  // =======================================================
  // Submit Return / Exchange
  // =======================================================

  const handleCreateRequest =
    async (
      event
    ) => {
      event.preventDefault();

      setError(
        ""
      );

      setSuccess(
        ""
      );

      if (
        !order
      ) {
        setError(
          "Please find your delivered order first."
        );

        setStep(
          1
        );

        return;
      }

      const items =
        order.items
          .filter(
            (
              item
            ) =>
              selectedItems[
                item.id
              ]?.selected
          )
          .map(
            (
              item
            ) => {
              const itemState =
                selectedItems[
                  item.id
                ] || {};

              const itemPayload = {
                order_item_id:
                  item.id,

                quantity:
                  Math.max(
                    1,
                    Number(
                      itemState.quantity ||
                        1
                    )
                  ),
              };

              if (
                requestType ===
                "exchange"
              ) {
                const replacementSize =
                  String(
                    itemState
                      .replacement_size ||
                      ""
                  ).trim();

                const replacementColor =
                  String(
                    itemState
                      .replacement_color ||
                      ""
                  ).trim();

                if (
                  replacementSize
                ) {
                  itemPayload
                    .replacement_size =
                    replacementSize;
                }

                if (
                  replacementColor
                ) {
                  itemPayload
                    .replacement_color =
                    replacementColor;
                }
              }

              return itemPayload;
            }
          );

      if (
        items.length ===
        0
      ) {
        setError(
          "Please select at least one item."
        );

        return;
      }

      if (
        requestType ===
        "exchange"
      ) {
        const missingReplacement =
          items.some(
            (
              item
            ) =>
              !item
                .replacement_size &&
              !item
                .replacement_color
          );

        if (
          missingReplacement
        ) {
          setError(
            "For each exchange item, please enter the replacement size or color."
          );

          return;
        }
      }

      const invalidQuantity =
        items.some(
          (
            payloadItem
          ) => {
            const original =
              order.items.find(
                (
                  item
                ) =>
                  item.id ===
                  payloadItem.order_item_id
              );

            return (
              !original ||
              payloadItem.quantity <
                1 ||
              payloadItem.quantity >
                Number(
                  original.quantity ||
                    0
                )
            );
          }
        );

      if (
        invalidQuantity
      ) {
        setError(
          "Please enter a valid quantity for all selected items."
        );

        return;
      }

      const payload = {
        order_number:
          order.order_number,

        request_type:
          requestType,

        reason,

        reason_details:
          reasonDetails.trim(),

        customer_note:
          customerNote.trim(),

        items,
      };

      setSubmitting(
        true
      );

      try {
        const response =
          await createReturnRequest(
            payload
          );

        const createdRequest =
          response
            ?.return_request ||
          response;

        setSuccessRequest(
          createdRequest
        );

        setSuccess(
          response?.message ||
            "Return / exchange request created successfully."
        );

        setStep(
          3
        );

        await loadReturnRequests();
      } catch (
        submitError
      ) {
        setError(
          getErrorMessage(
            submitError,
            "Unable to create the return / exchange request."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };


  // =======================================================
  // Cancel Request
  // =======================================================

  const handleCancelRequest =
    async (
      returnNumber
    ) => {
      if (
        !returnNumber ||
        cancellingNumber
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Cancel return request ${returnNumber}?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setError(
        ""
      );

      setSuccess(
        ""
      );

      setCancellingNumber(
        returnNumber
      );

      try {
        const response =
          await cancelReturnRequest(
            returnNumber
          );

        setSuccess(
          response?.message ||
            "Return / exchange request cancelled successfully."
        );

        await loadReturnRequests();
      } catch (
        cancelError
      ) {
        setError(
          getErrorMessage(
            cancelError,
            "Unable to cancel this request."
          )
        );
      } finally {
        setCancellingNumber(
          ""
        );
      }
    };


  // =======================================================
  // Start Another Request
  // =======================================================

  const handleStartAgain =
    () => {
      setStep(
        1
      );

      setOrder(
        null
      );

      setOrderNumber(
        ""
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      resetRequestForm();
    };


  // =======================================================
  // Render
  // =======================================================

  return (
    <main className="min-h-screen bg-gray-50 py-12 md:py-20">

      <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 md:px-6 lg:grid-cols-2">

        {/* =================================================
            Visual Section
        ================================================= */}

        <section className="hidden lg:block">

          <div className="sticky top-28 max-w-lg">

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Yuvon Returns
            </p>

            <h2 className="text-4xl font-bold leading-tight text-gray-900">
              Easy Returns.
              <br />
              Simple Exchanges.
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-600">
              Submit and track return or exchange
              requests directly from your Yuvon account.
            </p>


            <div className="mt-10 flex items-end justify-center gap-5 rounded-3xl bg-white px-8 py-12 shadow-sm">

              <div className="text-7xl">
                🛍️
              </div>

              <div className="text-8xl">
                👗
              </div>

              <div className="text-7xl">
                📦
              </div>

            </div>


            <div className="mt-8 grid grid-cols-3 gap-4">

              <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                <strong className="block text-gray-900">
                  Find Order
                </strong>

                <span className="mt-1 block text-xs text-gray-500">
                  Delivered order
                </span>
              </div>


              <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                <strong className="block text-gray-900">
                  Select Item
                </strong>

                <span className="mt-1 block text-xs text-gray-500">
                  Return or exchange
                </span>
              </div>


              <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                <strong className="block text-gray-900">
                  Submit
                </strong>

                <span className="mt-1 block text-xs text-gray-500">
                  Track request
                </span>
              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            Main Return Card
        ================================================= */}

        <div className="space-y-8">

          <section className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-xl md:p-10">

            <div className="text-center">

              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
                Returns & Exchanges
              </p>

              <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
                Return / Exchange Your Product
              </h1>

              <p className="mt-3 text-gray-500">
                Returns and exchanges are available
                for eligible delivered orders.
              </p>

            </div>


            {/* =============================================
                Steps
            ============================================= */}

            <div className="my-8 flex items-center justify-center">

              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  step >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                1
              </div>

              <div
                className={`h-1 w-16 ${
                  step >= 2
                    ? "bg-blue-600"
                    : "bg-gray-200"
                }`}
              />

              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  step >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>

              <div
                className={`h-1 w-16 ${
                  step >= 3
                    ? "bg-blue-600"
                    : "bg-gray-200"
                }`}
              />

              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  step >= 3
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>

            </div>


            {/* =============================================
                Error
            ============================================= */}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}


            {/* =============================================
                Success
            ============================================= */}

            {success && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {success}
              </div>
            )}


            {/* =============================================
                Not Logged In
            ============================================= */}

            {!authLoading &&
              !isAuthenticated && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">

                  <h3 className="text-lg font-bold text-gray-900">
                    Login Required
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Please login to your Yuvon account
                    before creating or tracking a return
                    or exchange request.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        typeof openLogin ===
                        "function"
                      ) {
                        openLogin();
                      }
                    }}
                    className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Login
                  </button>

                </div>
              )}


            {/* =============================================
                Step 1 - Find Order
            ============================================= */}

            {!authLoading &&
              isAuthenticated &&
              step === 1 && (
                <form
                  onSubmit={
                    handleFindOrder
                  }
                  className="space-y-5"
                >

                  <div>

                    <label
                      htmlFor="return-order-number"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Order Number
                    </label>

                    <input
                      id="return-order-number"
                      type="text"
                      value={
                        orderNumber
                      }
                      onChange={(
                        event
                      ) =>
                        setOrderNumber(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Example: YUV-XXXXXXXXXX"
                      autoComplete="off"
                      className="w-full rounded-xl border border-gray-300 px-5 py-4 uppercase outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />

                  </div>


                  <button
                    type="submit"
                    disabled={
                      loadingOrder
                    }
                    className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingOrder
                      ? "Finding Order..."
                      : "Find My Order"}
                  </button>

                </form>
              )}


            {/* =============================================
                Step 2 - Configure Request
            ============================================= */}

            {isAuthenticated &&
              step === 2 &&
              order && (
                <form
                  onSubmit={
                    handleCreateRequest
                  }
                  className="space-y-6"
                >

                  {/* Order Summary */}

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Order
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {
                            order.order_number
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                        {
                          String(
                            order.status ||
                              ""
                          ).replaceAll(
                            "_",
                            " "
                          )
                        }
                      </span>

                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">

                      <div>
                        <p className="text-gray-500">
                          Order Total
                        </p>

                        <p className="font-semibold text-gray-900">
                          {formatCurrency(
                            order.total_amount
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">
                          Delivered
                        </p>

                        <p className="font-semibold text-gray-900">
                          {formatDate(
                            order.delivered_at
                          )}
                        </p>
                      </div>

                    </div>

                  </div>


                  {/* Return / Exchange */}

                  <div>

                    <p className="mb-3 text-sm font-semibold text-gray-700">
                      What would you like to do?
                    </p>

                    <div className="grid grid-cols-2 gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          setRequestType(
                            "return"
                          )
                        }
                        className={`rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                          requestType ===
                          "return"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Return
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setRequestType(
                            "exchange"
                          )
                        }
                        className={`rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                          requestType ===
                          "exchange"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Exchange
                      </button>

                    </div>

                  </div>


                  {/* Items */}

                  <div>

                    <p className="mb-3 text-sm font-semibold text-gray-700">
                      Select Item
                    </p>

                    <div className="space-y-3">

                      {order.items.map(
                        (
                          item
                        ) => {
                          const itemState =
                            selectedItems[
                              item.id
                            ] || {};

                          const selected =
                            Boolean(
                              itemState.selected
                            );

                          return (
                            <div
                              key={
                                item.id
                              }
                              className={`rounded-2xl border p-4 transition ${
                                selected
                                  ? "border-blue-500 bg-blue-50/40"
                                  : "border-gray-200"
                              }`}
                            >

                              <div className="flex gap-4">

                                <input
                                  type="checkbox"
                                  checked={
                                    selected
                                  }
                                  onChange={() =>
                                    toggleItem(
                                      item.id
                                    )
                                  }
                                  className="mt-1 h-5 w-5 accent-blue-600"
                                />


                                {item.product_image ? (
                                  <img
                                    src={
                                      item.product_image
                                    }
                                    alt={
                                      item.product_name
                                    }
                                    className="h-20 w-16 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                                    👕
                                  </div>
                                )}


                                <div className="min-w-0 flex-1">

                                  <p className="font-semibold text-gray-900">
                                    {
                                      item.product_name
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-gray-500">
                                    {item.size
                                      ? `Size: ${item.size}`
                                      : ""}

                                    {item.size &&
                                    item.color
                                      ? " • "
                                      : ""}

                                    {item.color
                                      ? `Color: ${item.color}`
                                      : ""}
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-gray-700">
                                    {formatCurrency(
                                      item.unit_price
                                    )}
                                  </p>

                                </div>

                              </div>


                              {selected && (
                                <div className="mt-4 border-t border-gray-200 pt-4">

                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Quantity
                                  </label>

                                  <select
                                    value={
                                      itemState.quantity ||
                                      1
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateItemField(
                                        item.id,
                                        "quantity",
                                        Number(
                                          event
                                            .target
                                            .value
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                                  >
                                    {Array.from(
                                      {
                                        length:
                                          Number(
                                            item.quantity ||
                                              1
                                          ),
                                      },
                                      (
                                        _,
                                        index
                                      ) =>
                                        index +
                                        1
                                    ).map(
                                      (
                                        quantity
                                      ) => (
                                        <option
                                          key={
                                            quantity
                                          }
                                          value={
                                            quantity
                                          }
                                        >
                                          {
                                            quantity
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>


                                  {requestType ===
                                    "exchange" && (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                      <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          Replacement Size
                                        </label>

                                        <input
                                          type="text"
                                          value={
                                            itemState
                                              .replacement_size ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateItemField(
                                              item.id,
                                              "replacement_size",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          placeholder="Example: M"
                                          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                                        />
                                      </div>


                                      <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          Replacement Color
                                        </label>

                                        <input
                                          type="text"
                                          value={
                                            itemState
                                              .replacement_color ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateItemField(
                                              item.id,
                                              "replacement_color",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          placeholder="Example: Blue"
                                          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                                        />
                                      </div>

                                    </div>
                                  )}

                                </div>
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      {selectedItemCount} item(s) selected.
                    </p>

                  </div>


                  {/* Reason */}

                  <div>

                    <label
                      htmlFor="return-reason"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Reason
                    </label>

                    <select
                      id="return-reason"
                      value={
                        reason
                      }
                      onChange={(
                        event
                      ) =>
                        setReason(
                          event
                            .target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                    >
                      {REASON_OPTIONS.map(
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


                  {/* Reason Details */}

                  <div>

                    <label
                      htmlFor="return-reason-details"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Reason Details
                    </label>

                    <textarea
                      id="return-reason-details"
                      rows="3"
                      value={
                        reasonDetails
                      }
                      onChange={(
                        event
                      ) =>
                        setReasonDetails(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Tell us a little more about the issue..."
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                    />

                  </div>


                  {/* Customer Note */}

                  <div>

                    <label
                      htmlFor="return-customer-note"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Additional Note
                    </label>

                    <textarea
                      id="return-customer-note"
                      rows="2"
                      value={
                        customerNote
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomerNote(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Optional note"
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                    />

                  </div>


                  {/* Actions */}

                  <div className="grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={() => {
                        setStep(
                          1
                        );

                        setOrder(
                          null
                        );

                        resetRequestForm();
                      }}
                      className="rounded-xl border border-gray-300 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={
                        submitting
                      }
                      className="rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Submitting..."
                        : `Submit ${
                            requestType ===
                            "exchange"
                              ? "Exchange"
                              : "Return"
                          } Request`}
                    </button>

                  </div>

                </form>
              )}


            {/* =============================================
                Step 3 - Success
            ============================================= */}

            {isAuthenticated &&
              step === 3 && (
                <div className="text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                    ✓
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-gray-900">
                    Request Submitted
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Your return / exchange request has been received.
                  </p>


                  {successRequest
                    ?.return_number && (
                    <div className="mt-6 rounded-2xl bg-gray-50 p-5">

                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Return Request Number
                      </p>

                      <p className="mt-2 text-lg font-bold text-blue-600">
                        {
                          successRequest
                            .return_number
                        }
                      </p>

                      <p className="mt-2 text-sm capitalize text-gray-600">
                        Status:{" "}
                        {String(
                          successRequest.status ||
                            "requested"
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </p>

                    </div>
                  )}


                  <button
                    type="button"
                    onClick={
                      handleStartAgain
                    }
                    className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Start Another Request
                  </button>

                </div>
              )}


            {/* =============================================
                Policy
            ============================================= */}

            <div className="mt-8 rounded-xl bg-gray-50 p-4">

              <p className="text-center text-sm leading-6 text-gray-600">
                Return and exchange requests are subject
                to product eligibility and Yuvon return policy.
              </p>

            </div>


            <p className="mt-6 text-center text-sm text-gray-600">
              Need help with an existing order?{" "}

              <Link
                to="/orders"
                className="font-semibold text-blue-600 underline hover:text-blue-700"
              >
                My Orders
              </Link>
            </p>


            <p className="mt-8 text-center text-xs text-gray-400">
              Powered by Yuvon Returns
            </p>

          </section>


          {/* =================================================
              Existing Return Requests
          ================================================= */}

          {isAuthenticated && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                <div>

                  <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                    Your Requests
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    Return / Exchange History
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={
                    loadReturnRequests
                  }
                  disabled={
                    loadingRequests
                  }
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingRequests
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

              </div>


              {loadingRequests &&
              returnRequests.length ===
                0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Loading your return requests...
                </p>
              ) : returnRequests.length ===
                0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-center">

                  <p className="font-semibold text-gray-800">
                    No return requests yet.
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Your submitted return and exchange
                    requests will appear here.
                  </p>

                </div>
              ) : (
                <div className="space-y-4">

                  {returnRequests.map(
                    (
                      requestItem
                    ) => (
                      <article
                        key={
                          requestItem.return_number ||
                          requestItem.id
                        }
                        className="rounded-2xl border border-gray-200 p-5"
                      >

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <p className="font-bold text-gray-900">
                              {
                                requestItem.return_number
                              }
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              Order{" "}
                              {
                                requestItem.order_number
                              }
                            </p>

                          </div>


                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                              requestItem.status
                            )}`}
                          >
                            {String(
                              requestItem.status ||
                                ""
                            ).replaceAll(
                              "_",
                              " "
                            )}
                          </span>

                        </div>


                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

                          <div>
                            <span className="text-gray-500">
                              Type
                            </span>

                            <p className="font-semibold capitalize text-gray-800">
                              {
                                requestItem.request_type_display ||
                                requestItem.request_type
                              }
                            </p>
                          </div>


                          <div>
                            <span className="text-gray-500">
                              Reason
                            </span>

                            <p className="font-semibold text-gray-800">
                              {
                                requestItem.reason_display ||
                                String(
                                  requestItem.reason ||
                                    ""
                                ).replaceAll(
                                  "_",
                                  " "
                                )
                              }
                            </p>
                          </div>


                          <div>
                            <span className="text-gray-500">
                              Requested
                            </span>

                            <p className="font-semibold text-gray-800">
                              {formatDate(
                                requestItem.created_at
                              )}
                            </p>
                          </div>


                          <div>
                            <span className="text-gray-500">
                              Refund
                            </span>

                            <p className="font-semibold text-gray-800">
                              {formatCurrency(
                                requestItem.refund_amount
                              )}
                            </p>
                          </div>

                        </div>


                        {requestItem.status ===
                          "requested" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCancelRequest(
                                requestItem.return_number
                              )
                            }
                            disabled={
                              cancellingNumber ===
                              requestItem.return_number
                            }
                            className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            {cancellingNumber ===
                            requestItem.return_number
                              ? "Cancelling..."
                              : "Cancel Request"}
                          </button>
                        )}

                      </article>
                    )
                  )}

                </div>
              )}

            </section>
          )}

        </div>

      </div>

    </main>
  );
};


export default ReturnExchange;