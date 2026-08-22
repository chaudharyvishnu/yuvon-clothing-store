import {
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
  fetchAdminOrderDetail,
  updateAdminOrder,
  updateAdminOrderStatus,
} from "../../services/api";

import "../../styles/dashboard.css";


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


const formatDate = (value) => {
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

  return date.toLocaleDateString(
    "en-IN",
    {
      dateStyle: "medium",
    }
  );
};


const formatStatus = (value) => {
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


const AdminOrderDetails = () => {
  const {
    orderNumber,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    order,
    setOrder,
  ] = useState(null);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("");

  const [
    courierName,
    setCourierName,
  ] = useState("");

  const [
    trackingId,
    setTrackingId,
  ] = useState("");

  const [
    estimatedDelivery,
    setEstimatedDelivery,
  ] = useState("");

  const [
    adminNote,
    setAdminNote,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    statusSaving,
    setStatusSaving,
  ] = useState(false);

  const [
    detailsSaving,
    setDetailsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  const loadOrder =
    async () => {
      if (!orderNumber) {
        setError(
          "Order number is missing."
        );

        setLoading(false);

        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await fetchAdminOrderDetail(
            orderNumber
          );

        setOrder(
          data
        );

        setSelectedStatus(
          data?.status ||
          ""
        );

        setCourierName(
          data?.courier_name ||
          ""
        );

        setTrackingId(
          data?.tracking_id ||
          ""
        );

        setEstimatedDelivery(
          data?.estimated_delivery ||
          ""
        );

        setAdminNote(
          data?.admin_note ||
          ""
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
            "Unable to load order details."
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(
    () => {
      loadOrder();
    },
    [
      orderNumber,
    ]
  );


  const fullAddress =
    useMemo(
      () => {
        if (!order) {
          return "-";
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
          .filter(Boolean)
          .join(", ");
      },
      [
        order,
      ]
    );


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

      setStatusSaving(true);
      setError("");
      setSuccessMessage("");

      try {
        const response =
          await updateAdminOrderStatus(
            orderNumber,
            selectedStatus
          );

        const updatedOrder =
          response?.order ||
          response;

        setOrder(
          updatedOrder
        );

        setSelectedStatus(
          updatedOrder?.status ||
          selectedStatus
        );

        setCourierName(
          updatedOrder?.courier_name ||
          ""
        );

        setTrackingId(
          updatedOrder?.tracking_id ||
          ""
        );

        setEstimatedDelivery(
          updatedOrder?.estimated_delivery ||
          ""
        );

        setAdminNote(
          updatedOrder?.admin_note ||
          ""
        );

        setSuccessMessage(
          response?.message ||
            "Order status updated successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
            "Unable to update order status."
        );
      } finally {
        setStatusSaving(false);
      }
    };


  const handleOrderDetailsUpdate =
    async (
      event
    ) => {
      event.preventDefault();

      if (!orderNumber) {
        return;
      }

      setDetailsSaving(true);
      setError("");
      setSuccessMessage("");

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
          response?.order ||
          response;

        setOrder(
          updatedOrder
        );

        setSelectedStatus(
          updatedOrder?.status ||
          selectedStatus
        );

        setCourierName(
          updatedOrder?.courier_name ||
          ""
        );

        setTrackingId(
          updatedOrder?.tracking_id ||
          ""
        );

        setEstimatedDelivery(
          updatedOrder?.estimated_delivery ||
          ""
        );

        setAdminNote(
          updatedOrder?.admin_note ||
          ""
        );

        setSuccessMessage(
          response?.message ||
            "Order details updated successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
            "Unable to update order details."
        );
      } finally {
        setDetailsSaving(false);
      }
    };


  if (loading) {
    return (
      <main className="admin-dashboard-page">
        <section className="dashboard-panel">
          Loading order details...
        </section>
      </main>
    );
  }


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


  if (!order) {
    return (
      <main className="admin-dashboard-page">
        <section className="dashboard-error">
          Order not found.
        </section>
      </main>
    );
  }


  return (
    <main className="admin-dashboard-page">

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
            Review customer, payment,
            shipping and order status details.
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
          >
            Refresh
          </button>
        </div>
      </section>


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
              order.total_items ||
              0
            }{" "}
            item
            {
              Number(
                order.total_items ||
                0
              ) === 1
                ? ""
                : "s"
            }
          </small>
        </article>

      </section>


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
                  order.items?.length
                    ? (
                      order.items.map(
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  item.product_name
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                item.variant_sku ||
                                item.product_sku ||
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
                                item.quantity
                              }
                            </td>

                            <td>
                              {
                                formatCurrency(
                                  item.unit_price
                                )
                              }
                            </td>

                            <td>
                              {
                                formatCurrency(
                                  item.total_price
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
            order.payment_method ===
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
                Courier Details
              </h2>

              <p>
                Update courier, tracking and delivery details.
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
                placeholder="Tracking ID"
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
                order.payment?.amount ||
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