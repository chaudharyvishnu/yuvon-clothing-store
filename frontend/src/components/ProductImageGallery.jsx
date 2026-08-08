import {
  FALLBACK_IMAGE,
  getImageUrl,
} from "../utils/productHelpers";

function ProductImageGallery({
  product,
  activeImage,
  setActiveImage,
  galleryImages = [],
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
        {activeImage ? (
          <img
            src={getImageUrl(activeImage)}
            alt={product?.name || "Product"}
            loading="eager"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src =
                FALLBACK_IMAGE;
            }}
            className="h-[500px] w-full object-cover sm:h-[600px]"
          />
        ) : (
          <div className="flex h-[500px] items-center justify-center bg-gray-100 text-gray-400 sm:h-[600px]">
            No product image
          </div>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {galleryImages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveImage(item.image)
              }
              className={`overflow-hidden rounded-xl border-2 bg-white ${
                activeImage === item.image
                  ? "border-blue-600"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <img
                src={getImageUrl(item.image)}
                alt={
                  item.alt ||
                  product?.name ||
                  "Product image"
                }
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror =
                    null;
                  event.currentTarget.src =
                    FALLBACK_IMAGE;
                }}
                className="h-24 w-full object-cover sm:h-28"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductImageGallery;
