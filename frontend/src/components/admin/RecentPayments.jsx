import {
  useMemo,
} from "react";


const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );
};


const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

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


const getStatusClasses = (status) => {
  switch (status) {
    case "captured":
    case "paid":
      return "bg-green-100 text-green-700";

    case "authorized":
      return "bg-blue-100 text-blue-700";

    case "created":
    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "refunded":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};


const getPaymentMethodLabel = (
  method
) => {
  const labels = {
    cod: "Cash on Delivery",
    razorpay: "Razorpay",
    upi: "UPI",
    card: "Card",
    net_banking:
      "Net Banking",
  };

  return (
    labels[method] ||
    method ||
    "Unknown"
  );
};


function RecentPayments({
  payments = [],
  limit = 8,
}) {
  const visiblePayments =
    useMemo(() => {
      if (
        !Array.isArray(
          payments
        )
      ) {
        return [];
      }

      return payments.slice(
        0,
        limit
      );
    }, [
      payments,
      limit,
    ]);


  const totalAmount =
    useMemo(() => {
      return visiblePayments.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount ||
              0
          ),
        0
      );
    }, [
      visiblePayments,
    ]);


  return (
    <section className="dashboard-panel">

      {/* Header */}

      <div className="dashboard-section-header">
        <div>
          <h2>
            Recent Payments
          </h2>

          <p>
            Latest payment activity across customer orders.
          </p>
        </div>
      </div>


      {/* Summary */}

      <div className="mb-5 flex flex-wrap gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Payments
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {visiblePayments.length.toLocaleString(
              "en-IN"
            )}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Amount
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatCurrency(
              totalAmount
            )}
          </p>
        </div>
      </div>


      {/* Payment List */}

      {visiblePayments.length ? (
        <div className="space-y-3">

          {visiblePayments.map(
            (payment) => (
              <article
                key={payment.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div className="min-w-0">

                    <p className="font-semibold text-gray-950">
                      {payment.order_number ||
                        "Order"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {getPaymentMethodLabel(
                        payment.payment_method
                      )}
                    </p>

                  </div>


                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                      payment.status
                    )}`}
                  >
                    {payment.status ||
                      "unknown"}
                  </span>

                </div>


                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">

                  <div>
                    <p className="text-xs text-gray-400">
                      Amount
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-950">
                      {formatCurrency(
                        payment.amount
                      )}
                    </p>
                  </div>


                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      Transaction ID
                    </p>

                    <p className="mt-1 max-w-[220px] truncate text-xs font-medium text-gray-600">
                      {payment.transaction_id ||
                        "Not available"}
                    </p>
                  </div>

                </div>


                <div className="mt-4 border-t border-gray-200 pt-3">

                  <time
                    dateTime={
                      payment.created_at ||
                      undefined
                    }
                    className="text-xs text-gray-400"
                  >
                    {formatDateTime(
                      payment.created_at
                    )}
                  </time>

                </div>

              </article>
            )
          )}

        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            No recent payments available.
          </p>
        </div>
      )}

    </section>
  );
}


export default RecentPayments;