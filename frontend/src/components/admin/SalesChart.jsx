import {
  useMemo,
  useState,
} from "react";

import {
  Area,
  AreaChart,
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
      <p className="mb-2 text-sm font-semibold text-gray-900">
        {label}
      </p>

      <p className="text-sm text-gray-600">
        Revenue:{" "}
        <strong className="text-gray-950">
          {formatCurrency(
            item.revenue
          )}
        </strong>
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Orders:{" "}
        <strong className="text-gray-950">
          {Number(
            item.orders || 0
          ).toLocaleString(
            "en-IN"
          )}
        </strong>
      </p>
    </div>
  );
};


function SalesChart({
  monthlySales = [],
  dailySales = [],
}) {
  const [
    period,
    setPeriod,
  ] = useState("monthly");


  const chartData =
    useMemo(() => {
      const source =
        period === "daily"
          ? dailySales
          : monthlySales;

      if (!Array.isArray(source)) {
        return [];
      }

      return source.map(
        (item) => ({
          ...item,

          label:
            item.label ||
            item.date ||
            "-",

          revenue:
            Number(
              item.revenue ||
              0
            ),

          orders:
            Number(
              item.orders ||
              0
            ),
        })
      );
    }, [
      period,
      monthlySales,
      dailySales,
    ]);


  const totalRevenue =
    useMemo(() => {
      return chartData.reduce(
        (total, item) =>
          total +
          Number(
            item.revenue ||
            0
          ),
        0
      );
    }, [chartData]);


  const totalOrders =
    useMemo(() => {
      return chartData.reduce(
        (total, item) =>
          total +
          Number(
            item.orders ||
            0
          ),
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
            Sales Revenue
          </h2>

          <p>
            {period === "monthly"
              ? "Revenue performance over the last 12 months."
              : "Daily revenue performance over the last 30 days."}
          </p>
        </div>


        {/* Period Switch */}

        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">

          <button
            type="button"
            onClick={() =>
              setPeriod(
                "daily"
              )
            }
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              period ===
              "daily"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            30 Days
          </button>

          <button
            type="button"
            onClick={() =>
              setPeriod(
                "monthly"
              )
            }
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              period ===
              "monthly"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            12 Months
          </button>

        </div>
      </div>


      {/* ===================================================
          Summary
      =================================================== */}

      <div className="mb-5 flex flex-wrap gap-6">

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Revenue
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatCurrency(
              totalRevenue
            )}
          </p>
        </div>


        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Orders
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {totalOrders.toLocaleString(
              "en-IN"
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
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >

              <defs>
                <linearGradient
                  id="salesRevenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#2563eb"
                    stopOpacity={0.25}
                  />

                  <stop
                    offset="95%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>


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
                minTickGap={22}
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
                  stroke:
                    "#9ca3af",
                  strokeDasharray:
                    "4 4",
                }}
              />


              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#salesRevenueGradient)"
                activeDot={{
                  r: 5,
                }}
              />

            </AreaChart>
          </ResponsiveContainer>

        </div>
      ) : (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Sales chart data is not available yet.
          </p>
        </div>
      )}

    </section>
  );
}


export default SalesChart;