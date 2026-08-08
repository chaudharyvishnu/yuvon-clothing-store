import {
  useMemo,
} from "react";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";


const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  packed: "#6366f1",
  shipped: "#0ea5e9",
  out_for_delivery: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
  returned: "#f97316",
  refunded: "#6b7280",
};


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
};


const CustomTooltip = ({
  active,
  payload,
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
        {item.label}
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


function OrderStatusChart({
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
            status:
              item.status ||
              "unknown",

            label:
              item.label ||
              item.status ||
              "Unknown",

            count:
              Number(
                item.count || 0
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
            item.count > 0
        );
    }, [data]);


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
            Order Status
          </h2>

          <p>
            Current order distribution across all statuses.
          </p>
        </div>
      </div>


      {/* ===================================================
          Total
      =================================================== */}

      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Total Orders
        </p>

        <p className="mt-1 text-xl font-bold text-gray-950">
          {formatNumber(
            totalOrders
          )}
        </p>
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
            <PieChart>

              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
              >
                {chartData.map(
                  (entry) => (
                    <Cell
                      key={
                        entry.status
                      }
                      fill={
                        STATUS_COLORS[
                          entry.status
                        ] ||
                        "#9ca3af"
                      }
                    />
                  )
                )}
              </Pie>


              <Tooltip
                content={
                  <CustomTooltip />
                }
              />


              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                formatter={(
                  value
                ) => (
                  <span className="text-xs text-gray-700">
                    {value}
                  </span>
                )}
              />

            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Order status data is not available yet.
          </p>
        </div>
      )}

    </section>
  );
}


export default OrderStatusChart;