function LoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
        >
          <div className="h-80 animate-pulse bg-gray-200" />

          <div className="space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />

            <div className="h-5 w-full animate-pulse rounded bg-gray-200" />

            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;