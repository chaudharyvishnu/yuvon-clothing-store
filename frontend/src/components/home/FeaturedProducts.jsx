import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  fetchFeaturedProducts,
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

function FeaturedProducts() {
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
            await fetchFeaturedProducts();

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
            "Featured products error:",
            fetchError
          );

          if (!isMounted) {
            return;
          }

          setError(
            fetchError.message ||
              "Featured products load nahi ho paaye."
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
          "Featured wishlist error:",
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
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-10 text-center text-4xl font-bold">
            Featured Products
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse"
                >
                  <div className="h-96 rounded-2xl bg-gray-200" />

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
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600">
              Featured products load nahi ho paaye
            </h2>

            <p className="mt-2 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-full bg-black px-6 py-3 font-semibold text-white"
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
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Curated For You
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Featured Products
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

              return (
                <article
                  key={product.id}
                  onClick={() =>
                    navigate(
                      `/product/${product.id}`
                    )
                  }
                  className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
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
                      className="h-96 w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    {Number(
                      product.discount_percentage
                    ) > 0 && (
                      <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                        {
                          product.discount_percentage
                        }
                        % OFF
                      </span>
                    )}

                    <span className="absolute bottom-4 left-4 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                      FEATURED
                    </span>

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
                      className={`absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border text-xl shadow-md backdrop-blur transition hover:scale-110 disabled:cursor-wait disabled:opacity-60 ${
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

                  <div className="p-5">
                    <p className="text-sm text-gray-500">
                      {product.brand_name ||
                        product.brand?.name ||
                        "Yuvon"}
                    </p>

                    <h3 className="mt-1 min-h-14 line-clamp-2 text-lg font-bold transition group-hover:text-blue-600">
                      {product.name}
                    </h3>

                    <div className="mt-3 flex items-center gap-3">
                      <span className="font-bold text-blue-600">
                        ₹{product.price}
                      </span>

                      {product.old_price && (
                        <span className="text-sm text-gray-400 line-through">
                          ₹
                          {
                            product.old_price
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-yellow-500">
                        ★{" "}
                        {product.rating ||
                          "0.0"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {product.total_reviews ||
                          0}{" "}
                        reviews
                      </p>
                    </div>

                    {product
                      .available_sizes
                      ?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {product.available_sizes
                          .slice(0, 4)
                          .map(
                            (size) => (
                              <span
                                key={size}
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
                              >
                                {size}
                              </span>
                            )
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
                      className="mt-5 w-full rounded-full bg-black py-3 font-semibold text-white transition hover:bg-blue-600"
                    >
                      View Product
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
                "/shop?featured=true"
              )
            }
            className="border border-black px-10 py-3 font-semibold transition hover:bg-black hover:text-white"
          >
            VIEW ALL FEATURED
          </button>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;