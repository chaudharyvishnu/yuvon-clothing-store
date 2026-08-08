function QuantitySelector({
  quantity,
  setQuantity,
  isAvailable,
  maximumQuantity,
}) {
  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  };

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(
        maximumQuantity,
        current + 1
      )
    );
  };

  return (
    <div className="mt-8">
      <h3 className="font-bold">
        Quantity
      </h3>

      <div className="mt-3 inline-flex items-center rounded-xl border bg-white">
        <button
          type="button"
          onClick={decreaseQuantity}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
          className="px-5 py-3 text-xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>

        <span className="min-w-12 text-center text-lg font-bold">
          {quantity}
        </span>

        <button
          type="button"
          disabled={
            !isAvailable ||
            quantity >= maximumQuantity
          }
          onClick={increaseQuantity}
          aria-label="Increase quantity"
          className="px-5 py-3 text-xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>

      {isAvailable &&
        maximumQuantity > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            Maximum available quantity:{" "}
            {maximumQuantity}
          </p>
        )}
    </div>
  );
}

export default QuantitySelector;