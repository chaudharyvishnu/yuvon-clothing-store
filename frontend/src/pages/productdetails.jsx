import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

import VariantSelector from "../components/VariantSelector";
import ProductImageGallery from "../components/ProductImageGallery";
import ProductInfoSection from "../components/ProductInfoSection";
import ColorSelector from "../components/ColorSelector";
import SizeSelector from "../components/SizeSelector";
import QuantitySelector from "../components/QuantitySelector";
import ProductActions from "../components/ProductActions";
import DeliveryCheck from "../components/DeliveryCheck";
import SelectedVariantCard from "../components/SelectedVariantCard";
import ProductDescription from "../components/ProductDescription";
import ProductInformation from "../components/ProductInformation";
import ProductReviewSummary from "../components/ProductReviewSummary";
import ReviewForm from "../components/ReviewForm";
import ReviewList from "../components/ReviewList";

import {
  createReview,
  fetchProductById,
  fetchProductReviews,
  fetchProductReviewSummary,
  fetchReviewEligibility,
  toggleReviewHelpful,
} from "../services/api";
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

const FALLBACK_IMAGE =
  "https://placehold.co/600x800?text=No+Image";

function getImageUrl(image) {
  if (!image) {
    return FALLBACK_IMAGE;
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
    image.startsWith("/") ? image : `/${image}`
  }`;
}

const EMPTY_REVIEW_FORM = {
  rating: 5,
  title: "",
  comment: "",
  image: null,
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function formatApiError(error) {
  if (!error?.data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    return Array.isArray(error.data.detail)
      ? error.data.detail.join(" ")
      : String(error.data.detail);
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(" ")}`;
      }

      if (messages && typeof messages === "object") {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${String(messages)}`;
    })
    .join(" ");
}

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "text-2xl",
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={`${size} ${
            star <= Number(value)
              ? "text-yellow-400"
              : "text-gray-300"
          } ${readOnly ? "cursor-default" : "transition hover:scale-110"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { isAuthenticated, openLogin } = useAuth();

  const {
    toggleWishlist,
    isWishlisted,
    loading: wishlistLoading,
  } = useWishlist();

  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [pincode, setPincode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistUpdating, setWishlistUpdating] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    average_rating: 0,
    total_reviews: 0,
    rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);
  const [reviewImagePreview, setReviewImagePreview] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("");
  const [helpfulLoadingId, setHelpfulLoadingId] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!id) return;

    setReviewsLoading(true);
    setReviewsError("");

    try {
      const [reviewsResponse, summaryResponse] = await Promise.all([
        fetchProductReviews(id),
        fetchProductReviewSummary(id),
      ]);

      setReviews(
        Array.isArray(reviewsResponse)
          ? reviewsResponse
          : reviewsResponse.results || []
      );

      setReviewSummary({
        average_rating: Number(summaryResponse.average_rating || 0),
        total_reviews: Number(summaryResponse.total_reviews || 0),
        rating_breakdown:
          summaryResponse.rating_breakdown ||
          { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
    } catch (reviewError) {
      setReviewsError(formatApiError(reviewError));
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadEligibility = useCallback(async () => {
    if (!id || !isAuthenticated) {
      setEligibility(null);
      return;
    }

    try {
      setEligibility(await fetchReviewEligibility(id));
    } catch (eligibilityError) {
      if (eligibilityError.status === 401) {
        setEligibility(null);
        return;
      }

      setEligibility({
        can_review: false,
        reason: formatApiError(eligibilityError),
      });
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchProductById(id);
        setProduct(response);

        setActiveImage(
          response.main_image_url ||
            response.main_image ||
            response.images?.[0]?.image_url ||
            response.images?.[0]?.image ||
            ""
        );

        const variants = (response.variants || []).filter(
          (variant) => variant.is_active !== false
        );

        const firstVariant =
          variants.find((variant) => Number(variant.stock) > 0) ||
          variants[0];

        if (firstVariant) {
          setSelectedColor(firstVariant.color || "");
          setSelectedSize(firstVariant.size || "");
        } else {
          const firstColor = response.available_colors?.[0];

          setSelectedColor(
            typeof firstColor === "string"
              ? firstColor
              : firstColor?.name || ""
          );

          setSelectedSize(response.available_sizes?.[0] || "");
        }

        setQuantity(1);
      } catch (fetchError) {
        setError(
          fetchError.message || "Product details load nahi ho paayi."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    loadReviews();
    loadEligibility();
  }, [id, loadReviews, loadEligibility]);

  useEffect(() => {
    return () => {
      if (reviewImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(reviewImagePreview);
      }
    };
  }, [reviewImagePreview]);

  const activeVariants = useMemo(
    () =>
      (product?.variants || []).filter(
        (variant) => variant.is_active !== false
      ),
    [product]
  );

  const hasVariants = activeVariants.length > 0;

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const images = [];
    const mainImage = product.main_image_url || product.main_image;

    if (mainImage) {
      images.push({
        id: "main",
        image: mainImage,
        alt: product.name,
      });
    }

    (product.images || []).forEach((item, index) => {
      const image = item.image_url || item.image;

      if (image && !images.some((entry) => entry.image === image)) {
        images.push({
          id: item.id || `gallery-${index}`,
          image,
          alt: item.alt_text || item.alt || product.name,
        });
      }
    });

    return images;
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product) return [];

    const map = new Map();

    activeVariants.forEach((variant) => {
      const name = variant.color?.trim();
      if (!name) return;

      const key = name.toLowerCase();
      const existing = map.get(key);

      map.set(key, {
        name,
        code: variant.color_code || existing?.code || "#111827",
        hasStock:
          Boolean(existing?.hasStock) || Number(variant.stock) > 0,
      });
    });

    if (map.size) return [...map.values()];

    return (product.available_colors || [])
      .map((color) =>
        typeof color === "string"
          ? { name: color, code: "#111827", hasStock: true }
          : {
              name: color.name,
              code: color.code || color.color_code || "#111827",
              hasStock: color.has_stock !== false,
            }
      )
      .filter((color) => color.name);
  }, [product, activeVariants]);

  const colorVariants = useMemo(() => {
    if (!hasVariants) return [];

    return selectedColor
      ? activeVariants.filter(
          (variant) => variant.color === selectedColor
        )
      : activeVariants;
  }, [hasVariants, activeVariants, selectedColor]);

  const availableSizes = useMemo(() => {
    if (!product) return [];

    const values = hasVariants
      ? colorVariants.map((variant) => variant.size)
      : product.available_sizes || [];

    return [...new Set(values.filter(Boolean))];
  }, [product, hasVariants, colorVariants]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    return (
      activeVariants.find(
        (variant) =>
          variant.color === selectedColor &&
          variant.size === selectedSize
      ) || null
    );
  }, [hasVariants, activeVariants, selectedColor, selectedSize]);

  useEffect(() => {
    if (!hasVariants || !selectedColor) return;

    const currentAvailable = colorVariants.some(
      (variant) =>
        variant.size === selectedSize &&
        Number(variant.stock) > 0
    );

    if (!currentAvailable) {
      const firstAvailable = colorVariants.find(
        (variant) => Number(variant.stock) > 0
      );

      setSelectedSize(firstAvailable?.size || "");
      setQuantity(1);
    }
  }, [hasVariants, selectedColor, selectedSize, colorVariants]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant?.id]);

  const generalStock = Number(
    product?.total_stock ?? product?.stock ?? 0
  );

  const currentStock = hasVariants
    ? Number(selectedVariant?.stock || 0)
    : generalStock;

  const isAvailable = hasVariants
    ? Boolean(
        selectedVariant &&
          selectedVariant.is_active !== false &&
          currentStock > 0
      )
    : product?.is_in_stock !== false &&
      (generalStock > 0 || product?.is_in_stock === true);

  const maximumQuantity = hasVariants
    ? Math.max(currentStock, 1)
    : generalStock > 0
      ? generalStock
      : 10;

  const discountPercentage = useMemo(() => {
    if (Number(product?.discount_percentage) > 0) {
      return Number(product.discount_percentage);
    }

    const price = Number(product?.price);
    const oldPrice = Number(product?.old_price);

    return price && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;
  }, [product]);

  const brandName =
    product?.brand_name ||
    product?.brand_detail?.name ||
    product?.brand_details?.name ||
    product?.brand?.name ||
    "Yuvon Design Hub";

  const displayedRating = Number(
    reviewSummary.average_rating || product?.rating || 0
  );

  const displayedReviewTotal = Number(
    reviewSummary.total_reviews ?? product?.total_reviews ?? 0
  );

  const normalizedProduct = useMemo(() => {
    if (!product) return null;

    const image =
      activeImage ||
      product.main_image_url ||
      product.main_image ||
      "";

    return {
      ...product,
      id: product.id,
      productId: product.id,
      brand: brandName,
      brand_name: brandName,
      image,
      main_image: image,
      price: Number(product.price || 0),
      oldPrice: product.old_price
        ? Number(product.old_price)
        : null,
      old_price: product.old_price
        ? Number(product.old_price)
        : null,
      quantity,
      size: selectedSize || null,
      color: selectedColor || null,
      variantId: selectedVariant?.id || null,
      variant_id: selectedVariant?.id || null,
      variantSku: selectedVariant?.sku || null,
      variant_sku: selectedVariant?.sku || null,
      sku: selectedVariant?.sku || product.sku,
      stock: currentStock,
    };
  }, [
    product,
    activeImage,
    brandName,
    quantity,
    selectedSize,
    selectedColor,
    selectedVariant,
    currentStock,
  ]);

  const validateSelection = () => {
    if (hasVariants && !selectedColor) {
      alert("Please select a color.");
      return false;
    }

    if (hasVariants && !selectedSize) {
      alert("Please select a size.");
      return false;
    }

    if (hasVariants && !selectedVariant) {
      alert("Selected color and size combination is unavailable.");
      return false;
    }

    if (!isAvailable) {
      alert("Selected product variant is out of stock.");
      return false;
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!normalizedProduct || !validateSelection()) {
      return false;
    }

    const result = addToCart(normalizedProduct);

    if (result?.success === false) {
      alert(
        result.reason ||
          "Product could not be added to cart."
      );
      return false;
    }

    return true;
  };

  const handleBuyNow = () => {
    const added = handleAddToCart();

    if (added) {
      navigate("/checkout");
    }
  };

  const handleColorSelect = (color) => {
    if (!color.hasStock) {
      return;
    }

    setSelectedColor(color.name);
    setQuantity(1);

    const firstAvailableVariant =
      activeVariants.find(
        (variant) =>
          variant.color === color.name &&
          Number(variant.stock) > 0
      );

    setSelectedSize(firstAvailableVariant?.size || "");
  };

  const handleDeliveryCheck = () => {
    const cleanedPincode = pincode.trim();

    if (!/^\d{6}$/.test(cleanedPincode)) {
      setDeliveryMessage(
        "Please enter a valid 6-digit pincode."
      );
      return;
    }

    setDeliveryMessage(
      "Delivery is available. Expected delivery in 3–6 business days."
    );
  };

  const handleReviewImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setReviewSubmitError("");

    if (
      file &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setReviewSubmitError(
        "Only JPG, PNG, and WEBP images are allowed."
      );
      event.target.value = "";
      return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
      setReviewSubmitError(
        "Review image must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    if (reviewImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(reviewImagePreview);
    }

    setReviewForm((current) => ({
      ...current,
      image: file,
    }));

    setReviewImagePreview(
      file ? URL.createObjectURL(file) : ""
    );
  };

  const handleWishlist = async () => {
    if (!normalizedProduct) return;

    if (!isAuthenticated) {
      openLogin();
      return;
    }

    try {
      setWishlistUpdating(true);
      await toggleWishlist(normalizedProduct);
    } catch (wishlistError) {
      alert(formatApiError(wishlistError));
    } finally {
      setWishlistUpdating(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewSubmitError("");
    setReviewSubmitMessage("");

    if (!isAuthenticated) {
      openLogin();
      return;
    }

    if (reviewForm.comment.trim().length < 10) {
      setReviewSubmitError(
        "Review comment must be at least 10 characters."
      );
      return;
    }

    try {
      setSubmittingReview(true);

      const response = await createReview({
        productId: product.id,
        orderItemId: eligibility?.order_item_id || null,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        image: reviewForm.image,
      });

      setReviewSubmitMessage(
        response.message ||
          "Review submitted successfully and is waiting for admin approval."
      );

      setReviewForm(EMPTY_REVIEW_FORM);
      setReviewImagePreview("");
      setEligibility({
        can_review: false,
        reason: "Your review is waiting for admin approval.",
        existing_review: response.review || null,
      });

      await loadReviews();
    } catch (submitError) {
      setReviewSubmitError(formatApiError(submitError));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }

    try {
      setHelpfulLoadingId(reviewId);
      const response = await toggleReviewHelpful(reviewId);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                helpful_count: response.helpful_count,
                helpful_votes: response.helpful_count,
                is_helpful_by_user: response.is_helpful,
              }
            : review
        )
      );
    } catch (helpfulError) {
      alert(formatApiError(helpfulError));
    } finally {
      setHelpfulLoadingId(null);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="h-[600px] animate-pulse rounded-3xl bg-gray-200" />
            <div className="space-y-5">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-12 animate-pulse rounded bg-gray-200" />
              <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-56 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold">Product not found</h1>
          <p className="mt-3 text-gray-500">
            {error ||
              "This product may have been removed or disabled."}
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link
          to="/shop"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Shop
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <ProductImageGallery
            product={product}
            activeImage={activeImage}
            setActiveImage={setActiveImage}
            galleryImages={galleryImages}
          />

          <div>
            <ProductInfoSection
              product={product}
              brandName={brandName}
              selectedVariant={selectedVariant}
              displayedRating={displayedRating}
              displayedReviewTotal={displayedReviewTotal}
              isAvailable={isAvailable}
              hasVariants={hasVariants}
              currentStock={currentStock}
              generalStock={generalStock}
              discountPercentage={discountPercentage}
              StarRating={StarRating}
            />

            <VariantSelector>
              <ColorSelector
                availableColors={availableColors}
                selectedColor={selectedColor}
                handleColorSelect={handleColorSelect}
              />

              <SizeSelector
                availableSizes={availableSizes}
                selectedSize={selectedSize}
                hasVariants={hasVariants}
                colorVariants={colorVariants}
                setSelectedSize={setSelectedSize}
                setQuantity={setQuantity}
              />
            </VariantSelector>

            <SelectedVariantCard
              selectedVariant={selectedVariant}
              currentStock={currentStock}
            />

            <QuantitySelector
              quantity={quantity}
              setQuantity={setQuantity}
              isAvailable={isAvailable}
              maximumQuantity={maximumQuantity}
            />

            <ProductActions
              isAvailable={isAvailable}
              handleAddToCart={handleAddToCart}
              handleBuyNow={handleBuyNow}
              handleWishlist={handleWishlist}
              wishlistUpdating={wishlistUpdating}
              wishlistLoading={wishlistLoading}
              isWishlisted={isWishlisted(product.id)}
            />

            <DeliveryCheck
              pincode={pincode}
              setPincode={setPincode}
              deliveryMessage={deliveryMessage}
              setDeliveryMessage={setDeliveryMessage}
              handleDeliveryCheck={handleDeliveryCheck}
            />

            <div className="mt-8 space-y-5">
              <ProductDescription
                description={product.description}
              />

              <ProductInformation
                departmentName={product.department_name}
                categoryName={product.category_name}
                subcategoryName={product.subcategory_name}
                brandName={brandName}
              />
            </div>
          </div>
        </div>

        <div
          id="customer-reviews"
          className="mt-16 scroll-mt-32"
        >
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Customer Feedback
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Ratings & Reviews
              </h2>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <ProductReviewSummary
                displayedRating={displayedRating}
                displayedReviewTotal={displayedReviewTotal}
                reviewSummary={reviewSummary}
                StarRating={StarRating}
              />

              <div className="lg:col-span-2">
                <ReviewForm
                  isLoggedIn={isAuthenticated}
                  eligibility={eligibility}
                  reviewForm={reviewForm}
                  setReviewForm={setReviewForm}
                  reviewImagePreview={reviewImagePreview}
                  setReviewImagePreview={setReviewImagePreview}
                  reviewSubmitError={reviewSubmitError}
                  reviewSubmitMessage={reviewSubmitMessage}
                  submittingReview={submittingReview}
                  handleReviewImageChange={handleReviewImageChange}
                  handleReviewSubmit={handleReviewSubmit}
                  openLogin={openLogin}
                  StarRating={StarRating}
                />
              </div>
            </div>

            <ReviewList
              reviews={reviews}
              reviewsLoading={reviewsLoading}
              reviewsError={reviewsError}
              displayedReviewTotal={displayedReviewTotal}
              helpfulLoadingId={helpfulLoadingId}
              handleHelpful={handleHelpful}
              StarRating={StarRating}
              formatDate={formatDate}
              getImageUrl={getImageUrl}
              fallbackImage={FALLBACK_IMAGE}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductDetails;
