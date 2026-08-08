function ShopHeader({
  pageTitle,
  pageDescription,
  ordering,
  setOrdering,
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Yuvon Collection
        </p>

        <h1 className="mt-2 text-3xl font-bold capitalize text-gray-950 sm:text-4xl">
          {pageTitle}
        </h1>

        <p className="mt-2 text-gray-500">
          {pageDescription}
        </p>
      </div>

      <select
        value={ordering}
        onChange={(event) =>
          setOrdering(event.target.value)
        }
        aria-label="Sort products"
        className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="newest">
          Sort by Latest
        </option>

        <option value="price">
          Price: Low to High
        </option>

        <option value="-price">
          Price: High to Low
        </option>

        <option value="-rating">
          Top Rated
        </option>

        <option value="name">
          Name: A to Z
        </option>

        <option value="-name">
          Name: Z to A
        </option>
      </select>
    </div>
  );
}

export default ShopHeader;