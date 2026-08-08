import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "yuvon_cart_items";
const BACKEND_URL = "http://127.0.0.1:8000";
const FALLBACK_IMAGE =
  "https://placehold.co/500x650?text=No+Image";

function getProductId(product) {
  return (
    product?.productId ??
    product?.product_id ??
    product?.id ??
    null
  );
}

function getVariantId(product) {
  return (
    product?.variantId ??
    product?.variant_id ??
    product?.selectedVariant?.id ??
    product?.selected_variant?.id ??
    null
  );
}

function getSelectedSize(product) {
  const size =
    product?.selectedSize ??
    product?.selected_size ??
    product?.size ??
    product?.selectedVariant?.size ??
    product?.selected_variant?.size ??
    null;

  if (
    typeof size === "string" ||
    typeof size === "number"
  ) {
    return String(size);
  }

  return (
    size?.name ||
    size?.label ||
    size?.value ||
    size?.size ||
    null
  );
}

function getSelectedColor(product) {
  const color =
    product?.selectedColor ??
    product?.selected_color ??
    product?.color ??
    product?.selectedVariant?.color ??
    product?.selected_variant?.color ??
    null;

  if (
    typeof color === "string" ||
    typeof color === "number"
  ) {
    return String(color);
  }

  return (
    color?.name ||
    color?.label ||
    color?.value ||
    color?.color ||
    null
  );
}

function getProductImage(product) {
  const image =
    product?.image ||
    product?.image_url ||
    product?.main_image_url ||
    product?.main_image ||
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

function getProductBrand(product) {
  return (
    product?.brand_name ||
    product?.brand?.name ||
    product?.brand ||
    "Yuvon"
  );
}

function getProductName(product) {
  return (
    product?.name ||
    product?.title ||
    "Product"
  );
}

function getNormalizedStock(product) {
  const stockValue =
    product?.stock ??
    product?.stock_quantity ??
    product?.total_stock ??
    product?.selectedVariant?.stock ??
    product?.selected_variant?.stock ??
    null;

  if (
    stockValue === undefined ||
    stockValue === null ||
    stockValue === ""
  ) {
    return null;
  }

  const parsedStock = Number(stockValue);

  if (!Number.isFinite(parsedStock)) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(parsedStock)
  );
}

function getNormalizedQuantity(
  quantity,
  stock = null
) {
  const parsedQuantity = Number(quantity);

  const safeQuantity =
    Number.isFinite(parsedQuantity)
      ? Math.max(
          1,
          Math.floor(parsedQuantity)
        )
      : 1;

  if (stock === null) {
    return safeQuantity;
  }

  if (stock <= 0) {
    return 0;
  }

  return Math.min(
    safeQuantity,
    stock
  );
}

function createCartItemKey(product) {
  const productId =
    getProductId(product) ??
    "unknown-product";

  const variantId =
    getVariantId(product) ??
    "no-variant";

  const size =
    getSelectedSize(product) ??
    "no-size";

  const color =
    getSelectedColor(product) ??
    "no-color";

  return `${productId}-${variantId}-${size}-${color}`;
}

function normalizeCartItem(product) {
  const productId =
    getProductId(product);

  const variantId =
    getVariantId(product);

  const size =
    getSelectedSize(product);

  const color =
    getSelectedColor(product);

  const stock =
    getNormalizedStock(product);

  const quantity =
    getNormalizedQuantity(
      product?.quantity ?? 1,
      stock
    );

  const rawPrice =
    product?.price ??
    product?.sale_price ??
    product?.discounted_price ??
    product?.selectedVariant?.price ??
    product?.selected_variant?.price ??
    0;

  const rawOldPrice =
    product?.oldPrice ??
    product?.old_price ??
    product?.compare_at_price ??
    product?.mrp ??
    null;

  const variantSku =
    product?.variantSku ??
    product?.variant_sku ??
    product?.selectedVariant?.sku ??
    product?.selected_variant?.sku ??
    null;

  const itemKey =
    product?.itemKey ||
    createCartItemKey({
      ...product,
      productId,
      variantId,
      size,
      color,
    });

  return {
    ...product,

    id:
      product?.id ??
      productId,

    itemKey,

    productId,
    product_id: productId,

    variantId,
    variant_id: variantId,

    variantSku,
    variant_sku: variantSku,

    name:
      getProductName(product),

    brand:
      getProductBrand(product),

    brand_name:
      getProductBrand(product),

    image:
      getProductImage(product),

    main_image:
      getProductImage(product),

    main_image_url:
      getProductImage(product),

    size,
    selectedSize: size,
    selected_size: size,

    color,
    selectedColor: color,
    selected_color: color,

    price: Number(rawPrice || 0),

    oldPrice:
      rawOldPrice !== null &&
      rawOldPrice !== undefined &&
      rawOldPrice !== ""
        ? Number(rawOldPrice)
        : null,

    old_price:
      rawOldPrice !== null &&
      rawOldPrice !== undefined &&
      rawOldPrice !== ""
        ? Number(rawOldPrice)
        : null,

    quantity,
    stock,
    stock_quantity: stock,

    isInStock:
      product?.is_in_stock !== false &&
      product?.is_available !== false &&
      (
        stock === null ||
        stock > 0
      ),
  };
}

function loadStoredCart() {
  try {
    const savedCart =
      localStorage.getItem(
        CART_STORAGE_KEY
      );

    if (!savedCart) {
      return [];
    }

    const parsedCart =
      JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => {
        if (!item) {
          return false;
        }

        return Boolean(
          getProductId(item)
        );
      })
      .map(normalizeCartItem)
      .filter(
        (item) =>
          item.productId &&
          item.quantity > 0
      );
  } catch (error) {
    console.error(
      "Cart localStorage load error:",
      error
    );

    return [];
  }
}

export const CartProvider = ({
  children,
}) => {
  const [
    cartItems,
    setCartItems,
  ] = useState(loadStoredCart);

  const [
    isCartOpen,
    setIsCartOpen,
  ] = useState(false);

  useEffect(() => {
    try {
      if (
        cartItems.length === 0
      ) {
        localStorage.removeItem(
          CART_STORAGE_KEY
        );

        return;
      }

      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartItems)
      );
    } catch (error) {
      console.error(
        "Cart localStorage save error:",
        error
      );
    }
  }, [cartItems]);

  const addToCart = (
    product,
    options = {}
  ) => {
    const productId =
      getProductId(product);

    if (!productId) {
      console.error(
        "Product ID is required to add an item to cart."
      );

      return {
        success: false,
        reason: "missing-product-id",
      };
    }

    const newItem =
      normalizeCartItem({
        ...product,
        ...options,

        productId,

        quantity:
          options?.quantity ??
          product?.quantity ??
          1,
      });

    if (
      !newItem.isInStock ||
      (
        newItem.stock !== null &&
        newItem.stock <= 0
      )
    ) {
      console.warn(
        "Out-of-stock product cannot be added to cart."
      );

      return {
        success: false,
        reason: "out-of-stock",
      };
    }

    setCartItems(
      (currentItems) => {
        const existingItem =
          currentItems.find(
            (item) =>
              item.itemKey ===
              newItem.itemKey
          );

        if (!existingItem) {
          return [
            ...currentItems,
            newItem,
          ];
        }

        return currentItems.map(
          (item) => {
            if (
              item.itemKey !==
              newItem.itemKey
            ) {
              return item;
            }

            const mergedStock =
              newItem.stock !== null
                ? newItem.stock
                : item.stock;

            const requestedQuantity =
              Number(
                item.quantity || 0
              ) +
              Number(
                newItem.quantity || 1
              );

            const mergedQuantity =
              getNormalizedQuantity(
                requestedQuantity,
                mergedStock
              );

            return {
              ...item,
              ...newItem,

              stock: mergedStock,
              stock_quantity:
                mergedStock,

              quantity:
                mergedQuantity,
            };
          }
        );
      }
    );

    setIsCartOpen(true);

    return {
      success: true,
      item: newItem,
    };
  };

  const removeFromCart = (
    itemKey
  ) => {
    setCartItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.itemKey !==
            itemKey
        )
    );
  };

  const updateQuantity = (
    itemKey,
    requestedQuantity
  ) => {
    setCartItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (
              item.itemKey !==
              itemKey
            ) {
              return item;
            }

            const quantity =
              getNormalizedQuantity(
                requestedQuantity,
                item.stock
              );

            if (quantity <= 0) {
              return item;
            }

            return {
              ...item,
              quantity,
            };
          }
        )
    );
  };

  const increaseQuantity = (
    itemKey
  ) => {
    setCartItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (
              item.itemKey !==
              itemKey
            ) {
              return item;
            }

            const quantity =
              getNormalizedQuantity(
                Number(
                  item.quantity || 1
                ) + 1,
                item.stock
              );

            if (
              quantity ===
              item.quantity
            ) {
              return item;
            }

            return {
              ...item,
              quantity,
            };
          }
        )
    );
  };

  const decreaseQuantity = (
    itemKey
  ) => {
    setCartItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (
              item.itemKey !==
              itemKey
            ) {
              return item;
            }

            return {
              ...item,

              quantity: Math.max(
                1,
                Number(
                  item.quantity || 1
                ) - 1
              ),
            };
          }
        )
    );
  };

  const setItemStock = (
    itemKey,
    stock
  ) => {
    setCartItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (
              item.itemKey !==
              itemKey
            ) {
              return item;
            }

            const normalizedStock =
              getNormalizedStock({
                stock,
              });

            const quantity =
              getNormalizedQuantity(
                item.quantity,
                normalizedStock
              );

            return {
              ...item,

              stock:
                normalizedStock,

              stock_quantity:
                normalizedStock,

              quantity:
                quantity > 0
                  ? quantity
                  : item.quantity,

              isInStock:
                normalizedStock ===
                  null ||
                normalizedStock > 0,
            };
          }
        )
    );
  };

  const getCartItem = (
    itemKey
  ) => {
    return (
      cartItems.find(
        (item) =>
          item.itemKey ===
          itemKey
      ) || null
    );
  };

  const getCartItemByProduct = (
    product
  ) => {
    const itemKey =
      createCartItemKey(product);

    return (
      cartItems.find(
        (item) =>
          item.itemKey ===
          itemKey
      ) || null
    );
  };

  const isInCart = (
    product
  ) => {
    return Boolean(
      getCartItemByProduct(
        product
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const clearCartAndClose =
    () => {
      setCartItems([]);
      setIsCartOpen(false);
    };

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen(
      (currentState) =>
        !currentState
    );
  };

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => {
          return (
            sum +
            Number(
              item.price || 0
            ) *
              Number(
                item.quantity || 0
              )
          );
        },
        0
      ),
    [cartItems]
  );

  const totalItems = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => {
          return (
            sum +
            Number(
              item.quantity || 0
            )
          );
        },
        0
      ),
    [cartItems]
  );

  const uniqueItems =
    cartItems.length;

  const hasItems =
    cartItems.length > 0;

  const value = useMemo(
    () => ({
      cartItems,

      addToCart,
      removeFromCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      setItemStock,

      getCartItem,
      getCartItemByProduct,
      isInCart,

      clearCart,
      clearCartAndClose,

      isCartOpen,
      openCart,
      closeCart,
      toggleCart,

      subtotal,
      total: subtotal,

      totalItems,
      totalQuantity:
        totalItems,

      uniqueItems,
      hasItems,
    }),
    [
      cartItems,
      isCartOpen,
      subtotal,
      totalItems,
      uniqueItems,
      hasItems,
    ]
  );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider."
    );
  }

  return context;
};