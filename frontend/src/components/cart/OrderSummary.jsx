function OrderSummary({
  cartItems,
  subtotal,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-bold">
        Order Summary
      </h3>

      <div className="mt-4 space-y-3">
        {cartItems.map((item) => (
          <div
            key={`summary-${item.itemKey}`}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium">
                {item.name}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Qty : {item.quantity}
              </p>

              {item.size && (
                <p className="text-xs text-gray-500">
                  Size : {item.size}
                </p>
              )}

              {item.color && (
                <p className="text-xs text-gray-500">
                  Color : {item.color}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="font-semibold">
                ₹
                {(
                  Number(item.price || 0) *
                  Number(item.quantity || 0)
                ).toFixed(2)}
              </p>
            </div>
          </div>
        ))}

        <div className="border-t pt-3">
          <div className="mb-2 flex justify-between text-sm">
            <span>Items</span>

            <span>{cartItems.length}</span>
          </div>

          <div className="mb-2 flex justify-between text-sm">
            <span>Shipping</span>

            <span className="text-green-600">
              FREE
            </span>
          </div>

          <div className="flex justify-between text-lg font-bold">
            <span>Subtotal</span>

            <span>
              ₹
              {Number(subtotal || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;