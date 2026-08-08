function Pagination({
  page,
  hasNextPage,
  hasPreviousPage,
  setPage,
}) {
  const handlePrevious = () => {
    setPage((current) =>
      Math.max(1, current - 1)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleNext = () => {
    setPage((current) => current + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={!hasPreviousPage || page <= 1}
        onClick={handlePrevious}
        className="rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:border-blue-600 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      <span className="font-semibold text-gray-700">
        Page {page}
      </span>

      <button
        type="button"
        disabled={!hasNextPage}
        onClick={handleNext}
        className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;