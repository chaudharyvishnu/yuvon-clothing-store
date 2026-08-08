function ColorSelector({
  availableColors,
  selectedColor,
  handleColorSelect,
}) {
  if (!availableColors?.length) {
    return null;
  }

  return (
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
              onClick={() =>
                handleColorSelect(color)
              }
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
                <span className="absolute inset-0 flex items-center justify-center text-lg text-red-600">
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorSelector;