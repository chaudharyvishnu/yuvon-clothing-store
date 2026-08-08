import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  deleteReview,
  fetchMyReviews,
  updateReview,
} from "../services/api";

const BACKEND_URL =
  "http://127.0.0.1:8000";

const STATUS_STYLES = {
  pending:
    "bg-yellow-100 text-yellow-700",
  approved:
    "bg-green-100 text-green-700",
  rejected:
    "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const EMPTY_EDIT_FORM = {
  rating: 5,
  title: "",
  comment: "",
  image: null,
  removeImage: false,
};

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${
    image.startsWith("/")
      ? image
      : `/${image}`
  }`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Something went wrong."
    );
  }

  if (
    typeof error.data === "string"
  ) {
    return error.data;
  }

  if (error.data.detail) {
    if (
      Array.isArray(
        error.data.detail
      )
    ) {
      return error.data.detail.join(
        " "
      );
    }

    return String(
      error.data.detail
    );
  }

  return Object.entries(
    error.data
  )
    .map(([field, messages]) => {
      if (
        Array.isArray(messages)
      ) {
        return `${field}: ${messages.join(
          " "
        )}`;
      }

      if (
        messages &&
        typeof messages === "object"
      ) {
        return `${field}: ${JSON.stringify(
          messages
        )}`;
      }

      return `${field}: ${String(
        messages
      )}`;
    })
    .join(" ");
}

function StarRating({
  value,
  onChange,
  readOnly = false,
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(
        (star) => {
          const active =
            star <= Number(value);

          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (
                  !readOnly &&
                  onChange
                ) {
                  onChange(star);
                }
              }}
              className={`text-2xl ${
                active
                  ? "text-yellow-400"
                  : "text-gray-300"
              } ${
                readOnly
                  ? "cursor-default"
                  : "transition hover:scale-110"
              }`}
              aria-label={`${star} stars`}
            >
              ★
            </button>
          );
        }
      )}
    </div>
  );
}

function MyReviews() {
  const navigate = useNavigate();

  const [reviews, setReviews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [editingReview, setEditingReview] =
    useState(null);

  const [editForm, setEditForm] =
    useState(EMPTY_EDIT_FORM);

  const [
    editImagePreview,
    setEditImagePreview,
  ] = useState("");

  const [
    savingReview,
    setSavingReview,
  ] = useState(false);

  const [
    deletingReviewId,
    setDeletingReviewId,
  ] = useState(null);

  const [editError, setEditError] =
    useState("");

  const [editMessage, setEditMessage] =
    useState("");

  const loadReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetchMyReviews();

      const reviewList = Array.isArray(
        response
      )
        ? response
        : response.results ||
          response.reviews ||
          [];

      setReviews(reviewList);
    } catch (fetchError) {
      console.error(
        "My reviews load error:",
        fetchError
      );

      setError(
        formatApiError(fetchError)
      );

      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    return () => {
      if (
        editImagePreview &&
        editImagePreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          editImagePreview
        );
      }
    };
  }, [editImagePreview]);

  const filteredReviews =
    useMemo(() => {
      if (
        activeFilter === "all"
      ) {
        return reviews;
      }

      return reviews.filter(
        (review) =>
          review.status ===
          activeFilter
      );
    }, [reviews, activeFilter]);

  const reviewCounts = useMemo(() => {
    return {
      all: reviews.length,

      pending: reviews.filter(
        (review) =>
          review.status ===
          "pending"
      ).length,

      approved: reviews.filter(
        (review) =>
          review.status ===
          "approved"
      ).length,

      rejected: reviews.filter(
        (review) =>
          review.status ===
          "rejected"
      ).length,
    };
  }, [reviews]);

  const openEditReview = (review) => {
    setEditingReview(review);

    setEditForm({
      rating:
        Number(review.rating) || 5,

      title:
        review.title || "",

      comment:
        review.comment || "",

      image: null,
      removeImage: false,
    });

    setEditImagePreview(
      getImageUrl(
        review.image_url ||
          review.image ||
          ""
      )
    );

    setEditError("");
    setEditMessage("");
  };

  const closeEditReview = () => {
    if (
      editImagePreview &&
      editImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        editImagePreview
      );
    }

    setEditingReview(null);
    setEditForm(EMPTY_EDIT_FORM);
    setEditImagePreview("");
    setEditError("");
    setEditMessage("");
  };

  const handleEditImageChange = (
    event
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setEditError(
        "Review image size cannot exceed 5 MB."
      );

      event.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setEditError(
        "Only JPG, PNG and WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      editImagePreview &&
      editImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        editImagePreview
      );
    }

    setEditForm((current) => ({
      ...current,
      image: file,
      removeImage: false,
    }));

    setEditImagePreview(
      URL.createObjectURL(file)
    );

    setEditError("");
  };

  const removeReviewImage = () => {
    if (
      editImagePreview &&
      editImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        editImagePreview
      );
    }

    setEditImagePreview("");

    setEditForm((current) => ({
      ...current,
      image: null,
      removeImage: true,
    }));
  };

  const validateEditForm = () => {
    if (
      editForm.rating < 1 ||
      editForm.rating > 5
    ) {
      return "Please select a rating.";
    }

    if (
      editForm.comment
        .trim()
        .length < 10
    ) {
      return "Review comment must be at least 10 characters.";
    }

    return "";
  };

  const handleSaveReview = async (
    event
  ) => {
    event.preventDefault();

    if (!editingReview) {
      return;
    }

    setEditError("");
    setEditMessage("");

    const validationError =
      validateEditForm();

    if (validationError) {
      setEditError(
        validationError
      );

      return;
    }

    try {
      setSavingReview(true);

      const response =
        await updateReview(
          editingReview.id,
          {
            rating:
              editForm.rating,

            title:
              editForm.title.trim(),

            comment:
              editForm.comment.trim(),

            image:
              editForm.image,

            removeImage:
              editForm.removeImage,
          }
        );

      const updatedReview =
        response.review ||
        response;

      setReviews(
        (currentReviews) =>
          currentReviews.map(
            (review) =>
              review.id ===
              editingReview.id
                ? {
                    ...review,
                    ...updatedReview,
                    status:
                      updatedReview.status ||
                      "pending",
                  }
                : review
          )
      );

      setEditMessage(
        response.message ||
          "Review updated successfully and moved to pending approval."
      );

      setEditingReview(
        updatedReview
      );

      setEditForm((current) => ({
        ...current,
        image: null,
        removeImage: false,
      }));

      setEditImagePreview(
        getImageUrl(
          updatedReview.image_url ||
            updatedReview.image ||
            ""
        )
      );
    } catch (saveError) {
      console.error(
        "Review update error:",
        saveError
      );

      setEditError(
        formatApiError(saveError)
      );
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteReview = async (
    review
  ) => {
    const confirmed =
      window.confirm(
        "Delete this review permanently?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingReviewId(
        review.id
      );

      const response =
        await deleteReview(
          review.id
        );

      setReviews(
        (currentReviews) =>
          currentReviews.filter(
            (item) =>
              item.id !== review.id
          )
      );

      if (
        editingReview?.id ===
        review.id
      ) {
        closeEditReview();
      }

      alert(
        response.message ||
          "Review deleted successfully."
      );
    } catch (deleteError) {
      console.error(
        "Review delete error:",
        deleteError
      );

      alert(
        formatApiError(
          deleteError
        )
      );
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              My Account
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
              My Reviews
            </h1>

            <p className="mt-2 text-gray-500">
              Manage your submitted product reviews.
            </p>
          </div>

          <Link
            to="/shop"
            className="w-fit rounded-full bg-black px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            {
              value: "all",
              label: "All",
            },
            {
              value: "pending",
              label: "Pending",
            },
            {
              value: "approved",
              label: "Approved",
            },
            {
              value: "rejected",
              label: "Rejected",
            },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                setActiveFilter(
                  filter.value
                )
              }
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                activeFilter ===
                filter.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-600"
              }`}
            >
              {filter.label}{" "}
              (
              {
                reviewCounts[
                  filter.value
                ]
              }
              )
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

                  <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-200" />

                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />

                  <div className="mt-6 h-10 w-32 animate-pulse rounded-full bg-gray-200" />
                </div>
              )
            )}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-red-600">
              Reviews load nahi ho paaye
            </h2>

            <p className="mt-3 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadReviews}
              className="mt-6 rounded-full bg-black px-6 py-3 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredReviews.length ===
            0 && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="text-5xl">
                ⭐
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                No reviews found
              </h2>

              <p className="mt-2 text-gray-500">
                Is category me abhi koi review available nahi hai.
              </p>

              <Link
                to="/shop"
                className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
              >
                Browse Products
              </Link>
            </div>
          )}

        {!loading &&
          !error &&
          filteredReviews.length >
            0 && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {filteredReviews.map(
                (review) => {
                  const status =
                    review.status ||
                    "pending";

                  const productId =
                    review.product_id ||
                    review.product?.id ||
                    review.product;

                  const productName =
                    review.product_name ||
                    review.product?.name ||
                    `Product #${productId}`;

                  const reviewImage =
                    getImageUrl(
                      review.image_url ||
                        review.image ||
                        ""
                    );

                  const deleting =
                    deletingReviewId ===
                    review.id;

                  return (
                    <article
                      key={review.id}
                      className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-4 border-b bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            Product
                          </p>

                          <h2 className="mt-1 line-clamp-2 text-xl font-bold">
                            {productName}
                          </h2>

                          <p className="mt-2 text-sm text-gray-500">
                            Submitted on{" "}
                            {formatDate(
                              review.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                            STATUS_STYLES[
                              status
                            ] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STATUS_LABELS[
                            status
                          ] || status}
                        </span>
                      </div>

                      <div className="p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <StarRating
                            value={
                              review.rating
                            }
                            readOnly
                          />

                          <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700">
                            {review.rating}/5
                          </span>

                          {review.is_verified_purchase && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                          {review.title ||
                            "Customer Review"}
                        </h3>

                        <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">
                          {review.comment}
                        </p>

                        {reviewImage && (
                          <img
                            src={reviewImage}
                            alt="Review"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.onerror =
                                null;

                              event.currentTarget.style.display =
                                "none";
                            }}
                            className="mt-4 max-h-72 rounded-2xl object-cover"
                          />
                        )}

                        {status ===
                          "rejected" &&
                          review.admin_note && (
                            <div className="mt-5 rounded-xl bg-red-50 p-4">
                              <p className="text-sm font-semibold text-red-700">
                                Admin Note
                              </p>

                              <p className="mt-1 text-sm text-red-600">
                                {
                                  review.admin_note
                                }
                              </p>
                            </div>
                          )}

                        {status ===
                          "pending" && (
                          <p className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-700">
                            Your review is waiting for admin approval.
                          </p>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3 border-t pt-5">
                          {productId && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/product/${productId}#customer-reviews`
                                )
                              }
                              className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold"
                            >
                              View Product
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openEditReview(
                                review
                              )
                            }
                            className="rounded-full border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-600"
                          >
                            Edit Review
                          </button>

                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() =>
                              handleDeleteReview(
                                review
                              )
                            }
                            className="rounded-full border border-red-500 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </div>

      {editingReview && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          onClick={
            closeEditReview
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Update Review
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Edit Your Review
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeEditReview
                }
                className="text-3xl font-light"
                aria-label="Close edit review"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSaveReview
              }
              className="space-y-5 p-6"
            >
              <div>
                <label className="block font-semibold">
                  Rating
                </label>

                <div className="mt-2">
                  <StarRating
                    value={
                      editForm.rating
                    }
                    onChange={(
                      rating
                    ) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          rating,
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Review Title
                </label>

                <input
                  type="text"
                  maxLength={150}
                  value={
                    editForm.title
                  }
                  onChange={(event) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Review title"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Review Comment
                </label>

                <textarea
                  rows={6}
                  value={
                    editForm.comment
                  }
                  onChange={(event) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        comment:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Share your experience..."
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold">
                  Review Image
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleEditImageChange
                  }
                  className="mt-2 block w-full rounded-xl border p-3"
                />

                {editImagePreview && (
                  <div className="mt-4">
                    <img
                      src={
                        editImagePreview
                      }
                      alt="Review preview"
                      className="h-40 w-40 rounded-2xl object-cover"
                    />

                    <button
                      type="button"
                      onClick={
                        removeReviewImage
                      }
                      className="mt-3 text-sm font-semibold text-red-600"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              {editError && (
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {editError}
                </p>
              )}

              {editMessage && (
                <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  {editMessage}
                </p>
              )}

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeEditReview
                  }
                  className="rounded-full border border-gray-300 px-6 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingReview
                  }
                  className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {savingReview
                    ? "Saving..."
                    : "Save Review"}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Updated review dobara pending approval me jayega.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyReviews;