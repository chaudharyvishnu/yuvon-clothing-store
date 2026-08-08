import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearWishlist as clearWishlistApi,
  fetchWishlist,
  removeWishlistItem,
  toggleWishlistItem,
} from "../services/api";

import { useAuth } from "./AuthContext";

const WishlistContext =
  createContext(null);

function getWishlistProductId(item) {
  if (!item) {
    return null;
  }

  if (
    item.product &&
    typeof item.product === "object"
  ) {
    return item.product.id ?? null;
  }

  if (
    item.product !== undefined &&
    item.product !== null
  ) {
    return item.product;
  }

  if (
    item.product_id !== undefined &&
    item.product_id !== null
  ) {
    return item.product_id;
  }

  /*
   * Local/product-shaped objects ke liye fallback.
   * Backend wishlist item me `id` wishlist row ID hota hai,
   * isliye nested product hone par ye fallback use nahi hoga.
   */
  if (
    item.name ||
    item.slug ||
    item.price !== undefined
  ) {
    return item.id ?? null;
  }

  return null;
}

function normalizeWishlistResponse(
  response
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(response?.results)
  ) {
    return response.results;
  }

  if (
    Array.isArray(response?.items)
  ) {
    return response.items;
  }

  if (
    Array.isArray(response?.wishlist)
  ) {
    return response.wishlist;
  }

  return [];
}

function getErrorMessage(error) {
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

export function WishlistProvider({
  children,
}) {
  const {
    isAuthenticated,
    loading: authLoading,
    openLogin,
  } = useAuth();

  const [
    wishlistItems,
    setWishlistItems,
  ] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    updatingProductIds,
    setUpdatingProductIds,
  ] = useState([]);

  const [
    removingItemIds,
    setRemovingItemIds,
  ] = useState([]);

  const [
    clearingWishlist,
    setClearingWishlist,
  ] = useState(false);

  // =====================================
  // Load Wishlist
  // =====================================

  const loadWishlist =
    useCallback(async () => {
      if (
        authLoading ||
        !isAuthenticated
      ) {
        setWishlistItems([]);
        setError("");
        setLoading(false);
        return [];
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetchWishlist();

        const items =
          normalizeWishlistResponse(
            response
          );

        setWishlistItems(items);

        return items;
      } catch (loadError) {
        console.error(
          "Wishlist load error:",
          loadError
        );

        setError(
          getErrorMessage(loadError)
        );

        return [];
      } finally {
        setLoading(false);
      }
    }, [
      authLoading,
      isAuthenticated,
    ]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // =====================================
  // Toggle Wishlist
  // =====================================

  const toggleWishlist =
    useCallback(
      async (product) => {
        const productId =
          product?.id ??
          product?.productId ??
          product?.product_id;

        if (!productId) {
          throw new Error(
            "Valid product ID is required."
          );
        }

        if (!isAuthenticated) {
          openLogin?.();

          return {
            success: false,
            requiresLogin: true,
          };
        }

        const normalizedProductId =
          String(productId);

        if (
          updatingProductIds.includes(
            normalizedProductId
          )
        ) {
          return {
            success: false,
            pending: true,
          };
        }

        try {
          setUpdatingProductIds(
            (current) => [
              ...current,
              normalizedProductId,
            ]
          );

          setError("");

          const response =
            await toggleWishlistItem(
              productId
            );

          /*
           * Backend response shape alag ho sakti hai,
           * isliye successful toggle ke baad authoritative
           * wishlist dobara backend se load kar rahe hain.
           */
          await loadWishlist();

          return {
            success: true,
            ...response,
          };
        } catch (toggleError) {
          console.error(
            "Wishlist toggle error:",
            toggleError
          );

          const message =
            getErrorMessage(
              toggleError
            );

          setError(message);

          throw toggleError;
        } finally {
          setUpdatingProductIds(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  normalizedProductId
              )
          );
        }
      },
      [
        isAuthenticated,
        loadWishlist,
        openLogin,
        updatingProductIds,
      ]
    );

  // =====================================
  // Remove Wishlist Item
  // =====================================

  const removeFromWishlist =
    useCallback(
      async (wishlistItemId) => {
        if (!isAuthenticated) {
          openLogin?.();

          return {
            success: false,
            requiresLogin: true,
          };
        }

        if (
          wishlistItemId ===
            undefined ||
          wishlistItemId === null
        ) {
          throw new Error(
            "Wishlist item ID is required."
          );
        }

        const normalizedItemId =
          String(wishlistItemId);

        if (
          removingItemIds.includes(
            normalizedItemId
          )
        ) {
          return {
            success: false,
            pending: true,
          };
        }

        const previousItems =
          wishlistItems;

        try {
          setRemovingItemIds(
            (current) => [
              ...current,
              normalizedItemId,
            ]
          );

          setError("");

          // Optimistic UI update
          setWishlistItems(
            (current) =>
              current.filter(
                (item) =>
                  String(item.id) !==
                  normalizedItemId
              )
          );

          const response =
            await removeWishlistItem(
              wishlistItemId
            );

          return {
            success: true,
            ...response,
          };
        } catch (removeError) {
          console.error(
            "Wishlist remove error:",
            removeError
          );

          // API fail hone par purani list restore
          setWishlistItems(
            previousItems
          );

          const message =
            getErrorMessage(
              removeError
            );

          setError(message);

          throw removeError;
        } finally {
          setRemovingItemIds(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  normalizedItemId
              )
          );
        }
      },
      [
        isAuthenticated,
        openLogin,
        removingItemIds,
        wishlistItems,
      ]
    );

  // =====================================
  // Clear Entire Wishlist
  // =====================================

  const clearWishlist =
    useCallback(async () => {
      if (!isAuthenticated) {
        openLogin?.();

        return {
          success: false,
          requiresLogin: true,
        };
      }

      if (
        clearingWishlist ||
        wishlistItems.length === 0
      ) {
        return {
          success: false,
          pending:
            clearingWishlist,
        };
      }

      const previousItems =
        wishlistItems;

      try {
        setClearingWishlist(true);
        setError("");

        setWishlistItems([]);

        const response =
          await clearWishlistApi();

        return {
          success: true,
          ...response,
        };
      } catch (clearError) {
        console.error(
          "Wishlist clear error:",
          clearError
        );

        setWishlistItems(
          previousItems
        );

        const message =
          getErrorMessage(
            clearError
          );

        setError(message);

        throw clearError;
      } finally {
        setClearingWishlist(false);
      }
    }, [
      clearingWishlist,
      isAuthenticated,
      openLogin,
      wishlistItems,
    ]);

  // =====================================
  // Wishlist Helpers
  // =====================================

  const isWishlisted =
    useCallback(
      (productId) => {
        if (
          productId === undefined ||
          productId === null
        ) {
          return false;
        }

        return wishlistItems.some(
          (item) =>
            String(
              getWishlistProductId(
                item
              )
            ) ===
            String(productId)
        );
      },
      [wishlistItems]
    );

  const isWishlistUpdating =
    useCallback(
      (productId) =>
        updatingProductIds.includes(
          String(productId)
        ),
      [updatingProductIds]
    );

  const isWishlistItemRemoving =
    useCallback(
      (wishlistItemId) =>
        removingItemIds.includes(
          String(
            wishlistItemId
          )
        ),
      [removingItemIds]
    );

  const wishlistCount =
    wishlistItems.length;

  const clearError =
    useCallback(() => {
      setError("");
    }, []);

  const value = useMemo(
    () => ({
      wishlistItems,
      wishlistCount,

      loading,
      error,

      updatingProductIds,
      removingItemIds,
      clearingWishlist,

      loadWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,

      isWishlisted,
      isWishlistUpdating,
      isWishlistItemRemoving,

      clearError,
    }),
    [
      wishlistItems,
      wishlistCount,
      loading,
      error,
      updatingProductIds,
      removingItemIds,
      clearingWishlist,
      loadWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      isWishlisted,
      isWishlistUpdating,
      isWishlistItemRemoving,
      clearError,
    ]
  );

  return (
    <WishlistContext.Provider
      value={value}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context =
    useContext(
      WishlistContext
    );

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider."
    );
  }

  return context;
}