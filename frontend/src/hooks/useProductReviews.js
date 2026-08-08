import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createReview,
  fetchProductReviews,
  fetchProductReviewSummary,
  fetchReviewEligibility,
  toggleReviewHelpful,
} from "../services/api";

const EMPTY_REVIEW_FORM = {
  rating: 5,
  title: "",
  comment: "",
  image: null,
};

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Something went wrong. Please try again."
    );
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    return Array.isArray(
      error.data.detail
    )
      ? error.data.detail.join(" ")
      : String(error.data.detail);
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
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

function useProductReviews({
  productId,
  isLoggedIn,
  openLogin,
}) {
  const [reviews, setReviews] =
    useState([]);

  const [
    reviewSummary,
    setReviewSummary,
  ] = useState({
    average_rating: 0,
    total_reviews: 0,
    rating_breakdown: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    },
  });

  const [
    reviewsLoading,
    setReviewsLoading,
  ] = useState(true);

  const [
    reviewsError,
    setReviewsError,
  ] = useState("");

  const [
    eligibility,
    setEligibility,
  ] = useState(null);

  const [
    reviewForm,
    setReviewForm,
  ] = useState(EMPTY_REVIEW_FORM);

  const [
    reviewImagePreview,
    setReviewImagePreview,
  ] = useState("");

  const [
    submittingReview,
    setSubmittingReview,
  ] = useState(false);

  const [
    reviewSubmitError,
    setReviewSubmitError,
  ] = useState("");

  const [
    reviewSubmitMessage,
    setReviewSubmitMessage,
  ] = useState("");

  const [
    helpfulLoadingId,
    setHelpfulLoadingId,
  ] = useState(null);

  const loadReviews =
    useCallback(async () => {
      if (!productId) {
        setReviewsLoading(false);
        return;
      }

      setReviewsLoading(true);
      setReviewsError("");

      try {
        const [
          reviewsResponse,
          summaryResponse,
        ] = await Promise.all([
          fetchProductReviews(productId),
          fetchProductReviewSummary(
            productId
          ),
        ]);

        const reviewList =
          Array.isArray(reviewsResponse)
            ? reviewsResponse
            : reviewsResponse.results ||
              [];

        setReviews(reviewList);

        setReviewSummary({
          average_rating: Number(
            summaryResponse.average_rating ||
              0
          ),

          total_reviews: Number(
            summaryResponse.total_reviews ||
              0
          ),

          rating_breakdown:
            summaryResponse.rating_breakdown ||
            {
              5: 0,
              4: 0,
              3: 0,
              2: 0,
              1: 0,
            },
        });
      } catch (error) {
        console.error(
          "Reviews loading error:",
          error
        );

        setReviewsError(
          formatApiError(error)
        );
      } finally {
        setReviewsLoading(false);
      }
    }, [productId]);

  const loadEligibility =
    useCallback(async () => {
      if (
        !productId ||
        !isLoggedIn
      ) {
        setEligibility(null);
        return;
      }

      try {
        const response =
          await fetchReviewEligibility(
            productId
          );

        setEligibility(response);
      } catch (error) {
        console.error(
          "Review eligibility error:",
          error
        );

        if (error.status === 401) {
          setEligibility(null);
          return;
        }

        setEligibility({
          can_review: false,
          reason:
            formatApiError(error),
        });
      }
    }, [productId, isLoggedIn]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  useEffect(() => {
    return () => {
      if (reviewImagePreview) {
        URL.revokeObjectURL(
          reviewImagePreview
        );
      }
    };
  }, [reviewImagePreview]);

  const handleReviewImageChange = (
    event
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    setReviewSubmitError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      file &&
      !allowedTypes.includes(file.type)
    ) {
      setReviewSubmitError(
        "Only JPG, PNG, and WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file &&
      file.size >
        5 * 1024 * 1024
    ) {
      setReviewSubmitError(
        "Review image must be smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    setReviewForm((current) => ({
      ...current,
      image: file,
    }));

    if (reviewImagePreview) {
      URL.revokeObjectURL(
        reviewImagePreview
      );
    }

    setReviewImagePreview(
      file
        ? URL.createObjectURL(file)
        : ""
    );
  };

  const handleReviewSubmit = async (
    event
  ) => {
    event.preventDefault();

    setReviewSubmitError("");
    setReviewSubmitMessage("");

    if (!isLoggedIn) {
      openLogin();
      return;
    }

    if (
      reviewForm.rating < 1 ||
      reviewForm.rating > 5
    ) {
      setReviewSubmitError(
        "Please select a rating."
      );
      return;
    }

    if (
      reviewForm.comment
        .trim()
        .length < 10
    ) {
      setReviewSubmitError(
        "Review comment must be at least 10 characters."
      );
      return;
    }

    try {
      setSubmittingReview(true);

      const response =
        await createReview({
          productId,

          orderItemId:
            eligibility?.order_item_id ||
            null,

          rating:
            reviewForm.rating,

          title:
            reviewForm.title,

          comment:
            reviewForm.comment,

          image:
            reviewForm.image,
        });

      setReviewSubmitMessage(
        response.message ||
          "Review submitted successfully and is waiting for admin approval."
      );

      setReviewForm(
        EMPTY_REVIEW_FORM
      );

      if (reviewImagePreview) {
        URL.revokeObjectURL(
          reviewImagePreview
        );
      }

      setReviewImagePreview("");

      setEligibility({
        can_review: false,

        reason:
          "Your review is waiting for admin approval.",

        existing_review:
          response.review || null,
      });

      await loadReviews();
    } catch (error) {
      console.error(
        "Review submit error:",
        error
      );

      setReviewSubmitError(
        formatApiError(error)
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (
    reviewId
  ) => {
    if (!isLoggedIn) {
      openLogin();
      return;
    }

    try {
      setHelpfulLoadingId(
        reviewId
      );

      const response =
        await toggleReviewHelpful(
          reviewId
        );

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,

                helpful_count:
                  response.helpful_count,

                helpful_votes:
                  response.helpful_count,

                is_helpful_by_user:
                  response.is_helpful,
              }
            : review
        )
      );
    } catch (error) {
      console.error(
        "Helpful vote error:",
        error
      );

      alert(
        formatApiError(error)
      );
    } finally {
      setHelpfulLoadingId(null);
    }
  };

  return {
    reviews,
    reviewSummary,
    reviewsLoading,
    reviewsError,

    eligibility,

    reviewForm,
    setReviewForm,

    reviewImagePreview,
    setReviewImagePreview,

    submittingReview,

    reviewSubmitError,
    reviewSubmitMessage,

    helpfulLoadingId,

    handleReviewImageChange,
    handleReviewSubmit,
    handleHelpful,

    loadReviews,
    loadEligibility,
  };
}

export default useProductReviews;