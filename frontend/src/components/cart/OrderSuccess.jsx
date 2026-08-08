function OrderSuccess({
  orderSuccess,
  subtotal,
  onContinueShopping,
}) {
  if (!orderSuccess) {
    return null;
  }

  const orderNumber =
    orderSuccess.order_number ||
    orderSuccess.id ||
    "-";

  const total =
    Number(
      orderSuccess.total_amount ||
        orderSuccess.total ||
        subtotal ||
        0
    ).toFixed(2);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
          ✓
        </div>

        <h2 className="mt-5 text-2xl font-bold text-green-700">
          Order Placed Successfully
        </h2>

        <p className="mt-3 text-gray-500">
          Your order number is
        </p>

        <p className="mt-2 break-all text-xl font-bold">
          {orderNumber}
        </p>

        <p className="mt-4 text-gray-600">
          Total: ₹{total}
        </p>

        <button
          type="button"
          onClick={onContinueShopping}
          className="mt-7 w-full rounded-full bg-black py-4 font-semibold text-white transition hover:bg-gray-800"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default OrderSuccess;