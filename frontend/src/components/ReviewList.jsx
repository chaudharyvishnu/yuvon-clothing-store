import ReviewCard from "./ReviewCard";

function ReviewList({
  reviews,
  reviewsLoading,
  reviewsError,
  displayedReviewTotal,
  helpfulLoadingId,
  handleHelpful,
  StarRating,
  formatDate,
  getImageUrl,
  fallbackImage,
}) {
  return (
    <div className="mt-10 border-t pt-10">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">
          Customer Reviews
        </h3>

        <span className="text-sm text-gray-500">
          {displayedReviewTotal} reviews
        </span>
      </div>

      {reviewsLoading && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border p-6"
            >
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

              <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-200" />

              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {!reviewsLoading && reviewsError && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
          {reviewsError}
        </p>
      )}

      {!reviewsLoading &&
        !reviewsError &&
        reviews.length === 0 && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">
            <h4 className="text-xl font-bold">
              No approved reviews yet
            </h4>

            <p className="mt-2 text-gray-500">
              Be the first customer to review this
              product.
            </p>
          </div>
        )}

      {!reviewsLoading &&
        !reviewsError &&
        reviews.length > 0 && (
          <div className="mt-6 space-y-5">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                helpfulLoadingId={helpfulLoadingId}
                handleHelpful={handleHelpful}
                StarRating={StarRating}
                formatDate={formatDate}
                getImageUrl={getImageUrl}
                fallbackImage={fallbackImage}
              />
            ))}
          </div>
        )}
    </div>
  );
}

export default ReviewList;