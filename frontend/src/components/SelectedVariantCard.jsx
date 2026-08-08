function SelectedVariantCard({
  selectedVariant,
  currentStock,
}) {
  if (!selectedVariant) {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="font-semibold text-lg">
        Selected Variant
      </p>

      <div className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
        <div>
          <strong>Color:</strong>{" "}
          {selectedVariant.color || "—"}
        </div>

        <div>
          <strong>Size:</strong>{" "}
          {selectedVariant.size || "—"}
        </div>

        <div>
          <strong>SKU:</strong>{" "}
          {selectedVariant.sku || "—"}
        </div>

        <div>
          <strong>Stock:</strong>{" "}
          {currentStock}
        </div>
      </div>
    </div>
  );
}

export default SelectedVariantCard;