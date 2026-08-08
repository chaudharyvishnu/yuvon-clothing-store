function CartFooter({
  cartItems,
  totalItems,
  subtotal,
  isAuthenticated,
  onProceedToCheckout,
}) {
  const hasItems = cartItems.length > 0;

  return (
    <div className="border-t bg-white p-5">
      <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
        <span>
          Items ({totalItems})
        </span>

        <span>
          ₹{Number(subtotal || 0).toFixed(2)}
        </span>
      </div>

      <div className="mb-5 flex items-center justify-between text-lg font-bold">
        <span>Subtotal</span>

        <span>
          ₹{Number(subtotal || 0).toFixed(2)}
        </span>
      </div>

      <button
        type="button"
        disabled={!hasItems}
        onClick={onProceedToCheckout}
        className="w-full rounded-lg bg-black py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isAuthenticated
          ? "PROCEED TO CHECKOUT →"
          : "LOGIN TO CHECKOUT →"}
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">
        Taxes and shipping charges will be calculated at checkout.
      </p>
    </div>
  );
}

export default CartFooter;