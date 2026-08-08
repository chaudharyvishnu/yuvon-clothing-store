function ReviewCard({
  review,
  helpfulLoadingId,
  handleHelpful,
  StarRating,
  formatDate,
  getImageUrl,
  fallbackImage,
}) {
  return (
    <article className="rounded-2xl border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StarRating
            value={review.rating}
            readOnly
            size="text-lg"
          />

          <h4 className="mt-2 text-lg font-bold">
            {review.title || "Customer Review"}
          </h4>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">
              {review.user_name || "Customer"}
            </span>

            {review.is_verified_purchase && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                ✓ Verified Purchase
              </span>
            )}

            <span>
              {formatDate(review.created_at)}
            </span>
          </div>
        </div>

        <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700">
          {review.rating}/5
        </span>
      </div>

      <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
        {review.comment}
      </p>

      {(review.image_url || review.image) && (
        <img
          src={getImageUrl(
            review.image_url || review.image
          )}
          alt="Customer review"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = fallbackImage;
          }}
          className="mt-4 max-h-72 rounded-2xl object-cover"
        />
      )}

      <button
        type="button"
        disabled={helpfulLoadingId === review.id}
        onClick={() =>
          handleHelpful(review.id)
        }
        className={`mt-5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          review.is_helpful_by_user
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-300 hover:border-blue-600 hover:text-blue-600"
        }`}
      >
        {helpfulLoadingId === review.id
          ? "Updating..."
          : `Helpful (${
              review.helpful_count ??
              review.helpful_votes ??
              0
            })`}
      </button>
    </article>
  );
}

export default ReviewCard;