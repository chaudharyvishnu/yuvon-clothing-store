function ErrorState({
  error,
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-white p-10 text-center">
      <h2 className="text-2xl font-bold text-red-600">
        Products load nahi ho paaye
      </h2>

      <p className="mt-2 text-gray-500">
        {error}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-black px-6 py-3 text-white"
      >
        Try Again
      </button>
    </div>
  );
}

export default ErrorState;