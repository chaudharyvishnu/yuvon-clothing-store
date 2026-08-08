import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

const BACKEND_URL = "http://127.0.0.1:8000";
const FALLBACK_IMAGE =
  "https://placehold.co/500x650?text=No+Image";

function getProductImage(product) {
  const image =
    product?.main_image_url ||
    product?.main_image ||
    product?.image_url ||
    product?.image ||
    product?.images?.[0]?.image_url ||
    product?.images?.[0]?.image ||
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

function getOptionLabel(option) {
  if (
    typeof option === "string" ||
    typeof option === "number"
  ) {
    return String(option);
  }

  return (
    option?.name ||
    option?.label ||
    option?.value ||
    option?.size ||
    option?.color ||
    ""
  );
}

function getVariantColor(variant) {
  return getOptionLabel(
    variant?.color_name ||
      variant?.color ||
      variant?.colour
  );
}

function getVariantSize(variant) {
  return getOptionLabel(
    variant?.size_name ||
      variant?.size
  );
}

function getVariantStock(variant) {
  const stockValue =
    variant?.stock ??
    variant?.stock_quantity ??
    variant?.quantity ??
    0;

  return Number(stockValue || 0);
}

function isVariantAvailable(variant) {
  return (
    variant?.is_active !== false &&
    variant?.is_available !== false &&
    getVariantStock(variant) > 0
  );
}

function formatApiError(
  error,
  fallbackMessage = "Something went wrong."
) {
  const detail =
    error?.data?.detail ||
    error?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.message;

  if (detail) {
    if (Array.isArray(detail)) {
      return detail.join(" ");
    }

    return String(detail);
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeWishlistItem(item) {
  const product =
    item?.product_details ||
    item?.product ||
    item;

  const variants = Array.isArray(product?.variants)
    ? product.variants
    : Array.isArray(product?.product_variants)
      ? product.product_variants
      : [];

  const firstAvailableVariant =
    variants.find(isVariantAvailable) || null;

  const availableColors = Array.isArray(
    product?.available_colors
  )
    ? product.available_colors
    : [];

  const availableSizes = Array.isArray(
    product?.available_sizes
  )
    ? product.available_sizes
    : [];

  const color =
    getVariantColor(firstAvailableVariant) ||
    getOptionLabel(availableColors[0]);

  const size =
    getVariantSize(firstAvailableVariant) ||
    getOptionLabel(availableSizes[0]);

  const stockValue =
    firstAvailableVariant
      ? getVariantStock(firstAvailableVariant)
      : product?.total_stock ??
        product?.stock_quantity ??
        product?.stock ??
        null;

  const stock =
    stockValue === null ||
    stockValue === undefined
      ? null
      : Number(stockValue);

  const productId =
    product?.id ||
    product?.product_id ||
    item?.product_id;

  const priceValue =
    firstAvailableVariant?.price ??
    product?.sale_price ??
    product?.discounted_price ??
    product?.price ??
    0;

  const oldPriceValue =
    firstAvailableVariant?.old_price ??
    product?.old_price ??
    product?.compare_at_price ??
    product?.mrp ??
    null;

  const isInStock =
    product?.is_in_stock !== false &&
    product?.is_available !== false &&
    (
      stock === null ||
      Number.isNaN(stock) ||
      stock > 0
    );

  return {
    wishlistItemId:
      item?.wishlist_item_id ||
      item?.wishlist_id ||
      item?.id ||
      productId,

    product,
    productId,

    name:
      product?.name ||
      product?.title ||
      "Product",

    brand:
      product?.brand_name ||
      product?.brand?.name ||
      product?.brand ||
      "Yuvon",

    price: Number(priceValue || 0),

    oldPrice:
      oldPriceValue !== null &&
      oldPriceValue !== undefined &&
      oldPriceValue !== ""
        ? Number(oldPriceValue)
        : null,

    image: getProductImage(product),

    color,
    size,

    variantId:
      firstAvailableVariant?.id ||
      firstAvailableVariant?.variant_id ||
      null,

    variantSku:
      firstAvailableVariant?.sku ||
      firstAvailableVariant?.variant_sku ||
      null,

    stock,
    variants,
    isInStock,
  };
}

function Wishlist() {
  const {
    wishlistItems = [],
    removeFromWishlist,
    clearWishlist,
    loading,
    isWishlistUpdating,
  } = useWishlist();

  const { addToCart } = useCart();

  const [actionError, setActionError] =
    useState("");

  const [addingProductId, setAddingProductId] =
    useState(null);

  const [removingItemId, setRemovingItemId] =
    useState(null);

  const [clearingWishlist, setClearingWishlist] =
    useState(false);

  const normalizedItems = useMemo(() => {
    const items = Array.isArray(wishlistItems)
      ? wishlistItems
      : wishlistItems?.results || [];

    return items
      .map(normalizeWishlistItem)
      .filter((item) => item.productId);
  }, [wishlistItems]);

  const handleAddToCart = async (item) => {
    setActionError("");

    if (!item.isInStock) {
      setActionError(
        `${item.name} is currently out of stock.`
      );
      return;
    }

    const hasVariants =
      Array.isArray(item.variants) &&
      item.variants.length > 0;

    if (
      hasVariants &&
      !item.variantId
    ) {
      setActionError(
        `Please open ${item.name} and select an available size and color.`
      );
      return;
    }

    try {
      setAddingProductId(item.productId);

      await Promise.resolve(
        addToCart({
          ...item.product,

          id: item.productId,
          productId: item.productId,
          product_id: item.productId,

          name: item.name,

          image: item.image,
          main_image: item.image,
          main_image_url: item.image,

          brand: item.brand,
          brand_name: item.brand,

          price: item.price,

          oldPrice: item.oldPrice,
          old_price: item.oldPrice,

          quantity: 1,

          size: item.size || null,
          selectedSize: item.size || null,
          selected_size: item.size || null,

          color: item.color || null,
          selectedColor: item.color || null,
          selected_color: item.color || null,

          variantId: item.variantId,
          variant_id: item.variantId,

          variantSku: item.variantSku,
          variant_sku: item.variantSku,

          stock: item.stock,
          stock_quantity: item.stock,
        })
      );
    } catch (error) {
      console.error(
        "Add wishlist product to cart error:",
        error
      );

      setActionError(
        formatApiError(
          error,
          "Product cart me add nahi ho paaya."
        )
      );
    } finally {
      setAddingProductId(null);
    }
  };

  const handleRemove = async (item) => {
    setActionError("");

    try {
      setRemovingItemId(item.wishlistItemId);

      await removeFromWishlist(
        item.wishlistItemId,
        item.productId
      );
    } catch (error) {
      console.error(
        "Remove wishlist item error:",
        error
      );

      setActionError(
        formatApiError(
          error,
          "Product wishlist se remove nahi ho paaya."
        )
      );
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearWishlist = async () => {
    if (
      typeof clearWishlist !== "function" ||
      normalizedItems.length === 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove all products from your wishlist?"
    );

    if (!confirmed) {
      return;
    }

    setActionError("");

    try {
      setClearingWishlist(true);
      await clearWishlist();
    } catch (error) {
      console.error(
        "Clear wishlist error:",
        error
      );

      setActionError(
        formatApiError(
          error,
          "Wishlist clear nahi ho paayi."
        )
      );
    } finally {
      setClearingWishlist(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="h-80 animate-pulse bg-gray-200" />

                <div className="space-y-3 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-12 animate-pulse rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (normalizedItems.length === 0) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16">
        <div className="max-w-lg text-center">
          <div
            aria-hidden="true"
            className="text-7xl text-gray-300"
          >
            ♡
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            My Account
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-950 sm:text-5xl">
            Your Wishlist Is Empty
          </h1>

          <p className="mt-4 leading-7 text-gray-600">
            Save products you love and find them
            here whenever you are ready to shop.
          </p>

          <Link
            to="/shop"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              My Account
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-950">
              My Wishlist
            </h1>

            <p className="mt-2 text-gray-500">
              {normalizedItems.length} saved{" "}
              {normalizedItems.length === 1
                ? "product"
                : "products"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {typeof clearWishlist ===
              "function" && (
              <button
                type="button"
                disabled={clearingWishlist}
                onClick={handleClearWishlist}
                className="rounded-full border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 transition hover:border-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              >
                {clearingWishlist
                  ? "Clearing..."
                  : "Clear Wishlist"}
              </button>
            )}

            <Link
              to="/shop"
              className="rounded-full border border-gray-300 bg-white px-5 py-3 font-semibold transition hover:border-blue-600 hover:text-blue-600"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700"
          >
            <p className="text-sm font-medium">
              {actionError}
            </p>

            <button
              type="button"
              onClick={() => setActionError("")}
              className="shrink-0 text-lg leading-none"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {normalizedItems.map((item) => {
            const adding =
              addingProductId === item.productId;

            const removing =
              removingItemId ===
                item.wishlistItemId ||
              isWishlistUpdating?.(
                item.productId
              ) ||
              false;

            return (
              <article
                key={`${item.wishlistItemId}-${item.productId}`}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative">
                  <Link
                    to={`/product/${item.productId}`}
                    className="block overflow-hidden bg-gray-100"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror =
                          null;

                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                      className="h-80 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </Link>

                  {!item.isInStock && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      handleRemove(item)
                    }
                    className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-red-500 shadow-md transition hover:scale-110 hover:bg-red-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                    aria-label={`Remove ${item.name} from wishlist`}
                    title="Remove from wishlist"
                  >
                    {removing ? "…" : "♥"}
                  </button>
                </div>

                <div className="p-5">
                  <p className="text-sm text-gray-500">
                    {item.brand}
                  </p>

                  <Link
                    to={`/product/${item.productId}`}
                  >
                    <h2 className="mt-1 min-h-14 line-clamp-2 text-lg font-bold leading-snug transition hover:text-blue-600">
                      {item.name}
                    </h2>
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="font-bold text-blue-600">
                      ₹{item.price.toFixed(2)}
                    </p>

                    {item.oldPrice !== null &&
                      item.oldPrice >
                        item.price && (
                        <p className="text-sm text-gray-400 line-through">
                          ₹
                          {item.oldPrice.toFixed(
                            2
                          )}
                        </p>
                      )}
                  </div>

                  <div className="mt-3 flex min-h-7 flex-wrap gap-2 text-xs text-gray-500">
                    {item.color && (
                      <span className="rounded-full bg-gray-100 px-3 py-1">
                        Color: {item.color}
                      </span>
                    )}

                    {item.size && (
                      <span className="rounded-full bg-gray-100 px-3 py-1">
                        Size: {item.size}
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-3 text-sm font-semibold ${
                      item.isInStock
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {item.isInStock
                      ? item.stock !== null &&
                        !Number.isNaN(
                          item.stock
                        )
                        ? `${item.stock} in stock`
                        : "In Stock"
                      : "Out of Stock"}
                  </p>

                  <button
                    type="button"
                    disabled={
                      !item.isInStock ||
                      adding ||
                      removing
                    }
                    onClick={() =>
                      handleAddToCart(item)
                    }
                    className="mt-5 w-full rounded-full bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {adding
                      ? "Adding..."
                      : item.isInStock
                        ? "Add to Cart"
                        : "Out of Stock"}
                  </button>

                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      handleRemove(item)
                    }
                    className="mt-3 w-full rounded-full border border-gray-300 py-3 font-semibold transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
                  >
                    {removing
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Wishlist;