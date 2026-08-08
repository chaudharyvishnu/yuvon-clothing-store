function ProductDescription({ description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">
        Description
      </h3>

      <p className="mt-2 whitespace-pre-line leading-7 text-gray-600">
        {description ||
          "Product description is currently unavailable."}
      </p>
    </div>
  );
}

export default ProductDescription;