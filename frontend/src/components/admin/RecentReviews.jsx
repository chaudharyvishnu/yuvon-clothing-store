import {
  useMemo,
} from "react";


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
    case "approved":
      return "bg-green-100 text-green-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};


const renderStars = (rating) => {
  const safeRating = Math.max(
    0,
    Math.min(
      5,
      Number(rating || 0)
    )
  );

  return Array.from(
    {
      length: 5,
    },
    (_, index) => (
      <span
        key={index}
        className={
          index < safeRating
            ? "text-yellow-500"
            : "text-gray-300"
        }
      >
        ★
      </span>
    )
  );
};


function RecentReviews({
  reviews = [],
  limit = 6,
}) {
  const visibleReviews =
    useMemo(() => {
      if (
        !Array.isArray(
          reviews
        )
      ) {
        return [];
      }

      return reviews.slice(
        0,
        limit
      );
    }, [
      reviews,
      limit,
    ]);


  return (
    <section className="dashboard-panel">

      {/* ===================================================
          Header
      =================================================== */}

      <div className="dashboard-section-header">
        <div>
          <h2>
            Recent Reviews
          </h2>

          <p>
            Latest customer feedback and ratings.
          </p>
        </div>
      </div>


      {/* ===================================================
          Reviews
      =================================================== */}

      {visibleReviews.length ? (
        <div className="space-y-4">

          {visibleReviews.map(
            (review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >

                {/* Top Row */}

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div className="min-w-0">

                    <p className="truncate font-semibold text-gray-950">
                      {review.product_name ||
                        "Product"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {review.customer_name ||
                        "Customer"}
                    </p>

                  </div>


                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                      review.status
                    )}`}
                  >
                    {review.status ||
                      "pending"}
                  </span>

                </div>


                {/* Rating */}

                <div className="mt-3 flex items-center gap-2">

                  <div
                    className="flex text-sm"
                    aria-label={`${review.rating || 0} out of 5 stars`}
                  >
                    {renderStars(
                      review.rating
                    )}
                  </div>

                  <span className="text-xs font-medium text-gray-500">
                    {Number(
                      review.rating || 0
                    ).toFixed(1)}
                    /5
                  </span>

                </div>


                {/* Review Title */}

                {review.title && (
                  <p className="mt-3 text-sm font-semibold text-gray-800">
                    {review.title}
                  </p>
                )}


                {/* Verified Purchase */}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

                  <div>
                    {review.is_verified_purchase ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Verified Purchase
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                        Unverified Purchase
                      </span>
                    )}
                  </div>


                  <time
                    dateTime={
                      review.created_at ||
                      undefined
                    }
                    className="text-xs text-gray-400"
                  >
                    {formatDateTime(
                      review.created_at
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
            No recent reviews available.
          </p>
        </div>
      )}

    </section>
  );
}


export default RecentReviews;