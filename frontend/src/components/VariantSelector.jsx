function VariantSelector({
  availableColors = [],
  selectedColor = "",
  onColorSelect,

  availableSizes = [],
  selectedSize = "",
  onSizeSelect,

  hasVariants = false,
  colorVariants = [],

  selectedVariant = null,
  currentStock = 0,
}) {
  return (
    <>
      {/* Color Selection */}
      {availableColors.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold">
            Color:{" "}
            <span className="font-medium text-gray-600">
              {selectedColor || "Select color"}
            </span>
          </h3>

          <div className="mt-3 flex flex-wrap gap-3">
            {availableColors.map((color) => {
              const isSelected =
                selectedColor === color.name;

              const isDisabled =
                color.hasStock === false;

              return (
                <button
                  key={color.name}
                  type="button"
                  disabled={isDisabled}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!isDisabled && onColorSelect) {
                      onColorSelect(color);
                    }
                  }}
                  className={`relative h-11 w-11 rounded-full border-4 shadow-sm transition ${
                    isSelected
                      ? "scale-110 border-blue-600"
                      : "border-white hover:border-gray-300"
                  } ${
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : ""
                  }`}
                  style={{
                    backgroundColor:
                      color.code || "#111827",
                  }}
                >
                  {isDisabled && (
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-red-600">
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {availableSizes.length > 0 && (
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

              const isDisabled =
                hasVariants &&
                (!variant ||
                  variant.is_active === false ||
                  Number(variant.stock) <= 0);

              const isSelected =
                selectedSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!isDisabled && onSizeSelect) {
                      onSizeSelect(size);
                    }
                  }}
                  className={`min-w-14 rounded-xl border px-4 py-3 font-semibold transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-blue-600"
                  } ${
                    isDisabled
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
      )}

      {/* Selected Variant Information */}
      {selectedVariant && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4">
          <p className="font-semibold">
            Selected Variant
          </p>

          <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
            <p>
              <strong>Color:</strong>{" "}
              {selectedVariant.color || "—"}
            </p>

            <p>
              <strong>Size:</strong>{" "}
              {selectedVariant.size || "—"}
            </p>

            <p>
              <strong>SKU:</strong>{" "}
              {selectedVariant.sku || "—"}
            </p>

            <p>
              <strong>Stock:</strong>{" "}
              {currentStock}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default VariantSelector;