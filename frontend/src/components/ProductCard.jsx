import PropTypes from "prop-types";

import {
  FALLBACK_IMAGE,
  getProductImage,
  getProductBrand,
  getActiveVariants,
  getProductSizes,
  getProductStock,
  isProductInStock,
  getDiscountPercentage,
} from "../utils/productHelpers";

function ProductCard({
  product,
  onOpen,
  onAddToCart,
  onWishlist,
  wishlisted = false,
  wishlistUpdating = false,
  isAuthenticated = false,
  className = "",
}) {
  const image = getProductImage(product);
  const inStock = isProductInStock(product);
  const stock = getProductStock(product);
  const discount = getDiscountPercentage(product);
  const sizes = getProductSizes(product);
  const hasVariants =
    getActiveVariants(product).length > 0;

  const rawRating = Number(
    product?.rating ??
      product?.average_rating ??
      0
  );

  const rating = Number.isFinite(rawRating)
    ? rawRating
    : 0;

  const rawTotalReviews = Number(
    product?.total_reviews ??
      product?.review_count ??
      0
  );

  const totalReviews = Number.isFinite(rawTotalReviews)
    ? rawTotalReviews
    : 0;

  const rawPrice = Number(product?.price ?? 0);
  const rawOldPrice = Number(product?.old_price ?? 0);

  const price = Number.isFinite(rawPrice)
    ? rawPrice
    : 0;

  const oldPrice = Number.isFinite(rawOldPrice)
    ? rawOldPrice
    : 0;

  const handleOpen = () => {
    onOpen?.();
  };

  const handleViewProduct = (event) => {
    event.stopPropagation();
    onOpen?.();
  };

  const handleWishlist = (event) => {
    event.stopPropagation();
    onWishlist?.(event, product);
  };

  const handleAddToCart = (event) => {
    event.stopPropagation();
    onAddToCart?.(event, product);
  };

  return (
    <article
      onClick={handleOpen}
      className={`group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="relative overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={product?.name || "Product"}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="h-80 w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <button
          type="button"
          disabled={wishlistUpdating}
          onClick={handleWishlist}
          className={`absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border bg-white/95 text-xl shadow-md backdrop-blur transition hover:scale-110 disabled:cursor-wait disabled:opacity-60 ${
            wishlisted
              ? "border-red-500 bg-red-500 text-white"
              : "border-white text-gray-800 hover:text-red-500"
          }`}
          title={
            isAuthenticated
              ? wishlisted
                ? "Remove from wishlist"
                : "Add to wishlist"
              : "Login to add wishlist"
          }
          aria-label={
            wishlisted
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
        >
          {wishlistUpdating
            ? "…"
            : wishlisted
              ? "♥"
              : "♡"}
        </button>

        {discount > 0 && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            {discount}% OFF
          </span>
        )}

        {product?.is_new_arrival && (
          <span className="absolute bottom-4 right-4 z-10 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
            NEW
          </span>
        )}

        {!inStock && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-sm text-gray-500">
          {getProductBrand(product)}
        </p>

        <h3 className="mt-1 min-h-14 line-clamp-2 text-lg font-bold text-gray-900 transition group-hover:text-blue-600">
          {product?.name || "Unnamed Product"}
        </h3>

        <div className="mt-3 flex items-center gap-3">
          <span className="font-bold text-blue-600">
            ₹{price.toLocaleString("en-IN")}
          </span>

          {oldPrice > price && (
            <span className="text-sm text-gray-400 line-through">
              ₹{oldPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-yellow-500">
            ★ {rating.toFixed(1)}
          </p>

          <p className="text-xs text-gray-500">
            {totalReviews} reviews
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span
            className={
              inStock
                ? "font-semibold text-green-600"
                : "font-semibold text-red-600"
            }
          >
            {inStock
              ? stock > 0
                ? `${stock} in stock`
                : "In stock"
              : "Out of stock"}
          </span>

          {hasVariants && (
            <span className="text-gray-500">
              Variants available
            </span>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sizes.slice(0, 4).map((size) => (
              <span
                key={size}
                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
              >
                {size}
              </span>
            ))}

            {sizes.length > 4 && (
              <span className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600">
                +{sizes.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleViewProduct}
            className="rounded-full border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-600"
          >
            View Product
          </button>

          <button
            type="button"
            disabled={!inStock}
            onClick={handleAddToCart}
            className="rounded-full bg-black py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {hasVariants
              ? "Select Options"
              : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    name: PropTypes.string,
    price: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    old_price: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    is_new_arrival: PropTypes.bool,
  }).isRequired,
  onOpen: PropTypes.func,
  onAddToCart: PropTypes.func,
  onWishlist: PropTypes.func,
  wishlisted: PropTypes.bool,
  wishlistUpdating: PropTypes.bool,
  isAuthenticated: PropTypes.bool,
  className: PropTypes.string,
};

export default ProductCard;