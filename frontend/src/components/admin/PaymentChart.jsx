import {
  useMemo,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  );
};


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
};


const formatCompactCurrency = (
  value
) => {
  const amount =
    Number(value || 0);

  if (amount >= 10000000) {
    return `₹${(
      amount / 10000000
    ).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(
      amount / 100000
    ).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(
      amount / 1000
    ).toFixed(1)}K`;
  }

  return `₹${amount}`;
};


const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const item =
    payload[0]?.payload ||
    {};

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-gray-950">
        {label}
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Orders:{" "}
        <strong className="text-gray-950">
          {formatNumber(
            item.count
          )}
        </strong>
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Amount:{" "}
        <strong className="text-gray-950">
          {formatCurrency(
            item.amount
          )}
        </strong>
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Share:{" "}
        <strong className="text-gray-950">
          {Number(
            item.percentage || 0
          ).toFixed(2)}
          %
        </strong>
      </p>
    </div>
  );
};


function PaymentChart({
  data = [],
}) {
  const chartData =
    useMemo(() => {
      if (
        !Array.isArray(data)
      ) {
        return [];
      }

      return data
        .map(
          (item) => ({
            payment_method:
              item.payment_method ||
              "unknown",

            label:
              item.label ||
              item.payment_method ||
              "Unknown",

            count:
              Number(
                item.count || 0
              ),

            amount:
              Number(
                item.amount || 0
              ),

            percentage:
              Number(
                item.percentage ||
                0
              ),
          })
        )
        .filter(
          (item) =>
            item.count > 0 ||
            item.amount > 0
        );
    }, [data]);


  const totalAmount =
    useMemo(() => {
      return chartData.reduce(
        (total, item) =>
          total +
          item.amount,
        0
      );
    }, [chartData]);


  const totalOrders =
    useMemo(() => {
      return chartData.reduce(
        (total, item) =>
          total +
          item.count,
        0
      );
    }, [chartData]);


  return (
    <section className="dashboard-panel">

      {/* ===================================================
          Header
      =================================================== */}

      <div className="dashboard-section-header">
        <div>
          <h2>
            Payment Methods
          </h2>

          <p>
            Orders and revenue grouped by payment method.
          </p>
        </div>
      </div>


      {/* ===================================================
          Summary
      =================================================== */}

      <div className="mb-5 flex flex-wrap gap-6">

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


        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Orders
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatNumber(
              totalOrders
            )}
          </p>
        </div>

      </div>


      {/* ===================================================
          Chart
      =================================================== */}

      {chartData.length ? (
        <div className="h-[320px] w-full">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />


              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 11,
                  fill: "#6b7280",
                }}
              />


              <YAxis
                tickLine={false}
                axisLine={false}
                width={65}
                tick={{
                  fontSize: 11,
                  fill: "#6b7280",
                }}
                tickFormatter={
                  formatCompactCurrency
                }
              />


              <Tooltip
                content={
                  <CustomTooltip />
                }
                cursor={{
                  fill:
                    "rgba(156, 163, 175, 0.08)",
                }}
              />


              <Bar
                dataKey="amount"
                fill="#111827"
                radius={[
                  7,
                  7,
                  0,
                  0,
                ]}
                maxBarSize={52}
              />

            </BarChart>
          </ResponsiveContainer>

        </div>
      ) : (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Payment chart data is not available yet.
          </p>
        </div>
      )}

    </section>
  );
}


export default PaymentChart;