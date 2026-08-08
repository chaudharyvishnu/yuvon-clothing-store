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


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
};


const getInitial = (name) => {
  const cleanedName =
    String(name || "")
      .trim();

  return (
    cleanedName
      .charAt(0)
      .toUpperCase() ||
    "C"
  );
};


function TopCustomers({
  customers = [],
  limit = 8,
}) {
  const visibleCustomers =
    useMemo(() => {
      if (
        !Array.isArray(
          customers
        )
      ) {
        return [];
      }

      return customers
        .slice()
        .sort(
          (a, b) =>
            Number(
              b.total_spent ||
              0
            ) -
            Number(
              a.total_spent ||
              0
            )
        )
        .slice(
          0,
          limit
        );
    }, [
      customers,
      limit,
    ]);


  const totalRevenue =
    useMemo(() => {
      return visibleCustomers.reduce(
        (total, customer) =>
          total +
          Number(
            customer.total_spent ||
            0
          ),
        0
      );
    }, [
      visibleCustomers,
    ]);


  return (
    <section className="dashboard-panel">

      {/* Header */}

      <div className="dashboard-section-header">
        <div>
          <h2>
            Top Customers
          </h2>

          <p>
            Highest-value customers based on paid order spending.
          </p>
        </div>
      </div>


      {/* Summary */}

      <div className="mb-5 flex flex-wrap gap-6">

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Customers
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatNumber(
              visibleCustomers.length
            )}
          </p>
        </div>


        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Combined Spend
          </p>

          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatCurrency(
              totalRevenue
            )}
          </p>
        </div>

      </div>


      {/* Customer List */}

      {visibleCustomers.length ? (
        <div className="space-y-3">

          {visibleCustomers.map(
            (
              customer,
              index
            ) => (
              <article
                key={
                  customer.user_id ??
                  `${customer.email}-${index}`
                }
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {getInitial(
                      customer.name
                    )}
                  </div>


                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <p className="truncate font-semibold text-gray-950">
                        {customer.name ||
                          "Customer"}
                      </p>

                      {index < 3 && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                          #{index + 1}
                        </span>
                      )}

                    </div>


                    {customer.email && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {customer.email}
                      </p>
                    )}


                    {customer.phone && (
                      <p className="mt-1 text-xs text-gray-400">
                        +91{" "}
                        {customer.phone}
                      </p>
                    )}

                  </div>

                </div>


                <div className="ml-auto text-right">

                  <p className="font-bold text-gray-950">
                    {formatCurrency(
                      customer.total_spent
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatNumber(
                      customer.total_orders
                    )}{" "}
                    orders
                  </p>

                </div>

              </article>
            )
          )}

        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">

          <div className="text-center">

            <p className="text-sm font-medium text-gray-700">
              No customer spending data available.
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Top customers will appear after paid orders are recorded.
            </p>

          </div>

        </div>
      )}

    </section>
  );
}


export default TopCustomers;