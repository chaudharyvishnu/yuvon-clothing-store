function ProductInfoSection({
  product,
  brandName,
  selectedVariant,
  displayedRating,
  displayedReviewTotal,
  isAvailable,
  hasVariants,
  currentStock,
  generalStock,
  discountPercentage,
  StarRating,
}) {
  return (
    <>
      <p className="font-semibold text-blue-600">
        {brandName}
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
        {product.name}
      </h1>

      <p className="mt-3 text-sm text-gray-500">
        SKU:{" "}
        {selectedVariant?.sku ||
          product.sku ||
          "—"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <StarRating
            value={Math.round(displayedRating)}
            readOnly
            size="text-xl"
          />

          <span className="font-semibold text-gray-800">
            {displayedRating.toFixed(1)}
          </span>
        </div>

        <span className="text-gray-300">|</span>

        <a
          href="#customer-reviews"
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          {displayedReviewTotal} reviews
        </a>

        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isAvailable
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {isAvailable
            ? hasVariants
              ? `${currentStock} in stock`
              : generalStock > 0
              ? `${generalStock} in stock`
              : "In stock"
            : "Out of stock"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span className="text-3xl font-bold text-blue-600">
          ₹{product.price}
        </span>

        {product.old_price && (
          <span className="text-xl text-gray-400 line-through">
            ₹{product.old_price}
          </span>
        )}

        {discountPercentage > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
            {discountPercentage}% OFF
          </span>
        )}
      </div>
    </>
  );
}

export default ProductInfoSection;