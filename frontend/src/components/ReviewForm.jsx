function ReviewForm({
  isLoggedIn,
  eligibility,
  reviewForm,
  setReviewForm,
  reviewImagePreview,
  reviewSubmitError,
  reviewSubmitMessage,
  submittingReview,
  handleReviewImageChange,
  handleReviewSubmit,
  openLogin,
  StarRating,
  setReviewImagePreview,
}) {
  return (
    <div className="rounded-2xl border p-6">
      <h3 className="text-xl font-bold">
        Write a Review
      </h3>

      {!isLoggedIn ? (
        <div className="mt-4 rounded-xl bg-blue-50 p-5">
          <p className="text-blue-700">
            Review submit karne ke liye login required hai.
          </p>

          <button
            type="button"
            onClick={openLogin}
            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white"
          >
            Login Now
          </button>
        </div>
      ) : eligibility &&
        eligibility.can_review === false ? (
        <div className="mt-4 rounded-xl bg-yellow-50 p-5">
          <p className="font-semibold text-yellow-800">
            {eligibility.reason ||
              "You cannot submit another review for this product."}
          </p>

          {eligibility.existing_review?.status && (
            <p className="mt-2 text-sm capitalize text-yellow-700">
              Review status:{" "}
              {eligibility.existing_review.status}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleReviewSubmit}
          className="mt-5 space-y-4"
        >
          <div>
            <label className="font-semibold">
              Your Rating
            </label>

            <div className="mt-2">
              <StarRating
                value={reviewForm.rating}
                onChange={(rating) =>
                  setReviewForm((current) => ({
                    ...current,
                    rating,
                  }))
                }
              />
            </div>
          </div>

          <input
            type="text"
            value={reviewForm.title}
            onChange={(event) =>
              setReviewForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            maxLength={150}
            placeholder="Review title (optional)"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            value={reviewForm.comment}
            onChange={(event) =>
              setReviewForm((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
            rows={5}
            placeholder="Share your experience with this product..."
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div>
            <label className="block font-semibold">
              Review Image (optional)
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReviewImageChange}
              className="mt-2 block w-full rounded-xl border p-3"
            />

            {reviewImagePreview && (
              <div className="mt-3">
                <img
                  src={reviewImagePreview}
                  alt="Review preview"
                  className="h-32 w-32 rounded-xl object-cover"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (reviewImagePreview) {
                      URL.revokeObjectURL(
                        reviewImagePreview
                      );
                    }

                    setReviewImagePreview("");

                    setReviewForm((current) => ({
                      ...current,
                      image: null,
                    }));
                  }}
                  className="mt-2 text-sm font-semibold text-red-600"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          {eligibility?.verified_purchase_available && (
            <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
              ✓ Your review will receive a Verified
              Purchase badge.
            </p>
          )}

          {reviewSubmitError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {reviewSubmitError}
            </p>
          )}

          {reviewSubmitMessage && (
            <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {reviewSubmitMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submittingReview}
            className="rounded-full bg-black px-7 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submittingReview
              ? "Submitting..."
              : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
}

export default ReviewForm;