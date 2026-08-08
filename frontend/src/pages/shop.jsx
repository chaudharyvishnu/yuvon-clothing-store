import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

import ShopHeader from "../components/shop/ShopHeader";
import ShopFilters from "../components/shop/ShopFilters";
import ProductGrid from "../components/shop/ProductGrid";
import LoadingSkeleton from "../components/shop/LoadingSkeleton";
import ErrorState from "../components/shop/ErrorState";
import EmptyState from "../components/shop/EmptyState";
import Pagination from "../components/shop/Pagination";

import {
  getActiveVariants,
  getProductSizes,
  isProductInStock,
  normalizeProductForCart,
} from "../utils/productHelpers";

import useProducts from "../hooks/useProducts";
import useShopFilters from "../hooks/useShopFilters";

const PAGE_SIZE = 12;

function formatActionError(error) {
  if (error?.data?.detail) {
    return Array.isArray(error.data.detail)
      ? error.data.detail.join(" ")
      : String(error.data.detail);
  }

  if (error?.data?.message) {
    return String(error.data.message);
  }

  return (
    error?.message ||
    "Request complete nahi ho paayi."
  );
}

function Shop() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isAuthenticated,
    openLogin,
  } = useAuth();

  const { addToCart } = useCart();

  const {
    toggleWishlist,
    isWishlisted,
    isWishlistUpdating,
  } = useWishlist();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const handleClearFilters =
    useCallback(() => {
      navigate("/shop");
    }, [navigate]);

  const {
    searchQuery,
    departmentQuery,
    categoryQuery,
    subcategoryQuery,
    featuredQuery,
    trendingQuery,
    bestSellerQuery,
    offerQuery,
    clearanceQuery,
    newArrivalQuery,
    page,
    setPage,
    selectedBrand,
    setSelectedBrand,
    selectedSize,
    setSelectedSize,
    selectedPrice,
    setSelectedPrice,
    ordering,
    setOrdering,
    clearFilters,
    productParams,
  } = useShopFilters(searchParams, {
    pageSize: PAGE_SIZE,
    onClearFilters: handleClearFilters,
  });

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  useEffect(() => {
    if (!actionMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setActionMessage("");
    }, 2500);

    return () => clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    if (!location.hash) {
      return undefined;
    }

    const section = document.querySelector(
      location.hash
    );

    if (!section) {
      return undefined;
    }

    const timer = setTimeout(() => {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [location.hash]);

  const {
    products,
    brands,
    totalProducts,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    retry,
  } = useProducts(productParams);

  const visibleProducts = useMemo(() => {
    if (!selectedSize) {
      return products;
    }

    return products.filter((product) =>
      getProductSizes(product).includes(
        selectedSize
      )
    );
  }, [products, selectedSize]);

  const pageTitle = useMemo(() => {
    if (searchQuery) {
      return `Search: ${searchQuery}`;
    }

    if (subcategoryQuery) {
      return subcategoryQuery.replaceAll(
        "-",
        " "
      );
    }

    if (categoryQuery) {
      return categoryQuery.replaceAll(
        "-",
        " "
      );
    }

    if (departmentQuery) {
      return departmentQuery.replaceAll(
        "-",
        " "
      );
    }

    if (featuredQuery) {
      return "Featured Products";
    }

    if (trendingQuery) {
      return "Trending Products";
    }

    if (bestSellerQuery) {
      return "Best Seller Products";
    }

    if (offerQuery) {
      return "Offer Products";
    }

    if (clearanceQuery) {
      return "Clearance Sale";
    }

    if (newArrivalQuery) {
      return "New Arrivals";
    }

    return "Shop Collection";
  }, [
    searchQuery,
    departmentQuery,
    categoryQuery,
    subcategoryQuery,
    featuredQuery,
    trendingQuery,
    bestSellerQuery,
    offerQuery,
    clearanceQuery,
    newArrivalQuery,
  ]);

  const pageDescription = useMemo(() => {
    if (searchQuery) {
      return `Search results for "${searchQuery}"`;
    }

    if (
      departmentQuery ||
      categoryQuery ||
      subcategoryQuery
    ) {
      return "Explore products from this collection";
    }

    if (featuredQuery) {
      return "Our specially selected featured products";
    }

    if (trendingQuery) {
      return "Products currently trending at Yuvon";
    }

    if (bestSellerQuery) {
      return "Our most popular products";
    }

    if (offerQuery) {
      return "Special offers and discounts";
    }

    if (clearanceQuery) {
      return "Limited-stock clearance products";
    }

    if (newArrivalQuery) {
      return "Explore our latest products";
    }

    return "Find your perfect style";
  }, [
    searchQuery,
    departmentQuery,
    categoryQuery,
    subcategoryQuery,
    featuredQuery,
    trendingQuery,
    bestSellerQuery,
    offerQuery,
    clearanceQuery,
    newArrivalQuery,
  ]);

  const openProduct = useCallback(
    (productId) => {
      navigate(`/product/${productId}`);
    },
    [navigate]
  );

  const handleWishlist = async (
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
        normalizeProductForCart(product)
      );

      setActionMessage(
        "Wishlist updated successfully."
      );
    } catch (wishlistError) {
      console.error(
        "Shop wishlist error:",
        wishlistError
      );

      alert(formatActionError(wishlistError));
    }
  };

  const handleAddToCart = (
    event,
    product
  ) => {
    event.stopPropagation();

    if (!isProductInStock(product)) {
      alert(
        "This product is out of stock."
      );
      return;
    }

    const activeVariants =
      getActiveVariants(product);

    if (activeVariants.length > 0) {
      openProduct(product.id);

      setActionMessage(
        "Please select color and size."
      );

      return;
    }

    const result = addToCart(
      normalizeProductForCart(product)
    );

    if (result?.success === false) {
      alert(
        result.reason ||
          "Product cart me add nahi ho paaya."
      );

      return;
    }

    setActionMessage(
      "Product added to cart."
    );
  };

  return (
    <section className="min-h-screen bg-gray-50 py-10">
      {actionMessage && (
        <div className="fixed right-4 top-24 z-50 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {actionMessage}
        </div>
      )}

      <div
        id="shop-collection"
        className="mx-auto max-w-7xl px-4 sm:px-6"
      >
        <ShopHeader
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          ordering={ordering}
          setOrdering={setOrdering}
        />

        <div className="grid gap-8 lg:grid-cols-4">
          <ShopFilters
            brands={brands}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedPrice={selectedPrice}
            setSelectedPrice={setSelectedPrice}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            clearFilters={clearFilters}
          />

          <div className="lg:col-span-3">
            {loading && <LoadingSkeleton />}

            {!loading && error && (
              <ErrorState
                error={error}
                onRetry={retry}
              />
            )}

            {!loading &&
              !error &&
              visibleProducts.length === 0 && (
                <EmptyState
                  clearFilters={clearFilters}
                />
              )}

            {!loading &&
              !error &&
              visibleProducts.length > 0 && (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {totalProducts ||
                        visibleProducts.length}{" "}
                      products found
                    </p>

                    <p className="text-sm text-gray-500">
                      Page {page}
                    </p>
                  </div>

                  <ProductGrid
                    products={visibleProducts}
                    openProduct={openProduct}
                    handleAddToCart={handleAddToCart}
                    handleWishlist={handleWishlist}
                    isWishlisted={isWishlisted}
                    isWishlistUpdating={isWishlistUpdating}
                    isAuthenticated={isAuthenticated}
                  />

                  {(hasPreviousPage ||
                    hasNextPage) && (
                    <Pagination
                      page={page}
                      hasNextPage={hasNextPage}
                      hasPreviousPage={hasPreviousPage}
                      setPage={setPage}
                    />
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Shop;
