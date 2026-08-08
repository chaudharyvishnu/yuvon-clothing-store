import {
  useMemo,
} from "react";


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
};


const getStockState = (
  stock,
  threshold
) => {
  const currentStock =
    Number(stock || 0);

  const currentThreshold =
    Number(
      threshold || 0
    );

  if (currentStock <= 0) {
    return {
      label:
        "Out of Stock",
      badgeClass:
        "bg-red-100 text-red-700",
      stockClass:
        "text-red-600",
    };
  }

  if (
    currentStock <=
    Math.max(
      1,
      Math.floor(
        currentThreshold / 2
      )
    )
  ) {
    return {
      label:
        "Critical",
      badgeClass:
        "bg-orange-100 text-orange-700",
      stockClass:
        "text-orange-600",
    };
  }

  return {
    label:
      "Low Stock",
    badgeClass:
      "bg-yellow-100 text-yellow-700",
    stockClass:
      "text-yellow-600",
  };
};


function LowStockAlerts({
  alerts = [],
  limit = 8,
}) {
  const visibleAlerts =
    useMemo(() => {
      if (
        !Array.isArray(
          alerts
        )
      ) {
        return [];
      }

      return [...alerts]
        .sort(
          (a, b) =>
            Number(
              a.stock || 0
            ) -
            Number(
              b.stock || 0
            )
        )
        .slice(
          0,
          limit
        );
    }, [
      alerts,
      limit,
    ]);


  const outOfStockCount =
    useMemo(() => {
      return visibleAlerts.filter(
        (item) =>
          Number(
            item.stock || 0
          ) <= 0
      ).length;
    }, [
      visibleAlerts,
    ]);


  return (
    <section className="dashboard-panel">

      {/* Header */}

      <div className="dashboard-section-header">
        <div>
          <h2>
            Low Stock Alerts
          </h2>

          <p>
            Variants that need inventory attention.
          </p>
        </div>
      </div>


      {/* Summary */}

      <div className="mb-5 flex flex-wrap gap-6">

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Active Alerts
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatNumber(
              visibleAlerts.length
            )}
          </p>
        </div>


        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Out of Stock
          </p>

          <p className="mt-1 text-xl font-bold text-red-600">
            {formatNumber(
              outOfStockCount
            )}
          </p>
        </div>

      </div>


      {/* Alerts */}

      {visibleAlerts.length ? (
        <div className="space-y-3">

          {visibleAlerts.map(
            (item) => {
              const state =
                getStockState(
                  item.stock,
                  item.threshold
                );

              const variantLabel = [
                item.color,
                item.size,
              ]
                .filter(Boolean)
                .join(" / ");

              return (
                <article
                  key={
                    item.variant_id
                  }
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-gray-950">
                        {item.product_name ||
                          "Product"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {variantLabel ||
                          item.variant_sku ||
                          "Variant"}
                      </p>

                      {(item.product_sku ||
                        item.variant_sku) && (
                        <p className="mt-1 text-xs text-gray-400">
                          SKU:{" "}
                          {item.variant_sku ||
                            item.product_sku}
                        </p>
                      )}

                    </div>


                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${state.badgeClass}`}
                    >
                      {state.label}
                    </span>

                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-white p-3">

                      <p className="text-xs text-gray-400">
                        Current Stock
                      </p>

                      <p
                        className={`mt-1 text-lg font-bold ${state.stockClass}`}
                      >
                        {formatNumber(
                          item.stock
                        )}
                      </p>

                    </div>


                    <div className="rounded-xl bg-white p-3">

                      <p className="text-xs text-gray-400">
                        Threshold
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-950">
                        {formatNumber(
                          item.threshold
                        )}
                      </p>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">

          <div className="text-center">

            <p className="text-lg">
              ✓
            </p>

            <p className="mt-2 text-sm font-medium text-gray-700">
              Inventory looks healthy.
            </p>

            <p className="mt-1 text-xs text-gray-500">
              No active low-stock alerts.
            </p>

          </div>

        </div>
      )}

    </section>
  );
}


export default LowStockAlerts;