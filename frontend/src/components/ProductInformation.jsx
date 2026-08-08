function ProductInformation({
  departmentName,
  categoryName,
  subcategoryName,
  brandName,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">
        Product Information
      </h3>

      <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
        <p>
          <strong>Department:</strong>{" "}
          {departmentName || "—"}
        </p>

        <p>
          <strong>Category:</strong>{" "}
          {categoryName || "—"}
        </p>

        <p>
          <strong>Subcategory:</strong>{" "}
          {subcategoryName || "—"}
        </p>

        <p>
          <strong>Brand:</strong>{" "}
          {brandName || "—"}
        </p>
      </div>
    </div>
  );
}

export default ProductInformation;