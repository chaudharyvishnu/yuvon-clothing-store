function ProductActions({
  isAvailable,
  handleAddToCart,
  handleBuyNow,
  handleWishlist,
  wishlistUpdating,
  wishlistLoading,
  isWishlisted,
}) {
  return (
    <>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isAvailable}
          className="flex-1 rounded-full bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isAvailable
            ? "Add to Cart"
            : "Out of Stock"}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!isAvailable}
          className="flex-1 rounded-full bg-black py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Buy Now
        </button>
      </div>

      <button
        type="button"
        onClick={handleWishlist}
        disabled={
          wishlistUpdating ||
          wishlistLoading
        }
        className={`mt-4 w-full rounded-full border py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isWishlisted
            ? "border-red-600 bg-red-600 text-white"
            : "border-gray-300 bg-white text-black hover:border-red-500 hover:text-red-600"
        }`}
      >
        {wishlistUpdating
          ? "Updating Wishlist..."
          : isWishlisted
          ? "♥ Wishlisted"
          : "♡ Add to Wishlist"}
      </button>
    </>
  );
}

export default ProductActions;