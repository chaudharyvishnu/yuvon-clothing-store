function VariantSelector({
  children,
  title = "Choose Your Variant",
  description = "Select the available color and size combination.",
}) {
  if (!children) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div className="mt-2">
          {children}
        </div>
      </div>
    </section>
  );
}

export default VariantSelector;