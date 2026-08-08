function ShopFilters({
  brands,
  selectedBrand,
  setSelectedBrand,
  selectedPrice,
  setSelectedPrice,
  selectedSize,
  setSelectedSize,
  clearFilters,
}) {
  const prices = [
    {
      value: "under-999",
      label: "Under ₹999",
    },
    {
      value: "1000-1999",
      label: "₹1000 - ₹1999",
    },
    {
      value: "2000-4999",
      label: "₹2000 - ₹4999",
    },
    {
      value: "5000-plus",
      label: "₹5000 and above",
    },
  ];

  const sizes = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];

  return (
    <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Filters
        </h2>

        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Clear all
        </button>
      </div>

      <div className="border-b border-gray-200 pb-5">
        <h3 className="mb-3 font-semibold">
          Price
        </h3>

        <div className="space-y-3 text-sm text-gray-600">
          {prices.map((price) => (
            <label
              key={price.value}
              className="flex cursor-pointer items-center gap-3"
            >
              <input
                type="radio"
                name="price"
                value={price.value}
                checked={
                  selectedPrice ===
                  price.value
                }
                onChange={(e) =>
                  setSelectedPrice(
                    e.target.value
                  )
                }
              />

              <span>{price.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-b border-gray-200 py-5">
        <h3 className="mb-3 font-semibold">
          Brand
        </h3>

        {brands.length === 0 ? (
          <p className="text-sm text-gray-400">
            No brands available
          </p>
        ) : (
          <div className="space-y-3">
            {brands.map((brand) => (
              <label
                key={brand.slug}
                className="flex cursor-pointer items-center gap-3 text-sm text-gray-600"
              >
                <input
                  type="radio"
                  name="brand"
                  value={brand.slug}
                  checked={
                    selectedBrand ===
                    brand.slug
                  }
                  onChange={(e) =>
                    setSelectedBrand(
                      e.target.value
                    )
                  }
                />

                <span>{brand.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="py-5">
        <h3 className="mb-3 font-semibold">
          Size
        </h3>

        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                setSelectedSize((current) =>
                  current === size
                    ? ""
                    : size
                )
              }
              className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                selectedSize === size
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-600"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default ShopFilters;