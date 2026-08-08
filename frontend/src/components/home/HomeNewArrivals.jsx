import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  fetchNewArrivalProducts,
} from "../../services/api";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useWishlist,
} from "../../context/WishlistContext";

const BACKEND_URL =
  "http://127.0.0.1:8000";

function getProductImage(product) {
  const image =
    product.main_image_url ||
    product.main_image ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.image ||
    "";

  if (!image) {
    return "https://placehold.co/600x800?text=No+Image";
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
    image.startsWith("/")
      ? image
      : `/${image}`
  }`;
}

function getColorName(color) {
  if (typeof color === "string") {
    return color;
  }

  return (
    color?.name ||
    color?.color ||
    ""
  );
}

function getColorCode(color) {
  if (typeof color === "string") {
    return "#000000";
  }

  return (
    color?.code ||
    color?.color_code ||
    "#000000"
  );
}

function formatApiError(error) {
  if (error?.data?.detail) {
    return Array.isArray(
      error.data.detail
    )
      ? error.data.detail.join(" ")
      : String(error.data.detail);
  }

  if (error?.data?.message) {
    return String(
      error.data.message
    );
  }

  return (
    error?.message ||
    "Wishlist update nahi ho paayi."
  );
}

function HomeNewArrivals() {
  const navigate =
    useNavigate();

  const {
    isAuthenticated,
    openLogin,
  } = useAuth();

  const {
    toggleWishlist,
    isWishlisted,
    isWishlistUpdating,
  } = useWishlist();

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProducts =
      async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await fetchNewArrivalProducts();

          if (!isMounted) {
            return;
          }

          const productList =
            Array.isArray(data)
              ? data
              : data.results || [];

          setProducts(
            productList.slice(0, 4)
          );
        } catch (fetchError) {
          console.error(
            "New arrivals error:",
            fetchError
          );

          if (!isMounted) {
            return;
          }

          setError(
            fetchError.message ||
              "New arrival products load nahi ho paaye."
          );

          setProducts([]);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWishlist =
    async (
      event,
      product
    ) => {
      event.stopPropagation();

      if (!isAuthenticated) {
        openLogin();
        return;
      }

      try {
        await toggleWishlist(
          product
        );
      } catch (wishlistError) {
        console.error(
          "New arrival wishlist error:",
          wishlistError
        );

        alert(
          formatApiError(
            wishlistError
          )
        );
      }
    };

  if (loading) {
    return (
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1500px] px-6">
          <h2 className="mb-12 text-center text-5xl font-extrabold">
            New Arrivals
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse"
                >
                  <div className="h-[520px] rounded bg-gray-200" />

                  <div className="mt-4 h-5 rounded bg-gray-200" />

                  <div className="mt-2 h-4 w-32 rounded bg-gray-200" />
                </div>
              )
            )}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1500px] px-6">
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-red-600">
              New arrivals load nahi ho paaye
            </h2>

            <p className="mt-2 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-full bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (
    products.length === 0
  ) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1500px] px-6">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
            Just Dropped
          </p>

          <h2 className="mt-2 text-5xl font-extrabold">
            New Arrivals
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map(
            (product) => {
              const image =
                getProductImage(
                  product
                );

              const wishlisted =
                isWishlisted(
                  product.id
                );

              const wishlistUpdating =
                isWishlistUpdating?.(
                  product.id
                ) || false;

              const availableColors =
                product.available_colors ||
                [];

              return (
                <article
                  key={product.id}
                  onClick={() =>
                    navigate(
                      `/product/${product.id}`
                    )
                  }
                  className="group cursor-pointer bg-white"
                >
                  <div className="relative overflow-hidden bg-gray-100">
                    <img
                      src={image}
                      alt={product.name}
                      loading="lazy"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.onerror =
                          null;

                        event.currentTarget.src =
                          "https://placehold.co/600x800?text=No+Image";
                      }}
                      className="h-[520px] w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute left-5 top-5 space-y-2">
                      {Number(
                        product.discount_percentage
                      ) > 0 && (
                        <span className="block bg-red-500 px-4 py-2 text-xs font-semibold text-white">
                          SAVE{" "}
                          {
                            product.discount_percentage
                          }
                          %
                        </span>
                      )}

                      <span className="block bg-white px-4 py-2 text-xs font-semibold text-black shadow-sm">
                        NEW IN
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        wishlistUpdating
                      }
                      onClick={(
                        event
                      ) =>
                        handleWishlist(
                          event,
                          product
                        )
                      }
                      className={`absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border text-xl shadow-md backdrop-blur transition hover:scale-110 disabled:cursor-wait disabled:opacity-60 ${
                        wishlisted
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-white bg-white/95 text-gray-700 hover:text-red-500"
                      }`}
                      title={
                        isAuthenticated
                          ? wishlisted
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                          : "Login to add wishlist"
                      }
                      aria-label={
                        wishlisted
                          ? "Remove from wishlist"
                          : "Add to wishlist"
                      }
                    >
                      {wishlistUpdating
                        ? "…"
                        : wishlisted
                          ? "♥"
                          : "♡"}
                    </button>

                    {product.is_in_stock ===
                      false && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="line-clamp-2 min-h-14 text-lg font-medium leading-snug transition group-hover:text-blue-600">
                        {product.name}
                      </h3>

                      <p className="shrink-0 text-sm text-gray-700">
                        ★{" "}
                        {product.rating ||
                          "0.0"}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {product.brand_name ||
                        product.brand?.name ||
                        "Yuvon"}
                    </p>

                    <div className="mt-2 flex gap-3">
                      {product.old_price && (
                        <span className="text-gray-400 line-through">
                          ₹
                          {
                            product.old_price
                          }
                        </span>
                      )}

                      <span className="font-semibold text-red-500">
                        ₹{product.price}
                      </span>
                    </div>

                    {availableColors.length >
                      0 && (
                      <div className="mt-4 flex gap-2">
                        {availableColors
                          .slice(0, 4)
                          .map(
                            (
                              color,
                              index
                            ) => {
                              const colorName =
                                getColorName(
                                  color
                                );

                              return (
                                <span
                                  key={
                                    colorName ||
                                    index
                                  }
                                  title={
                                    colorName ||
                                    "Color"
                                  }
                                  className="h-5 w-5 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor:
                                      getColorCode(
                                        color
                                      ),
                                  }}
                                />
                              );
                            }
                          )}

                        {availableColors.length >
                          4 && (
                          <span className="self-center text-xs text-gray-500">
                            +
                            {availableColors.length -
                              4}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        navigate(
                          `/product/${product.id}`
                        );
                      }}
                      className="mt-5 w-full border border-black py-3 text-sm font-semibold tracking-wider transition hover:bg-black hover:text-white"
                    >
                      VIEW PRODUCT
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/shop?new_arrival=true"
              )
            }
            className="border border-black px-12 py-4 text-sm font-semibold tracking-widest transition hover:bg-black hover:text-white"
          >
            SHOP NEW ARRIVALS
          </button>
        </div>
      </div>
    </section>
  );
}

export default HomeNewArrivals;