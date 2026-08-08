function CheckoutFooter({
  sendUpdates,
  setSendUpdates,
  checkoutError,
  placingOrder,
  addressesLoading,
  subtotal,
  handlePlaceOrder,
}) {
  return (
    <div className="sticky bottom-0 border-t bg-white p-4">
      <label className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={sendUpdates}
          onChange={(event) =>
            setSendUpdates(event.target.checked)
          }
          className="h-5 w-5"
        />

        <span>
          Send me order updates and offers
        </span>
      </label>

      {checkoutError && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {checkoutError}
        </p>
      )}

      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={
          placingOrder || addressesLoading
        }
        className="w-full rounded-lg bg-black py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {placingOrder
          ? "Placing Order..."
          : `Place Order ₹${Number(
              subtotal || 0
            ).toFixed(2)} →`}
      </button>

      <p className="mt-4 text-center text-xs">
        By proceeding, I agree to Privacy Policy
        and Terms & Conditions.
      </p>
    </div>
  );
}

export default CheckoutFooter;