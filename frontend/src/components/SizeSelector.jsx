function SizeSelector({
  availableSizes,
  selectedSize,
  hasVariants,
  colorVariants,
  setSelectedSize,
  setQuantity,
}) {
  if (!availableSizes?.length) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="font-bold">
        Select Size
      </h3>

      <div className="mt-3 flex flex-wrap gap-3">
        {availableSizes.map((size) => {
          const variant = hasVariants
            ? colorVariants.find(
                (item) => item.size === size
              )
            : null;

          const disabled =
            hasVariants &&
            (!variant ||
              variant.is_active === false ||
              Number(variant.stock) <= 0);

          return (
            <button
              key={size}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedSize(size);
                setQuantity(1);
              }}
              className={`min-w-14 rounded-xl border px-4 py-3 font-semibold transition ${
                selectedSize === size
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:border-blue-600"
              } ${
                disabled
                  ? "cursor-not-allowed opacity-40 line-through"
                  : ""
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SizeSelector;