function ColorSelector({
  availableColors = [],
  selectedColor = "",
  handleColorSelect,
}) {
  if (
    !Array.isArray(availableColors) ||
    availableColors.length === 0
  ) {
    return null;
  }

  const normalizeColorName = (
    value
  ) =>
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  return (
    <div className="mt-8">
      <h3 className="font-bold">
        Color:{" "}
        <span className="font-medium text-gray-600">
          {selectedColor || "Select color"}
        </span>
      </h3>

      <div className="mt-3 flex flex-wrap gap-3">
        {availableColors.map(
          (
            color,
            index
          ) => {
            const colorName =
              typeof color ===
              "string"
                ? color
                : (
                    color?.name ||
                    ""
                  );

            const colorCode =
              typeof color ===
              "string"
                ? "#111827"
                : (
                    color?.code ||
                    color?.color_code ||
                    "#111827"
                  );

            const hasStock =
              typeof color ===
              "string"
                ? true
                : (
                    color?.hasStock !==
                      false &&
                    color?.has_stock !==
                      false
                  );

            const isSelected =
              normalizeColorName(
                selectedColor
              ) ===
              normalizeColorName(
                colorName
              );

            const isDisabled =
              !hasStock;

            const normalizedColor = {
              ...(typeof color ===
              "object"
                ? color
                : {}),

              name:
                colorName,

              code:
                colorCode,

              hasStock:
                hasStock,
            };

            return (
              <div
                key={
                  colorName ||
                  `color-${index}`
                }
                className="flex flex-col items-center gap-2"
              >
                <button
                  type="button"
                  disabled={
                    isDisabled
                  }
                  title={
                    isDisabled
                      ? `${colorName} - Out of stock`
                      : `Select ${colorName}`
                  }
                  aria-label={
                    isDisabled
                      ? `${colorName} color is out of stock`
                      : `Select ${colorName} color`
                  }
                  aria-pressed={
                    isSelected
                  }
                  onClick={() => {
                    if (
                      isDisabled
                    ) {
                      return;
                    }

                    handleColorSelect?.(
                      normalizedColor
                    );
                  }}
                  className={[
                    "relative",
                    "h-12",
                    "w-12",
                    "rounded-full",
                    "border-4",
                    "shadow-sm",
                    "transition",
                    "duration-200",

                    isSelected
                      ? "scale-110 border-blue-600 ring-2 ring-blue-200"
                      : "border-white hover:scale-105 hover:border-gray-300",

                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer",
                  ].join(
                    " "
                  )}
                  style={{
                    backgroundColor:
                      colorCode,
                  }}
                >
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white drop-shadow">
                      ✓
                    </span>
                  )}

                  {isDisabled && (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-red-600">
                      ×
                    </span>
                  )}
                </button>

                <span
                  className={[
                    "max-w-[80px]",
                    "text-center",
                    "text-xs",

                    isSelected
                      ? "font-semibold text-blue-600"
                      : "text-gray-600",

                    isDisabled
                      ? "line-through opacity-50"
                      : "",
                  ].join(
                    " "
                  )}
                >
                  {colorName}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

export default ColorSelector;