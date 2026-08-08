function ProductReviewSummary({
  displayedRating,
  displayedReviewTotal,
  reviewSummary,
  StarRating,
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-6">
      <div className="text-center">
        <p className="text-5xl font-bold">
          {displayedRating.toFixed(1)}
        </p>

        <div className="mt-3 flex justify-center">
          <StarRating
            value={Math.round(displayedRating)}
            readOnly
          />
        </div>

        <p className="mt-2 text-gray-500">
          Based on {displayedReviewTotal} approved reviews
        </p>
      </div>

      <div className="mt-7 space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = Number(
            reviewSummary.rating_breakdown?.[rating] ||
              reviewSummary.rating_breakdown?.[
                String(rating)
              ] ||
              0
          );

          const percentage =
            displayedReviewTotal > 0
              ? Math.round(
                  (count / displayedReviewTotal) * 100
                )
              : 0;

          return (
            <div
              key={rating}
              className="flex items-center gap-3"
            >
              <span className="w-8 text-sm font-semibold">
                {rating}★
              </span>

              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>

              <span className="w-8 text-right text-sm text-gray-500">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductReviewSummary;