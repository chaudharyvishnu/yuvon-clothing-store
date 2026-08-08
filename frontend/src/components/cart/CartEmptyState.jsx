function CartEmptyState({
  onContinueShopping,
  title = "Your cart is empty",
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-6xl">
        🛒
      </div>

      <h2 className="text-2xl font-bold text-gray-900">
        {title}
      </h2>

      <p className="mt-3 max-w-sm text-gray-500">
        Looks like you haven't added any products yet.
        Explore our latest collection and find something
        you'll love.
      </p>

      <button
        type="button"
        onClick={onContinueShopping}
        className="mt-8 rounded-full bg-black px-8 py-3 font-semibold text-white transition hover:bg-gray-800"
      >
        Continue Shopping
      </button>
    </div>
  );
}

export default CartEmptyState;