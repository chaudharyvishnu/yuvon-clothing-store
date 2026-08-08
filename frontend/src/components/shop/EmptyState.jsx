function EmptyState({
  clearFilters,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
      <h2 className="text-2xl font-bold">
        No products found
      </h2>

      <p className="mt-2 text-gray-500">
        Search ya filters change karke
        dobara try karein.
      </p>

      <button
        type="button"
        onClick={clearFilters}
        className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
      >
        Clear Filters
      </button>
    </div>
  );
}

export default EmptyState;