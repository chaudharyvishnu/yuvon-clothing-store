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
  assignAdminShiprocketAWB,
  checkAdminOrderServiceability,
  createAdminShiprocketOrder,
  fetchAdminOrderDetail,
  fetchAdminOrderShipping,
  generateAdminShiprocketLabel,
  generateAdminShiprocketManifest,
  refreshAdminShiprocketTracking,
  scheduleAdminShiprocketPickup,
  updateAdminOrder,
  updateAdminOrderStatus,
} from "../../services/api";

import "../../styles/dashboard.css";


/* =========================================================
   API Configuration
========================================================= */

const API_BASE_URL =
  String(
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api"
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );


const getAccessToken = () => {
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
    localStorage.getItem(
      "token"
    ) ||
    ""
  );
};


/* =========================================================
   Order Status Options
========================================================= */

const ORDER_STATUS_OPTIONS = [
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
   Payment / Shipping Rules
========================================================= */

const PREPAID_SUCCESS_STATUSES =
  new Set([
    "paid",
    "captured",
    "success",
    "successful",
    "succeeded",
    "completed",
  ]);


const BLOCKED_ORDER_STATUSES =
  new Set([
    "cancelled",
    "returned",
    "refunded",
  ]);


/* =========================================================
   Formatting Helpers
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


const formatDateTime = (
  value
) => {
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
};


const formatDate = (
  value
) => {
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


  return date.toLocaleDateString(
    "en-IN",
    {
      dateStyle:
        "medium",
    }
  );
};


const formatStatus = (
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
        character
          .toUpperCase()
    );
};


const normalizeValue = (
  value
) => {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase();
};


const normalizeDateInput = (
  value
) => {
  if (!value) {
    return "";
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
    return String(
      value
    ).slice(
      0,
      10
    );
  }


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;
};


/* =========================================================
   API Error Helper
========================================================= */

const formatApiError = (
  error,
  fallbackMessage =
    "Something went wrong."
) => {
  if (!error) {
    return fallbackMessage;
  }


  if (
    typeof error ===
    "string"
  ) {
    return error;
  }


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


  if (
    error?.data &&
    typeof error.data ===
      "object"
  ) {
    return Object.entries(
      error.data
    )
      .map(
        (
          [
            key,
            value,
          ]
        ) => {
          if (
            Array.isArray(
              value
            )
          ) {
            return `${key}: ${value.join(
              " "
            )}`;
          }


          if (
            typeof value ===
              "object" &&
            value !== null
          ) {
            return `${key}: ${JSON.stringify(
              value
            )}`;
          }


          return `${key}: ${String(
            value
          )}`;
        }
      )
      .join(
        " "
      );
  }


  return fallbackMessage;
};


/* =========================================================
   Response Helpers
========================================================= */

const extractOrder = (
  response
) => {
  return (
    response?.order ||
    response?.data?.order ||
    response?.data ||
    response
  );
};


const extractCouriers = (
  response
) => {
  const possibleLists = [
    response?.data
      ?.available_courier_companies,

    response
      ?.available_courier_companies,

    response?.data
      ?.data
      ?.available_courier_companies,

    response?.couriers,

    response?.data
      ?.couriers,
  ];


  for (
    const list
    of possibleLists
  ) {
    if (
      Array.isArray(
        list
      )
    ) {
      return list;
    }
  }


  return [];
};


const extractShippingData = (
  response
) => {
  return (
    response?.shipping ||
    response?.data?.shipping ||
    response?.data ||
    response ||
    null
  );
};


/* =========================================================
   Component
========================================================= */

const AdminOrderDetails = () => {
  const {
    orderNumber,
  } = useParams();


  const navigate =
    useNavigate();


  /* =======================================================
     Order State
  ======================================================= */

  const [
    order,
    setOrder,
  ] = useState(
    null
  );


  const [
    shippingData,
    setShippingData,
  ] = useState(
    null
  );


  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState(
    ""
  );


  const [
    courierName,
    setCourierName,
  ] = useState(
    ""
  );


  const [
    trackingId,
    setTrackingId,
  ] = useState(
    ""
  );


  const [
    estimatedDelivery,
    setEstimatedDelivery,
  ] = useState(
    ""
  );


  const [
    adminNote,
    setAdminNote,
  ] = useState(
    ""
  );


  /* =======================================================
     Shiprocket State
  ======================================================= */

  const [
    availableCouriers,
    setAvailableCouriers,
  ] = useState(
    []
  );


  const [
    selectedCourierId,
    setSelectedCourierId,
  ] = useState(
    ""
  );


  const [
    serviceabilityResponse,
    setServiceabilityResponse,
  ] = useState(
    null
  );


  const [
    shiprocketMessage,
    setShiprocketMessage,
  ] = useState(
    ""
  );


  /* =======================================================
     Loading States
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    statusSaving,
    setStatusSaving,
  ] = useState(
    false
  );


  const [
    detailsSaving,
    setDetailsSaving,
  ] = useState(
    false
  );


  const [
    labelDownloading,
    setLabelDownloading,
  ] = useState(
    false
  );


  const [
    shippingLoading,
    setShippingLoading,
  ] = useState(
    false
  );


  const [
    serviceabilityLoading,
    setServiceabilityLoading,
  ] = useState(
    false
  );


  const [
    shipmentCreating,
    setShipmentCreating,
  ] = useState(
    false
  );


  const [
    awbAssigning,
    setAwbAssigning,
  ] = useState(
    false
  );


  const [
    pickupScheduling,
    setPickupScheduling,
  ] = useState(
    false
  );


  const [
    shiprocketLabelGenerating,
    setShiprocketLabelGenerating,
  ] = useState(
    false
  );


  const [
    manifestGenerating,
    setManifestGenerating,
  ] = useState(
    false
  );


  const [
    trackingRefreshing,
    setTrackingRefreshing,
  ] = useState(
    false
  );


  /* =======================================================
     Messages
  ======================================================= */

  const [
    error,
    setError,
  ] = useState(
    ""
  );


  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    ""
  );


  /* =======================================================
     Sync Order State
  ======================================================= */

  const syncOrderState =
    useCallback(
      (
        nextOrder
      ) => {
        if (
          !nextOrder
        ) {
          return;
        }


        setOrder(
          nextOrder
        );


        setSelectedStatus(
          nextOrder?.status ||
          ""
        );


        setCourierName(
          nextOrder?.courier_name ||
          ""
        );


        setTrackingId(
          nextOrder?.tracking_id ||
          nextOrder?.awb_code ||
          ""
        );


        setEstimatedDelivery(
          normalizeDateInput(
            nextOrder
              ?.estimated_delivery
          )
        );


        setAdminNote(
          nextOrder?.admin_note ||
          ""
        );


        if (
          nextOrder
            ?.courier_company_id
        ) {
          setSelectedCourierId(
            String(
              nextOrder
                .courier_company_id
            )
          );
        }
      },
      []
    );


  /* =======================================================
     Load Shipping Data
  ======================================================= */

  const loadShippingData =
    useCallback(
      async (
        currentOrderNumber
      ) => {
        const targetOrderNumber =
          currentOrderNumber ||
          orderNumber;


        if (
          !targetOrderNumber
        ) {
          return null;
        }


        setShippingLoading(
          true
        );


        try {
          const response =
            await fetchAdminOrderShipping(
              targetOrderNumber
            );


          const nextShippingData =
            extractShippingData(
              response
            );


          setShippingData(
            nextShippingData
          );


          return nextShippingData;
        } catch (
          requestError
        ) {
          console.warn(
            "Admin shipping detail load error:",
            requestError
          );


          return null;
        } finally {
          setShippingLoading(
            false
          );
        }
      },
      [
        orderNumber,
      ]
    );


  /* =======================================================
     Load Order
  ======================================================= */

  const loadOrder =
    useCallback(
      async () => {
        if (
          !orderNumber
        ) {
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


        setSuccessMessage(
          ""
        );


        try {
          const response =
            await fetchAdminOrderDetail(
              orderNumber
            );


          const nextOrder =
            extractOrder(
              response
            );


          syncOrderState(
            nextOrder
          );


          await loadShippingData(
            nextOrder
              ?.order_number ||
            orderNumber
          );
        } catch (
          requestError
        ) {
          setError(
            formatApiError(
              requestError,
              "Unable to load order details."
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        orderNumber,
        loadShippingData,
        syncOrderState,
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


  /* =======================================================
     Full Address
  ======================================================= */

  const fullAddress =
    useMemo(
      () => {
        if (
          !order
        ) {
          return "-";
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
          ) ||
          "-";
      },
      [
        order,
      ]
    );


  /* =======================================================
     Order Items
  ======================================================= */

  const orderItems =
    useMemo(
      () => {
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
      },
      [
        order,
      ]
    );


  const totalItems =
    useMemo(
      () => {
        if (
          order?.total_items !==
            undefined &&
          order?.total_items !==
            null
        ) {
          return Number(
            order.total_items
          );
        }


        return orderItems.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item?.quantity ||
              0
            ),
          0
        );
      },
      [
        order,
        orderItems,
      ]
    );


  /* =======================================================
     Payment Derived Values
  ======================================================= */

  const paymentMethod =
    normalizeValue(
      order
        ?.payment
        ?.payment_method ||
      order
        ?.payment_method
    );


  const orderPaymentStatus =
    normalizeValue(
      order
        ?.payment_status
    );


  const gatewayPaymentStatus =
    normalizeValue(
      order
        ?.payment
        ?.status
    );


  const currentOrderStatus =
    normalizeValue(
      order
        ?.status
    );


  const isCodOrder =
    paymentMethod ===
    "cod";


  const isPrepaidPaymentSuccessful =
    PREPAID_SUCCESS_STATUSES.has(
      orderPaymentStatus
    ) ||
    PREPAID_SUCCESS_STATUSES.has(
      gatewayPaymentStatus
    );


  const isOrderBlockedForShipping =
    BLOCKED_ORDER_STATUSES.has(
      currentOrderStatus
    );


  const canCreateShipment =
    Boolean(
      !isOrderBlockedForShipping &&
      (
        isCodOrder ||
        isPrepaidPaymentSuccessful
      )
    );


  const shipmentBlockedReason =
    useMemo(
      () => {
        if (
          isOrderBlockedForShipping
        ) {
          return (
            `Shipment cannot be created because ` +
            `this order is ${formatStatus(
              currentOrderStatus
            )}.`
          );
        }


        if (
          isCodOrder
        ) {
          return "";
        }


        if (
          !isPrepaidPaymentSuccessful
        ) {
          return (
            "This is a prepaid order. " +
            "Shiprocket shipment can be created only after " +
            "payment is successfully paid/captured."
          );
        }


        return "";
      },
      [
        currentOrderStatus,
        isCodOrder,
        isOrderBlockedForShipping,
        isPrepaidPaymentSuccessful,
      ]
    );


  /* =======================================================
     Shipping Derived Values
  ======================================================= */

  const shipmentId =
    shippingData
      ?.shiprocket_shipment_id ||
    shippingData
      ?.shipment_id ||
    order
      ?.shiprocket_shipment_id ||
    order
      ?.shipment_id ||
    "";


  const shiprocketOrderId =
    shippingData
      ?.shiprocket_order_id ||
    shippingData
      ?.shipping_order_id ||
    order
      ?.shiprocket_order_id ||
    order
      ?.shipping_order_id ||
    "";


  const awbCode =
    shippingData
      ?.awb_code ||
    shippingData
      ?.tracking_id ||
    order
      ?.awb_code ||
    order
      ?.tracking_id ||
    "";


  const shippingStatus =
    shippingData
      ?.shipping_status ||
    order
      ?.shipping_status ||
    "";


  const displayedCourierName =
    shippingData
      ?.courier_name ||
    order
      ?.courier_name ||
    courierName ||
    "";


  const displayedCourierService =
    shippingData
      ?.courier_service ||
    order
      ?.courier_service ||
    "";


  const trackingUrl =
    shippingData
      ?.tracking_url ||
    order
      ?.tracking_url ||
    "";


  const shippingLabelUrl =
    shippingData
      ?.shipping_label_url ||
    order
      ?.shipping_label_url ||
    "";


  const manifestUrl =
    shippingData
      ?.manifest_url ||
    order
      ?.manifest_url ||
    "";


  const pickupScheduled =
    shippingData
      ?.pickup_scheduled ??
    order
      ?.pickup_scheduled ??
    false;


  const hasShipment =
    Boolean(
      shipmentId
    );


  const hasAwb =
    Boolean(
      awbCode
    );


  /* =======================================================
     Status Update
  ======================================================= */

  const handleStatusUpdate =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !selectedStatus ||
        !orderNumber
      ) {
        return;
      }


      setStatusSaving(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await updateAdminOrderStatus(
            orderNumber,
            selectedStatus
          );


        const updatedOrder =
          extractOrder(
            response
          );


        syncOrderState(
          updatedOrder
        );


        await loadShippingData(
          orderNumber
        );


        setSuccessMessage(
          response?.message ||
          "Order status updated successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to update order status."
          )
        );
      } finally {
        setStatusSaving(
          false
        );
      }
    };


  /* =======================================================
     Courier / Admin Details Update
  ======================================================= */

  const handleOrderDetailsUpdate =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !orderNumber
      ) {
        return;
      }


      setDetailsSaving(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      const payload = {
        courier_name:
          courierName.trim(),

        tracking_id:
          trackingId.trim(),

        estimated_delivery:
          estimatedDelivery ||
          null,

        admin_note:
          adminNote.trim(),
      };


      try {
        const response =
          await updateAdminOrder(
            orderNumber,
            payload
          );


        const updatedOrder =
          extractOrder(
            response
          );


        syncOrderState(
          updatedOrder
        );


        await loadShippingData(
          orderNumber
        );


        setSuccessMessage(
          response?.message ||
          "Order details updated successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to update order details."
          )
        );
      } finally {
        setDetailsSaving(
          false
        );
      }
    };


  /* =======================================================
     Shiprocket Serviceability
  ======================================================= */

  const handleCheckServiceability =
    async () => {
      if (
        !orderNumber ||
        serviceabilityLoading
      ) {
        return;
      }


      setServiceabilityLoading(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      setShiprocketMessage(
        ""
      );


      try {
        const response =
          await checkAdminOrderServiceability(
            orderNumber
          );


        setServiceabilityResponse(
          response
        );


        const couriers =
          extractCouriers(
            response
          );


        setAvailableCouriers(
          couriers
        );


        if (
          couriers.length >
          0
        ) {
          if (
            !selectedCourierId
          ) {
            const recommendedCourier =
              couriers.find(
                (
                  courier
                ) =>
                  courier
                    ?.recommended_by_shiprocket
              ) ||
              couriers[0];


            const courierId =
              recommendedCourier
                ?.courier_company_id ||
              recommendedCourier
                ?.courier_id ||
              "";


            if (
              courierId !==
                "" &&
              courierId !==
                null &&
              courierId !==
                undefined
            ) {
              setSelectedCourierId(
                String(
                  courierId
                )
              );
            }
          }


          setSuccessMessage(
            `${couriers.length} courier option${
              couriers.length ===
              1
                ? ""
                : "s"
            } available.`
          );
        } else {
          setShiprocketMessage(
            "No courier service is currently available for this order."
          );
        }
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to check courier serviceability."
          )
        );
      } finally {
        setServiceabilityLoading(
          false
        );
      }
    };


  /* =======================================================
     Create Shiprocket Shipment
  ======================================================= */

  const handleCreateShipment =
    async () => {
      if (
        !orderNumber ||
        shipmentCreating
      ) {
        return;
      }


      if (
        hasShipment
      ) {
        setError(
          "Shiprocket shipment has already been created for this order."
        );

        return;
      }


      /*
       * IMPORTANT SHIPPING SAFETY RULE:
       *
       * COD:
       * Shipment creation is allowed before payment collection.
       *
       * Prepaid / Razorpay:
       * Shipment creation is allowed only after payment
       * is successfully paid/captured.
       */
      if (
        !canCreateShipment
      ) {
        setError(
          shipmentBlockedReason ||
          "This order is not eligible for shipment creation."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Create Shiprocket shipment for order ${orderNumber}?`
        );


      if (
        !confirmed
      ) {
        return;
      }


      setShipmentCreating(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      setShiprocketMessage(
        ""
      );


      try {
        const response =
          await createAdminShiprocketOrder(
            orderNumber
          );


        setSuccessMessage(
          response?.message ||
          "Shiprocket shipment created successfully."
        );


        await loadOrder();
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to create Shiprocket shipment."
          )
        );
      } finally {
        setShipmentCreating(
          false
        );
      }
    };


  /* =======================================================
     Assign AWB
  ======================================================= */

  const handleAssignAwb =
    async () => {
      if (
        !orderNumber ||
        awbAssigning
      ) {
        return;
      }


      if (
        !hasShipment
      ) {
        setError(
          "Create the Shiprocket shipment before assigning AWB."
        );

        return;
      }


      if (
        !selectedCourierId
      ) {
        setError(
          "Please check serviceability and select a courier first."
        );

        return;
      }


      setAwbAssigning(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await assignAdminShiprocketAWB(
            orderNumber,
            selectedCourierId
          );


        setSuccessMessage(
          response?.message ||
          "AWB assigned successfully."
        );


        await loadOrder();
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to assign AWB."
          )
        );
      } finally {
        setAwbAssigning(
          false
        );
      }
    };


  /* =======================================================
     Schedule Pickup
  ======================================================= */

  const handleSchedulePickup =
    async () => {
      if (
        !orderNumber ||
        pickupScheduling
      ) {
        return;
      }


      if (
        !hasShipment
      ) {
        setError(
          "Shipment must be created before scheduling pickup."
        );

        return;
      }


      if (
        !hasAwb
      ) {
        setError(
          "AWB must be assigned before scheduling pickup."
        );

        return;
      }


      setPickupScheduling(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await scheduleAdminShiprocketPickup(
            orderNumber
          );


        setSuccessMessage(
          response?.message ||
          "Pickup scheduled successfully."
        );


        await loadOrder();
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to schedule pickup."
          )
        );
      } finally {
        setPickupScheduling(
          false
        );
      }
    };


  /* =======================================================
     Generate Shiprocket Label
  ======================================================= */

  const handleGenerateShiprocketLabel =
    async () => {
      if (
        !orderNumber ||
        shiprocketLabelGenerating
      ) {
        return;
      }


      if (
        !hasShipment
      ) {
        setError(
          "Shipment must be created before generating a label."
        );

        return;
      }


      if (
        !hasAwb
      ) {
        setError(
          "AWB must be assigned before generating a label."
        );

        return;
      }


      setShiprocketLabelGenerating(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await generateAdminShiprocketLabel(
            orderNumber
          );


        const generatedUrl =
          response?.label_url ||
          response?.shipping_label_url ||
          response?.label_created ||
          response?.data
            ?.label_url ||
          response?.data
            ?.shipping_label_url ||
          "";


        setSuccessMessage(
          response?.message ||
          "Shiprocket label generated successfully."
        );


        await loadOrder();


        if (
          typeof generatedUrl ===
            "string" &&
          generatedUrl.startsWith(
            "http"
          )
        ) {
          window.open(
            generatedUrl,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to generate Shiprocket label."
          )
        );
      } finally {
        setShiprocketLabelGenerating(
          false
        );
      }
    };


  /* =======================================================
     Generate Manifest
  ======================================================= */

  const handleGenerateManifest =
    async () => {
      if (
        !orderNumber ||
        manifestGenerating
      ) {
        return;
      }


      if (
        !hasShipment
      ) {
        setError(
          "Shipment must be created before generating a manifest."
        );

        return;
      }


      setManifestGenerating(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await generateAdminShiprocketManifest(
            orderNumber
          );


        const generatedUrl =
          response?.manifest_url ||
          response?.manifest_url_pdf ||
          response?.data
            ?.manifest_url ||
          "";


        setSuccessMessage(
          response?.message ||
          "Manifest generated successfully."
        );


        await loadOrder();


        if (
          typeof generatedUrl ===
            "string" &&
          generatedUrl.startsWith(
            "http"
          )
        ) {
          window.open(
            generatedUrl,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to generate manifest."
          )
        );
      } finally {
        setManifestGenerating(
          false
        );
      }
    };


  /* =======================================================
     Refresh Shiprocket Tracking
  ======================================================= */

  const handleRefreshTracking =
    async () => {
      if (
        !orderNumber ||
        trackingRefreshing
      ) {
        return;
      }


      if (
        !hasAwb
      ) {
        setError(
          "AWB / tracking ID is not available yet."
        );

        return;
      }


      setTrackingRefreshing(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const response =
          await refreshAdminShiprocketTracking(
            orderNumber
          );


        setSuccessMessage(
          response?.message ||
          "Shipment tracking refreshed successfully."
        );


        await loadOrder();
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to refresh shipment tracking."
          )
        );
      } finally {
        setTrackingRefreshing(
          false
        );
      }
    };


  /* =======================================================
     Internal Shipping Label PDF Download
  ======================================================= */

  const handleShippingLabelDownload =
    async () => {
      if (
        !orderNumber ||
        labelDownloading
      ) {
        return;
      }


      setLabelDownloading(
        true
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        const accessToken =
          getAccessToken();


        if (
          !accessToken
        ) {
          throw new Error(
            "Admin session expired. Please login again."
          );
        }


        const response =
          await fetch(
            `${API_BASE_URL}/orders/admin/orders/${encodeURIComponent(
              orderNumber
            )}/shipping-label/`,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            }
          );


        if (
          !response.ok
        ) {
          let errorMessage =
            "Unable to download shipping label.";


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
              const responseData =
                await response.json();


              errorMessage =
                responseData?.detail ||
                responseData?.message ||
                errorMessage;
            } else {
              const responseText =
                await response.text();


              if (
                responseText
              ) {
                errorMessage =
                  responseText;
              }
            }
          } catch {
            // Keep default error message.
          }


          throw new Error(
            errorMessage
          );
        }


        const pdfBlob =
          await response.blob();


        const blobUrl =
          window.URL
            .createObjectURL(
              pdfBlob
            );


        const downloadLink =
          document.createElement(
            "a"
          );


        downloadLink.href =
          blobUrl;


        downloadLink.download =
          `shipping-label-${orderNumber}.pdf`;


        document.body.appendChild(
          downloadLink
        );


        downloadLink.click();


        downloadLink.remove();


        window.URL
          .revokeObjectURL(
            blobUrl
          );


        setSuccessMessage(
          "Shipping label downloaded successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          formatApiError(
            requestError,
            "Unable to download shipping label."
          )
        );
      } finally {
        setLabelDownloading(
          false
        );
      }
    };


  /* =======================================================
     Selected Courier
  ======================================================= */

  const selectedCourier =
    useMemo(
      () => {
        return (
          availableCouriers.find(
            (
              courier
            ) => {
              const courierId =
                courier
                  ?.courier_company_id ||
                courier
                  ?.courier_id;


              return String(
                courierId
              ) ===
              String(
                selectedCourierId
              );
            }
          ) ||
          null
        );
      },
      [
        availableCouriers,
        selectedCourierId,
      ]
    );


  /* =======================================================
     Loading Screen
  ======================================================= */

  if (
    loading
  ) {
    return (
      <main className="admin-dashboard-page">

        <section className="dashboard-panel">
          Loading order details...
        </section>

      </main>
    );
  }


  /* =======================================================
     Load Error
  ======================================================= */

  if (
    error &&
    !order
  ) {
    return (
      <main className="admin-dashboard-page">

        <section className="dashboard-error">
          {error}
        </section>


        <div className="dashboard-header-actions">

          <button
            type="button"
            className="dashboard-button dashboard-button-secondary"
            onClick={() =>
              navigate(
                "/admin/orders"
              )
            }
          >
            Back to Orders
          </button>

        </div>

      </main>
    );
  }


  if (
    !order
  ) {
    return (
      <main className="admin-dashboard-page">

        <section className="dashboard-error">
          Order not found.
        </section>

      </main>
    );
  }


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
            Order{" "}
            {
              order.order_number
            }
          </h1>


          <p className="dashboard-subtitle">
            Review customer, payment, shipping,
            Shiprocket and order status details.
          </p>

        </div>


        <div className="dashboard-header-actions">

          <Link
            to="/admin/orders"
            className="dashboard-button dashboard-button-secondary"
          >
            Back to Orders
          </Link>


          <button
            type="button"
            className="dashboard-button dashboard-button-secondary"
            onClick={
              loadOrder
            }
            disabled={
              loading ||
              shippingLoading
            }
          >
            {
              loading ||
              shippingLoading
                ? "Refreshing..."
                : "Refresh"
            }
          </button>


          <button
            type="button"
            className="dashboard-button dashboard-button-primary"
            onClick={
              handleShippingLabelDownload
            }
            disabled={
              labelDownloading
            }
          >
            {
              labelDownloading
                ? "Downloading Label..."
                : "Download Shipping Label"
            }
          </button>

        </div>

      </section>


      {/* ===================================================
          Messages
      =================================================== */}

      {error && (
        <section className="dashboard-error">
          {error}
        </section>
      )}


      {successMessage && (
        <section
          className="dashboard-panel"
          style={{
            border:
              "1px solid #86efac",
          }}
        >
          {
            successMessage
          }
        </section>
      )}


      {shiprocketMessage && (
        <section
          className="dashboard-panel"
          style={{
            border:
              "1px solid #fde68a",
          }}
        >
          {
            shiprocketMessage
          }
        </section>
      )}


      {/* ===================================================
          Summary
      =================================================== */}

      <section className="dashboard-three-column">

        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Order Status
          </span>


          <strong className="dashboard-panel-value">
            {
              formatStatus(
                order.status
              )
            }
          </strong>


          <small>
            Updated:{" "}
            {
              formatDateTime(
                order.updated_at
              )
            }
          </small>

        </article>


        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Payment
          </span>


          <strong className="dashboard-panel-value">
            {
              formatStatus(
                order.payment_status
              )
            }
          </strong>


          <small>
            {
              String(
                order.payment_method ||
                "-"
              ).toUpperCase()
            }
          </small>

        </article>


        <article className="dashboard-panel">

          <span className="dashboard-panel-label">
            Order Total
          </span>


          <strong className="dashboard-panel-value">
            {
              formatCurrency(
                order.total_amount
              )
            }
          </strong>


          <small>
            {
              totalItems
            }{" "}
            item
            {
              Number(
                totalItems
              ) ===
              1
                ? ""
                : "s"
            }
          </small>

        </article>

      </section>


      {/* ===================================================
          Customer / Timeline
      =================================================== */}

      <section className="dashboard-two-column">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Customer
              </h2>


              <p>
                Customer and delivery information.
              </p>

            </div>

          </div>


          <div>

            <p>
              <strong>
                Name:
              </strong>{" "}
              {
                order.full_name ||
                "-"
              }
            </p>


            <p>
              <strong>
                Email:
              </strong>{" "}
              {
                order.customer_email ||
                order.user?.email ||
                "-"
              }
            </p>


            <p>
              <strong>
                Phone:
              </strong>{" "}
              {
                order.phone ||
                "-"
              }
            </p>


            <p>
              <strong>
                Alternate Phone:
              </strong>{" "}
              {
                order.alternate_phone ||
                "-"
              }
            </p>


            <p>
              <strong>
                Address:
              </strong>{" "}
              {
                fullAddress
              }
            </p>

          </div>

        </article>


        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>
              <h2>
                Timeline
              </h2>
            </div>

          </div>


          <div>

            <p>
              <strong>
                Placed:
              </strong>{" "}
              {
                formatDateTime(
                  order.placed_at
                )
              }
            </p>


            <p>
              <strong>
                Shipment Created:
              </strong>{" "}
              {
                formatDateTime(
                  order.shipment_created_at
                )
              }
            </p>


            <p>
              <strong>
                AWB Assigned:
              </strong>{" "}
              {
                formatDateTime(
                  order.awb_assigned_at
                )
              }
            </p>


            <p>
              <strong>
                Pickup:
              </strong>{" "}
              {
                formatDateTime(
                  order.pickup_scheduled_at
                )
              }
            </p>


            <p>
              <strong>
                Shipped:
              </strong>{" "}
              {
                formatDateTime(
                  order.shipped_at
                )
              }
            </p>


            <p>
              <strong>
                In Transit:
              </strong>{" "}
              {
                formatDateTime(
                  order.in_transit_at
                )
              }
            </p>


            <p>
              <strong>
                Out for Delivery:
              </strong>{" "}
              {
                formatDateTime(
                  order.out_for_delivery_at
                )
              }
            </p>


            <p>
              <strong>
                Delivered:
              </strong>{" "}
              {
                formatDateTime(
                  order.delivered_at
                )
              }
            </p>


            <p>
              <strong>
                Cancelled:
              </strong>{" "}
              {
                formatDateTime(
                  order.cancelled_at
                )
              }
            </p>


            <p>
              <strong>
                Estimated Delivery:
              </strong>{" "}
              {
                formatDate(
                  order.estimated_delivery
                )
              }
            </p>

          </div>

        </article>

      </section>


      {/* ===================================================
          Shiprocket Management
      =================================================== */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Shiprocket Shipping
              </h2>


              <p>
                Check courier availability, create shipment,
                assign AWB, schedule pickup and track delivery.
              </p>

            </div>

          </div>


          <div className="dashboard-three-column">

            <div className="dashboard-panel">

              <span className="dashboard-panel-label">
                Shipment ID
              </span>


              <strong className="dashboard-panel-value">
                {
                  shipmentId ||
                  "-"
                }
              </strong>

            </div>


            <div className="dashboard-panel">

              <span className="dashboard-panel-label">
                AWB
              </span>


              <strong className="dashboard-panel-value">
                {
                  awbCode ||
                  "-"
                }
              </strong>

            </div>


            <div className="dashboard-panel">

              <span className="dashboard-panel-label">
                Shipping Status
              </span>


              <strong className="dashboard-panel-value">
                {
                  formatStatus(
                    shippingStatus
                  )
                }
              </strong>

            </div>

          </div>


          <div
            style={{
              marginTop:
                "24px",
            }}
          >

            <p>
              <strong>
                Shiprocket Order ID:
              </strong>{" "}
              {
                shiprocketOrderId ||
                "-"
              }
            </p>


            <p>
              <strong>
                Courier:
              </strong>{" "}
              {
                displayedCourierName ||
                "-"
              }
            </p>


            <p>
              <strong>
                Courier Service:
              </strong>{" "}
              {
                displayedCourierService ||
                "-"
              }
            </p>


            <p>
              <strong>
                Pickup:
              </strong>{" "}
              {
                pickupScheduled
                  ? "Scheduled"
                  : "Not Scheduled"
              }
            </p>

          </div>


          {/* ===============================================
              Payment Safety Gate
          =============================================== */}

          {
            !hasShipment &&
            !canCreateShipment &&
            shipmentBlockedReason && (
              <div
                style={{
                  marginTop:
                    "24px",

                  padding:
                    "16px",

                  border:
                    "1px solid #fde68a",

                  borderRadius:
                    "12px",

                  background:
                    "#fffbeb",
                }}
              >

                <strong>
                  Shipment creation locked
                </strong>


                <p
                  style={{
                    marginTop:
                      "6px",

                    marginBottom:
                      0,
                  }}
                >
                  {
                    shipmentBlockedReason
                  }
                </p>

              </div>
            )
          }


          {/* ===============================================
              Serviceability
          =============================================== */}

          <div
            style={{
              marginTop:
                "28px",
            }}
          >

            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleCheckServiceability
              }
              disabled={
                serviceabilityLoading
              }
            >
              {
                serviceabilityLoading
                  ? "Checking Couriers..."
                  : "Check Courier Serviceability"
              }
            </button>

          </div>


          {
            availableCouriers.length >
              0 && (
              <div
                style={{
                  marginTop:
                    "24px",
                }}
              >

                <div className="dashboard-filter-field">

                  <label htmlFor="shiprocket-courier">
                    Select Courier
                  </label>


                  <select
                    id="shiprocket-courier"
                    value={
                      selectedCourierId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedCourierId(
                        event.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Courier
                    </option>


                    {
                      availableCouriers.map(
                        (
                          courier,
                          index
                        ) => {
                          const courierId =
                            courier
                              ?.courier_company_id ||
                            courier
                              ?.courier_id ||
                            index;


                          return (
                            <option
                              key={
                                courierId
                              }
                              value={
                                courierId
                              }
                            >
                              {
                                courier
                                  ?.courier_name ||
                                courier
                                  ?.name ||
                                `Courier ${courierId}`
                              }

                              {
                                courier
                                  ?.rate !==
                                  undefined
                                  ? ` - ${formatCurrency(
                                      courier.rate
                                    )}`
                                  : ""
                              }

                              {
                                courier
                                  ?.estimated_delivery_days
                                  ? ` - ${courier.estimated_delivery_days} day(s)`
                                  : ""
                              }
                            </option>
                          );
                        }
                      )
                    }

                  </select>

                </div>


                {
                  selectedCourier && (
                    <div
                      className="dashboard-panel"
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >

                      <p>
                        <strong>
                          Courier:
                        </strong>{" "}
                        {
                          selectedCourier
                            ?.courier_name ||
                          selectedCourier
                            ?.name ||
                          "-"
                        }
                      </p>


                      <p>
                        <strong>
                          Rate:
                        </strong>{" "}
                        {
                          selectedCourier
                            ?.rate !==
                            undefined
                            ? formatCurrency(
                                selectedCourier.rate
                              )
                            : "-"
                        }
                      </p>


                      <p>
                        <strong>
                          Estimated Delivery:
                        </strong>{" "}
                        {
                          selectedCourier
                            ?.estimated_delivery_days
                            ? `${selectedCourier.estimated_delivery_days} day(s)`
                            : selectedCourier
                                ?.etd ||
                              "-"
                        }
                      </p>


                      <p>
                        <strong>
                          Rating:
                        </strong>{" "}
                        {
                          selectedCourier
                            ?.rating ??
                          "-"
                        }
                      </p>

                    </div>
                  )
                }

              </div>
            )
          }


          {/* ===============================================
              Shiprocket Action Buttons
          =============================================== */}

          <div
            className="dashboard-filter-actions"
            style={{
              marginTop:
                "28px",

              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                "12px",
            }}
          >

            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={
                handleCreateShipment
              }
              disabled={
                shipmentCreating ||
                hasShipment ||
                !canCreateShipment
              }
              title={
                !canCreateShipment
                  ? shipmentBlockedReason
                  : ""
              }
            >
              {
                hasShipment
                  ? "Shipment Created"
                  : shipmentCreating
                    ? "Creating Shipment..."
                    : !canCreateShipment
                      ? "Payment Required"
                      : "Create Shiprocket Shipment"
              }
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={
                handleAssignAwb
              }
              disabled={
                awbAssigning ||
                !hasShipment ||
                hasAwb
              }
            >
              {
                hasAwb
                  ? "AWB Assigned"
                  : awbAssigning
                    ? "Assigning AWB..."
                    : "Assign AWB"
              }
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={
                handleSchedulePickup
              }
              disabled={
                pickupScheduling ||
                !hasAwb ||
                pickupScheduled
              }
            >
              {
                pickupScheduled
                  ? "Pickup Scheduled"
                  : pickupScheduling
                    ? "Scheduling Pickup..."
                    : "Schedule Pickup"
              }
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleGenerateShiprocketLabel
              }
              disabled={
                shiprocketLabelGenerating ||
                !hasAwb
              }
            >
              {
                shiprocketLabelGenerating
                  ? "Generating Label..."
                  : "Generate Shiprocket Label"
              }
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleGenerateManifest
              }
              disabled={
                manifestGenerating ||
                !hasShipment
              }
            >
              {
                manifestGenerating
                  ? "Generating Manifest..."
                  : "Generate Manifest"
              }
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleRefreshTracking
              }
              disabled={
                trackingRefreshing ||
                !hasAwb
              }
            >
              {
                trackingRefreshing
                  ? "Refreshing Tracking..."
                  : "Refresh Tracking"
              }
            </button>

          </div>


          {/* ===============================================
              Generated Links
          =============================================== */}

          {
            (
              trackingUrl ||
              shippingLabelUrl ||
              manifestUrl
            ) && (
              <div
                className="dashboard-filter-actions"
                style={{
                  marginTop:
                    "24px",

                  display:
                    "flex",

                  flexWrap:
                    "wrap",

                  gap:
                    "12px",
                }}
              >

                {
                  trackingUrl && (
                    <a
                      href={
                        trackingUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="dashboard-button dashboard-button-secondary"
                    >
                      Open Tracking
                    </a>
                  )
                }


                {
                  shippingLabelUrl && (
                    <a
                      href={
                        shippingLabelUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="dashboard-button dashboard-button-secondary"
                    >
                      Open Shiprocket Label
                    </a>
                  )
                }


                {
                  manifestUrl && (
                    <a
                      href={
                        manifestUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="dashboard-button dashboard-button-secondary"
                    >
                      Open Manifest
                    </a>
                  )
                }

              </div>
            )
          }


          {
            serviceabilityResponse && (
              <details
                style={{
                  marginTop:
                    "24px",
                }}
              >

                <summary
                  style={{
                    cursor:
                      "pointer",

                    fontWeight:
                      600,
                  }}
                >
                  View Serviceability API Response
                </summary>


                <pre
                  style={{
                    marginTop:
                      "12px",

                    whiteSpace:
                      "pre-wrap",

                    wordBreak:
                      "break-word",

                    overflow:
                      "auto",

                    maxHeight:
                      "400px",

                    padding:
                      "16px",

                    borderRadius:
                      "12px",

                    background:
                      "#f8fafc",
                  }}
                >
                  {
                    JSON.stringify(
                      serviceabilityResponse,
                      null,
                      2
                    )
                  }
                </pre>

              </details>
            )
          }

        </article>

      </section>


      {/* ===================================================
          Order Items
      =================================================== */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Order Items
              </h2>


              <p>
                Products included in this order.
              </p>

            </div>

          </div>


          <div className="dashboard-table-wrap">

            <table className="dashboard-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Variant
                  </th>

                  <th>
                    Qty
                  </th>

                  <th>
                    Unit Price
                  </th>

                  <th>
                    Total
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  orderItems.length
                    ? (
                      orderItems.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item.id ||
                              `${order.order_number}-${index}`
                            }
                          >

                            <td>
                              <strong>
                                {
                                  item.product_name ||
                                  item.product?.name ||
                                  "Product"
                                }
                              </strong>
                            </td>


                            <td>
                              {
                                item.variant_sku ||
                                item.product_sku ||
                                item.sku ||
                                "-"
                              }
                            </td>


                            <td>
                              {
                                [
                                  item.color,
                                  item.size,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " / "
                                  ) ||
                                "-"
                              }
                            </td>


                            <td>
                              {
                                item.quantity ||
                                0
                              }
                            </td>


                            <td>
                              {
                                formatCurrency(
                                  item.unit_price ??
                                  item.price
                                )
                              }
                            </td>


                            <td>
                              {
                                formatCurrency(
                                  item.total_price ??
                                  item.subtotal ??
                                  Number(
                                    item.unit_price ??
                                    item.price ??
                                    0
                                  ) *
                                  Number(
                                    item.quantity ||
                                    0
                                  )
                                )
                              }
                            </td>

                          </tr>
                        )
                      )
                    )
                    : (
                      <tr>

                        <td
                          colSpan="6"
                        >
                          No order items found.
                        </td>

                      </tr>
                    )
                }

              </tbody>

            </table>

          </div>

        </article>

      </section>


      {/* ===================================================
          Status / Courier
      =================================================== */}

      <section className="dashboard-two-column">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Update Status
              </h2>


              <p>
                Change the current order status.
              </p>

            </div>

          </div>


          <form
            onSubmit={
              handleStatusUpdate
            }
          >

            <div className="dashboard-filter-field">

              <label htmlFor="admin-order-status">
                Status
              </label>


              <select
                id="admin-order-status"
                value={
                  selectedStatus
                }
                onChange={(
                  event
                ) =>
                  setSelectedStatus(
                    event.target.value
                  )
                }
              >

                {
                  ORDER_STATUS_OPTIONS.map(
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


            <div className="dashboard-filter-actions">

              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  statusSaving
                }
              >
                {
                  statusSaving
                    ? "Updating..."
                    : "Update Status"
                }
              </button>

            </div>

          </form>


          {
            selectedStatus ===
              "delivered" &&
            paymentMethod ===
              "cod" && (
              <p className="dashboard-table-subtext">
                COD orders are automatically
                marked paid/captured when delivered.
              </p>
            )
          }

        </article>


        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Manual Courier Details
              </h2>


              <p>
                Manually update courier,
                tracking and delivery information.
              </p>

            </div>

          </div>


          <form
            onSubmit={
              handleOrderDetailsUpdate
            }
          >

            <div className="dashboard-filter-field">

              <label htmlFor="admin-courier-name">
                Courier Name
              </label>


              <input
                id="admin-courier-name"
                type="text"
                placeholder="Delhivery"
                value={
                  courierName
                }
                onChange={(
                  event
                ) =>
                  setCourierName(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="dashboard-filter-field">

              <label htmlFor="admin-tracking-id">
                Tracking ID
              </label>


              <input
                id="admin-tracking-id"
                type="text"
                placeholder="Tracking ID / AWB"
                value={
                  trackingId
                }
                onChange={(
                  event
                ) =>
                  setTrackingId(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="dashboard-filter-field">

              <label htmlFor="admin-estimated-delivery">
                Estimated Delivery
              </label>


              <input
                id="admin-estimated-delivery"
                type="date"
                value={
                  estimatedDelivery
                }
                onChange={(
                  event
                ) =>
                  setEstimatedDelivery(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="dashboard-filter-field">

              <label htmlFor="admin-note">
                Admin Note
              </label>


              <textarea
                id="admin-note"
                rows="5"
                placeholder="Internal note for this order..."
                value={
                  adminNote
                }
                onChange={(
                  event
                ) =>
                  setAdminNote(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="dashboard-filter-actions">

              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  detailsSaving
                }
              >
                {
                  detailsSaving
                    ? "Saving..."
                    : "Save Courier Details"
                }
              </button>

            </div>

          </form>

        </article>

      </section>


      {/* ===================================================
          Payment / Amount
      =================================================== */}

      <section className="dashboard-two-column">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <h2>
              Payment Details
            </h2>

          </div>


          <p>
            <strong>
              Method:
            </strong>{" "}

            {
              String(
                order.payment?.payment_method ||
                order.payment_method ||
                "-"
              ).toUpperCase()
            }
          </p>


          <p>
            <strong>
              Payment Status:
            </strong>{" "}

            {
              formatStatus(
                order.payment_status
              )
            }
          </p>


          <p>
            <strong>
              Gateway Status:
            </strong>{" "}

            {
              formatStatus(
                order.payment?.status
              )
            }
          </p>


          <p>
            <strong>
              Amount:
            </strong>{" "}

            {
              formatCurrency(
                order.payment?.amount ??
                order.total_amount
              )
            }
          </p>


          <p>
            <strong>
              Transaction:
            </strong>{" "}

            {
              order.payment?.transaction_id ||
              "-"
            }
          </p>


          <p>
            <strong>
              Gateway Order ID:
            </strong>{" "}

            {
              order.payment?.gateway_order_id ||
              "-"
            }
          </p>


          <p>
            <strong>
              Gateway Payment ID:
            </strong>{" "}

            {
              order.payment?.gateway_payment_id ||
              "-"
            }
          </p>


          <p>
            <strong>
              Paid At:
            </strong>{" "}

            {
              formatDateTime(
                order.payment?.paid_at
              )
            }
          </p>

        </article>


        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <h2>
              Amount Summary
            </h2>

          </div>


          <p>
            <strong>
              Subtotal:
            </strong>{" "}

            {
              formatCurrency(
                order.subtotal
              )
            }
          </p>


          <p>
            <strong>
              Discount:
            </strong>{" "}

            {
              formatCurrency(
                order.discount_amount
              )
            }
          </p>


          <p>
            <strong>
              Shipping:
            </strong>{" "}

            {
              formatCurrency(
                order.shipping_charge
              )
            }
          </p>


          <p>
            <strong>
              Tax:
            </strong>{" "}

            {
              formatCurrency(
                order.tax_amount
              )
            }
          </p>


          <p>
            <strong>
              Grand Total:
            </strong>{" "}

            {
              formatCurrency(
                order.total_amount
              )
            }
          </p>


          <p>
            <strong>
              Coupon:
            </strong>{" "}

            {
              order.coupon_code ||
              "-"
            }
          </p>

        </article>

      </section>


      {/* ===================================================
          Customer Note
      =================================================== */}

      {
        order.customer_note && (
          <section className="dashboard-section">

            <article className="dashboard-panel">

              <div className="dashboard-section-header">

                <h2>
                  Customer Note
                </h2>

              </div>


              <p>
                {
                  order.customer_note
                }
              </p>

            </article>

          </section>
        )
      }

    </main>
  );
};


export default AdminOrderDetails;