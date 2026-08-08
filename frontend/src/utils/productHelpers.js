const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export const FALLBACK_IMAGE =
  "https://placehold.co/600x800?text=No+Image";

export function getImageUrl(image) {
  if (!image) {
    return FALLBACK_IMAGE;
  }

  const imageValue = String(image);

  if (
    imageValue.startsWith("http://") ||
    imageValue.startsWith("https://") ||
    imageValue.startsWith("data:") ||
    imageValue.startsWith("blob:")
  ) {
    return imageValue;
  }

  const normalizedPath = imageValue.startsWith("/")
    ? imageValue
    : `/${imageValue}`;

  return `${BACKEND_URL}${normalizedPath}`;
}

export function getProductImage(product) {
  return getImageUrl(
    product?.main_image_url ||
      product?.main_image ||
      product?.image_url ||
      product?.image ||
      product?.images?.[0]?.image_url ||
      product?.images?.[0]?.image ||
      ""
  );
}

export function getProductBrand(product) {
  return (
    product?.brand_name ||
    product?.brand_detail?.name ||
    product?.brand_details?.name ||
    product?.brand?.name ||
    "Yuvon Design Hub"
  );
}

export function getActiveVariants(product) {
  return (product?.variants || []).filter(
    (variant) => variant?.is_active !== false
  );
}

export function getProductSizes(product) {
  const sizes = new Set();

  (product?.available_sizes || []).forEach((size) => {
    if (size) {
      sizes.add(String(size).trim());
    }
  });

  getActiveVariants(product).forEach((variant) => {
    if (variant?.size) {
      sizes.add(String(variant.size).trim());
    }
  });

  return Array.from(sizes);
}

export function getProductStock(product) {
  const variants = getActiveVariants(product);

  if (variants.length > 0) {
    return variants.reduce((total, variant) => {
      const variantStock = Number(variant?.stock ?? 0);

      return (
        total +
        (Number.isFinite(variantStock)
          ? Math.max(variantStock, 0)
          : 0)
      );
    }, 0);
  }

  const stockValue = Number(
    product?.total_stock ??
      product?.stock ??
      product?.stock_quantity ??
      0
  );

  return Number.isFinite(stockValue)
    ? Math.max(stockValue, 0)
    : 0;
}

export function isProductInStock(product) {
  if (!product) {
    return false;
  }

  if (product?.is_in_stock === false) {
    return false;
  }

  const stock = getProductStock(product);

  if (stock > 0) {
    return true;
  }

  return (
    product?.is_in_stock === true &&
    getActiveVariants(product).length === 0
  );
}

export function getDiscountPercentage(product) {
  const backendDiscount = Number(
    product?.discount_percentage ?? 0
  );

  if (
    Number.isFinite(backendDiscount) &&
    backendDiscount > 0
  ) {
    return Math.round(backendDiscount);
  }

  const price = Number(product?.price ?? 0);
  const oldPrice = Number(product?.old_price ?? 0);

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(oldPrice) ||
    price <= 0 ||
    oldPrice <= price
  ) {
    return 0;
  }

  return Math.round(
    ((oldPrice - price) / oldPrice) * 100
  );
}

export function normalizeProductForCart(product) {
  if (!product) {
    return null;
  }

  const image = getProductImage(product);
  const brand = getProductBrand(product);
  const stock = getProductStock(product);
  const inStock = isProductInStock(product);
  const availableSizes = getProductSizes(product);
  const discountPercentage =
    getDiscountPercentage(product);

  const priceValue = Number(product?.price ?? 0);

  const oldPriceValue =
    product?.old_price != null
      ? Number(product.old_price)
      : product?.oldPrice != null
        ? Number(product.oldPrice)
        : null;

  const quantityValue = Number(
    product?.quantity ?? 1
  );

  const price = Number.isFinite(priceValue)
    ? priceValue
    : 0;

  const oldPrice =
    oldPriceValue != null &&
    Number.isFinite(oldPriceValue)
      ? oldPriceValue
      : null;

  const quantity =
    Number.isFinite(quantityValue) &&
    quantityValue > 0
      ? quantityValue
      : 1;

  return {
    ...product,

    id: product.id,
    productId: product.id,
    product_id: product.id,

    name: product.name,
    product_name: product.name,

    brand,
    brand_name: brand,

    image,
    image_url: image,
    main_image: image,
    main_image_url: image,

    price,

    oldPrice,
    old_price: oldPrice,

    quantity,

    stock,
    total_stock: stock,
    stock_quantity: stock,

    isInStock: inStock,
    in_stock: inStock,
    is_in_stock: inStock,

    available_sizes: availableSizes,

    discountPercentage,
    discount_percentage: discountPercentage,
  };
}