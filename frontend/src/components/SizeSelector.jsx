function SizeSelector({
  availableSizes = [],
  selectedSize = "",
  hasVariants = false,
  colorVariants = [],
  setSelectedSize,
  setQuantity,
}) {
  // =====================================================
  // Helpers
  // =====================================================

  const normalizeSize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const normalizedAvailableSizes = Array.isArray(
    availableSizes
  )
    ? availableSizes
        .map((size) => {
          if (
            typeof size === "string" ||
            typeof size === "number"
          ) {
            return String(size).trim();
          }

          return String(
            size?.name ??
              size?.size ??
              size?.value ??
              ""
          ).trim();
        })
        .filter(Boolean)
    : [];

  if (!normalizedAvailableSizes.length) {
    return null;
  }

  // =====================================================
  // Variant Finder
  // =====================================================

  const findVariantForSize = (size) => {
    if (
      !hasVariants ||
      !Array.isArray(colorVariants)
    ) {
      return null;
    }

    const normalizedSize =
      normalizeSize(size);

    return (
      colorVariants.find(
        (variant) =>
          normalizeSize(
            variant?.size
          ) === normalizedSize
      ) || null
    );
  };

  // =====================================================
  // Size Click
  // =====================================================

  const handleSizeSelect = (
    size,
    disabled
  ) => {
    if (disabled) {
      return;
    }

    setSelectedSize?.(size);

    /*
     * Whenever the variant changes,
     * quantity should return to 1.
     */
    setQuantity?.(1);
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="mt-8">
      <h3 className="font-bold">
        Select Size:{" "}
        <span className="font-medium text-gray-600">
          {selectedSize ||
            "Choose a size"}
        </span>
      </h3>

      <div className="mt-3 flex flex-wrap gap-3">
        {normalizedAvailableSizes.map(
          (size) => {
            const variant =
              findVariantForSize(
                size
              );

            const stock =
              Number(
                variant?.stock ?? 0
              );

            const isActive =
              variant?.is_active !==
              false;

            /*
             * If product has variants,
             * size must have a matching
             * active + in-stock variant.
             */
            const disabled =
              hasVariants &&
              (
                !variant ||
                !isActive ||
                stock <= 0
              );

            const isSelected =
              normalizeSize(
                selectedSize
              ) ===
              normalizeSize(
                size
              );

            return (
              <button
                key={size}
                type="button"
                disabled={disabled}
                aria-pressed={
                  isSelected
                }
                aria-label={
                  disabled
                    ? `${size} size is out of stock`
                    : `Select size ${size}`
                }
                title={
                  disabled
                    ? `${size} - Out of stock`
                    : hasVariants
                      ? `${size} - ${stock} available`
                      : `Select ${size}`
                }
                onClick={() =>
                  handleSizeSelect(
                    size,
                    disabled
                  )
                }
                className={[
                  "relative",
                  "min-w-14",
                  "rounded-xl",
                  "border",
                  "px-4",
                  "py-3",
                  "font-semibold",
                  "transition",
                  "duration-200",

                  isSelected &&
                  !disabled
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-gray-300 bg-white text-gray-800",

                  !disabled &&
                  !isSelected
                    ? "hover:border-blue-600 hover:text-blue-600"
                    : "",

                  disabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60 line-through"
                    : "cursor-pointer",
                ].join(" ")}
              >
                {size}

                {hasVariants &&
                  variant &&
                  !disabled && (
                    <span className="sr-only">
                      {" "}
                      {stock} available
                    </span>
                  )}
              </button>
            );
          }
        )}
      </div>

      {hasVariants &&
        selectedSize && (
          <div className="mt-3">
            {(() => {
              const selectedVariant =
                findVariantForSize(
                  selectedSize
                );

              if (
                !selectedVariant
              ) {
                return (
                  <p className="text-sm text-red-600">
                    This size is not
                    available for the
                    selected color.
                  </p>
                );
              }

              const stock =
                Number(
                  selectedVariant?.stock ??
                    0
                );

              if (stock <= 0) {
                return (
                  <p className="text-sm text-red-600">
                    Selected size is
                    currently out of
                    stock.
                  </p>
                );
              }

              return (
                <p className="text-sm text-gray-500">
                  {stock}{" "}
                  {stock === 1
                    ? "item"
                    : "items"}{" "}
                  available in size{" "}
                  <strong>
                    {selectedSize}
                  </strong>
                </p>
              );
            })()}
          </div>
        )}
    </div>
  );
}

export default SizeSelector;