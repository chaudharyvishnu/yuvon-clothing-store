import {
  useMemo,
  useState,
} from "react";

import useDashboard from "../../hooks/useDashboard";

import SalesChart from "../../components/admin/SalesChart";
import OrderStatusChart from "../../components/admin/OrderStatusChart";
import PaymentChart from "../../components/admin/PaymentChart";
import RecentReviews from "../../components/admin/RecentReviews";
import RecentPayments from "../../components/admin/RecentPayments";
import LowStockAlerts from "../../components/admin/LowStockAlerts";
import TopCustomers from "../../components/admin/TopCustomers";

import "../../styles/dashboard.css";


/* =========================================================
   Formatters
========================================================= */

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


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
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


/* =========================================================
   Dashboard
========================================================= */

const Dashboard = () => {
  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const {
    overview,
    sales,
    orders,
    payments,
    products,
    customers,
    coupons,
    reviews,
    charts,
    recentActivity,
    generatedAt,

    loading,
    detailsLoading,

    error,
    detailsError,

    refreshDashboard,
    loadDashboard,
  } = useDashboard();


  /* =======================================================
     Overview Cards
  ======================================================= */

  const statCards = useMemo(
    () => [
      {
        label: "Total Revenue",
        value: formatCurrency(
          overview?.total_revenue
        ),
      },
      {
        label: "Total Orders",
        value: formatNumber(
          overview?.total_orders
        ),
      },
      {
        label: "Customers",
        value: formatNumber(
          overview?.total_customers
        ),
      },
      {
        label: "Products",
        value: formatNumber(
          overview?.total_products
        ),
      },
      {
        label: "Reviews",
        value: formatNumber(
          overview?.total_reviews
        ),
      },
      {
        label: "Coupons",
        value: formatNumber(
          overview?.total_coupons
        ),
      },
      {
        label: "Low Stock",
        value: formatNumber(
          overview?.low_stock_items
        ),
      },
      {
        label: "Out of Stock",
        value: formatNumber(
          overview?.out_of_stock_items
        ),
      },
    ],
    [overview]
  );


  /* =======================================================
     Filters
  ======================================================= */

  const handleApplyFilter =
    async (event) => {
      event.preventDefault();

      try {
        await loadDashboard({
          start_date:
            startDate,

          end_date:
            endDate,
        });
      } catch {
        // Hook already stores the error.
      }
    };


  const handleResetFilter =
    async () => {
      setStartDate("");
      setEndDate("");

      try {
        await loadDashboard({
          start_date: "",
          end_date: "",
        });
      } catch {
        // Hook already stores the error.
      }
    };


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
            Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Sales, orders, inventory and customer overview.
          </p>

          {loading && (
            <p className="dashboard-loading-text">
              Loading dashboard summary...
            </p>
          )}

          {!loading &&
            detailsLoading && (
              <p className="dashboard-loading-text">
                Loading detailed analytics...
              </p>
            )}
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="dashboard-button dashboard-button-secondary"
            onClick={() => {
              refreshDashboard()
                .catch(
                  () => {}
                );
            }}
            disabled={
              loading ||
              detailsLoading
            }
          >
            {loading
              ? "Loading..."
              : detailsLoading
                ? "Updating..."
                : "Refresh"}
          </button>
        </div>
      </section>


      {/* ===================================================
          Date Filter
      =================================================== */}

      <section className="dashboard-filter-card">
        <form
          className="dashboard-filter-form"
          onSubmit={
            handleApplyFilter
          }
        >
          <div className="dashboard-filter-field">
            <label htmlFor="dashboard-start-date">
              Start Date
            </label>

            <input
              id="dashboard-start-date"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
            />
          </div>

          <div className="dashboard-filter-field">
            <label htmlFor="dashboard-end-date">
              End Date
            </label>

            <input
              id="dashboard-end-date"
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
            />
          </div>

          <div className="dashboard-filter-actions">
            <button
              type="submit"
              className="dashboard-button dashboard-button-primary"
              disabled={loading}
            >
              {loading
                ? "Applying..."
                : "Apply"}
            </button>

            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleResetFilter
              }
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </form>
      </section>


      {/* ===================================================
          Main Error
      =================================================== */}

      {error && (
        <section className="dashboard-error">
          {error}
        </section>
      )}


      {/* ===================================================
          Details Error
      =================================================== */}

      {detailsError && (
        <section className="dashboard-error">
          Detailed analytics could not be loaded:{" "}
          {detailsError}
        </section>
      )}


      {/* ===================================================
          Overview
      =================================================== */}

      <section className="dashboard-stat-grid">
        {statCards.map(
          (card) => (
            <article
              key={card.label}
              className="dashboard-stat-card"
            >
              <span className="dashboard-stat-label">
                {card.label}
              </span>

              <strong className="dashboard-stat-value">
                {card.value}
              </strong>
            </article>
          )
        )}
      </section>


      {/* ===================================================
          Sales Summary
      =================================================== */}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>
              Sales Summary
            </h2>

            <p>
              Revenue and order performance across important periods.
            </p>
          </div>
        </div>

        <div className="dashboard-sales-grid">
          {[
            sales?.today,
            sales?.last_7_days,
            sales?.last_30_days,
            sales?.this_month,
            sales?.this_year,
          ]
            .filter(Boolean)
            .map(
              (item) => (
                <article
                  key={item.label}
                  className="dashboard-panel"
                >
                  <span className="dashboard-panel-label">
                    {item.label}
                  </span>

                  <strong className="dashboard-panel-value">
                    {formatCurrency(
                      item.revenue
                    )}
                  </strong>

                  <div className="dashboard-panel-meta">
                    <span>
                      {formatNumber(
                        item.orders
                      )}{" "}
                      orders
                    </span>

                    <span>
                      Avg{" "}
                      {formatCurrency(
                        item.average_order_value
                      )}
                    </span>
                  </div>

                  <div className="dashboard-growth">
                    Growth:{" "}
                    {Number(
                      item.growth_percentage ||
                        0
                    ).toFixed(2)}
                    %
                  </div>
                </article>
              )
            )}

          {!sales &&
            loading && (
              <article className="dashboard-panel">
                Loading sales summary...
              </article>
            )}
        </div>
      </section>


      {/* ===================================================
          Sales Chart
      =================================================== */}

      <section className="dashboard-section">
        <SalesChart
          monthlySales={
            charts?.monthly_sales ||
            []
          }
          dailySales={
            charts?.daily_sales ||
            []
          }
        />
      </section>


      {/* ===================================================
          Order + Payment Charts
      =================================================== */}

      <section className="dashboard-two-column">
        <OrderStatusChart
          data={
            charts
              ?.order_status_distribution ||
            orders
              ?.status_counts ||
            []
          }
        />

        <PaymentChart
          data={
            charts
              ?.payment_method_distribution ||
            payments
              ?.payment_methods ||
            []
          }
        />
      </section>


      {/* ===================================================
          Top Products + Inventory
      =================================================== */}

      <section className="dashboard-two-column">

        <article className="dashboard-panel">
          <div className="dashboard-section-header">
            <h2>
              Top Selling Products
            </h2>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>

              <tbody>
                {products
                  ?.top_selling_products
                  ?.length ? (
                  products
                    .top_selling_products
                    .map(
                      (product) => (
                        <tr
                          key={
                            product.product_id ??
                            product.product_name
                          }
                        >
                          <td>
                            {
                              product.product_name
                            }
                          </td>

                          <td>
                            {formatNumber(
                              product.units_sold
                            )}
                          </td>

                          <td>
                            {formatCurrency(
                              product.revenue
                            )}
                          </td>
                        </tr>
                      )
                    )
                ) : (
                  <tr>
                    <td colSpan="3">
                      {detailsLoading
                        ? "Loading product analytics..."
                        : "No sales data available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>


        <article className="dashboard-panel">
          <div className="dashboard-section-header">
            <h2>
              Low Stock
            </h2>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Stock</th>
                </tr>
              </thead>

              <tbody>
                {products
                  ?.low_stock_products
                  ?.length ? (
                  products
                    .low_stock_products
                    .map(
                      (item) => (
                        <tr
                          key={
                            item.variant_id
                          }
                        >
                          <td>
                            {
                              item.product_name
                            }
                          </td>

                          <td>
                            {[
                              item.color,
                              item.size,
                            ]
                              .filter(Boolean)
                              .join(" / ") ||
                              "-"}
                          </td>

                          <td>
                            {formatNumber(
                              item.stock
                            )}
                          </td>
                        </tr>
                      )
                    )
                ) : (
                  <tr>
                    <td colSpan="3">
                      {detailsLoading
                        ? "Loading inventory..."
                        : "No low-stock items."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

      </section>


      {/* ===================================================
          Recent Orders
      =================================================== */}

      <section className="dashboard-section">
        <article className="dashboard-panel">

          <div className="dashboard-section-header">
            <div>
              <h2>
                Recent Orders
              </h2>

              <p>
                Latest customer orders.
              </p>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {recentActivity
                  ?.recent_orders
                  ?.length ? (
                  recentActivity
                    .recent_orders
                    .map(
                      (order) => (
                        <tr
                          key={order.id}
                        >
                          <td>
                            {
                              order.order_number
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                order.customer_name
                              }
                            </strong>

                            <small className="dashboard-table-subtext">
                              {
                                order.phone
                              }
                            </small>
                          </td>

                          <td>
                            {
                              order.status
                            }
                          </td>

                          <td>
                            {
                              order.payment_status
                            }
                          </td>

                          <td>
                            {formatCurrency(
                              order.total_amount
                            )}
                          </td>

                          <td>
                            {formatDateTime(
                              order.placed_at
                            )}
                          </td>
                        </tr>
                      )
                    )
                ) : (
                  <tr>
                    <td colSpan="6">
                      {detailsLoading
                        ? "Loading recent orders..."
                        : "No recent orders."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </article>
      </section>


      {/* ===================================================
          Detailed Admin Activity
      =================================================== */}

      <section className="dashboard-two-column">
        <RecentPayments
          payments={
            recentActivity
              ?.recent_payments ||
            []
          }
        />

        <RecentReviews
          reviews={
            recentActivity
              ?.recent_reviews ||
            []
          }
        />
      </section>


      {/* ===================================================
          Inventory + Customers
      =================================================== */}

      <section className="dashboard-two-column">
        <LowStockAlerts
          alerts={
            recentActivity
              ?.low_stock_alerts ||
            []
          }
        />

        <TopCustomers
          customers={
            customers
              ?.top_customers ||
            []
          }
        />
      </section>


      {/* ===================================================
          Customer / Coupon / Review Summary
      =================================================== */}

      <section className="dashboard-three-column">

        <article className="dashboard-panel">
          <span className="dashboard-panel-label">
            Returning Customers
          </span>

          <strong className="dashboard-panel-value">
            {formatNumber(
              customers
                ?.returning_customers
            )}
          </strong>

          <small>
            New this month:{" "}
            {formatNumber(
              customers
                ?.new_customers_this_month
            )}
          </small>
        </article>


        <article className="dashboard-panel">
          <span className="dashboard-panel-label">
            Coupon Discount Given
          </span>

          <strong className="dashboard-panel-value">
            {formatCurrency(
              coupons
                ?.total_discount_given
            )}
          </strong>

          <small>
            Uses:{" "}
            {formatNumber(
              coupons
                ?.total_coupon_usages
            )}
          </small>
        </article>


        <article className="dashboard-panel">
          <span className="dashboard-panel-label">
            Average Rating
          </span>

          <strong className="dashboard-panel-value">
            {Number(
              reviews
                ?.average_rating ||
                0
            ).toFixed(2)}
            /5
          </strong>

          <small>
            Approved:{" "}
            {formatNumber(
              reviews
                ?.approved_reviews
            )}
          </small>
        </article>

      </section>


      {/* ===================================================
          Footer
      =================================================== */}

      <footer className="dashboard-footer">
        Last generated:{" "}
        {formatDateTime(
          generatedAt
        )}
      </footer>

    </main>
  );
};


export default Dashboard;