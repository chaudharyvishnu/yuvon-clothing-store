const BACKEND_URL = "http://127.0.0.1:8000";

const FALLBACK_IMAGE =
  "https://placehold.co/300x400?text=No+Image";

function getCartImage(item) {
  const image =
    item?.image ||
    item?.main_image_url ||
    item?.main_image ||
    "";

  if (!image) {
    return FALLBACK_IMAGE;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${
    image.startsWith("/") ? image : `/${image}`
  }`;
}

function CartItem({
  item,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
}) {
  const quantity = Number(item?.quantity || 1);

  const stock =
    item?.stock === null ||
    item?.stock === undefined
      ? null
      : Number(item.stock);

  const reachedStockLimit =
    stock !== null &&
    stock > 0 &&
    quantity >= stock;

  const price = Number(item?.price || 0);

  const oldPrice = Number(
    item?.oldPrice ||
      item?.old_price ||
      0
  );

  const itemTotal = price * quantity;

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <article className="flex gap-4 border-b p-5">
      <img
        src={getCartImage(item)}
        alt={item?.name || "Cart product"}
        onError={handleImageError}
        className="h-28 w-24 flex-shrink-0 rounded object-cover"
      />

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold">
          {item?.name || "Product"}
        </h3>

        {item?.brand && (
          <p className="mt-1 text-sm text-gray-500">
            {item.brand}
          </p>
        )}

        <div className="mt-2 space-y-1">
          {item?.size && (
            <p className="text-sm text-orange-500">
              Size: {item.size}
            </p>
          )}

          {item?.color && (
            <p className="text-sm text-gray-500">
              Color: {item.color}
            </p>
          )}

          {(item?.variantSku ||
            item?.variant_sku) && (
            <p className="text-xs text-gray-400">
              SKU:{" "}
              {item.variantSku ||
                item.variant_sku}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-bold text-blue-600">
            ₹{price.toFixed(2)}
          </span>

          {oldPrice > price && (
            <span className="text-sm text-gray-400 line-through">
              ₹{oldPrice.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() =>
              decreaseQuantity(item.itemKey)
            }
            className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Decrease quantity of ${
              item?.name || "product"
            }`}
          >
            −
          </button>

          <span className="min-w-8 text-center font-semibold">
            {quantity}
          </span>

          <button
            type="button"
            disabled={reachedStockLimit}
            onClick={() =>
              increaseQuantity(item.itemKey)
            }
            className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Increase quantity of ${
              item?.name || "product"
            }`}
          >
            +
          </button>

          <button
            type="button"
            onClick={() =>
              removeFromCart(item.itemKey)
            }
            className="ml-2 text-sm font-semibold text-red-500 hover:text-red-700"
            aria-label={`Remove ${
              item?.name || "product"
            } from cart`}
          >
            Remove
          </button>
        </div>

        {stock !== null && (
          <p
            className={`mt-2 text-xs ${
              stock > 0
                ? "text-gray-500"
                : "font-semibold text-red-500"
            }`}
          >
            {stock > 0
              ? `${stock} available`
              : "Out of stock"}
          </p>
        )}

        {reachedStockLimit && (
          <p className="mt-1 text-xs font-medium text-orange-600">
            Maximum available quantity reached.
          </p>
        )}

        <p className="mt-2 text-sm font-semibold">
          Item total: ₹{itemTotal.toFixed(2)}
        </p>
      </div>
    </article>
  );
}

export default CartItem;