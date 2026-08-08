import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchProductById } from "../services/api";

import {
  getActiveVariants,
  getDiscountPercentage,
  getImageUrl,
  getProductBrand,
  getProductImage,
  getProductSizes,
  getProductStock,
  normalizeProductForCart,
} from "../utils/productHelpers";

export default function useProductDetails(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeImage, setActiveImage] = useState("");

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const [quantity, setQuantity] = useState(1);

  const loadProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetchProductById(id);

      setProduct(response);

      setActiveImage(getProductImage(response));

      const variants = getActiveVariants(response);

      const firstAvailable =
        variants.find((v) => Number(v.stock) > 0) ||
        variants[0];

      if (firstAvailable) {
        setSelectedColor(firstAvailable.color || "");
        setSelectedSize(firstAvailable.size || "");
      } else {
        const firstColor = response.available_colors?.[0];

        setSelectedColor(
          typeof firstColor === "string"
            ? firstColor
            : firstColor?.name || ""
        );

        setSelectedSize(
          response.available_sizes?.[0] || ""
        );
      }

      setQuantity(1);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Product details load nahi ho paayi."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const activeVariants = useMemo(
    () => getActiveVariants(product),
    [product]
  );

  const hasVariants = activeVariants.length > 0;

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const images = [];

    const mainImage =
      product.main_image_url ||
      product.main_image;

    if (mainImage) {
      images.push({
        id: "main",
        image: getImageUrl(mainImage),
        alt: product.name,
      });
    }

    (product.images || []).forEach((item, index) => {
      const image =
        item.image_url || item.image;

      if (
        image &&
        !images.some((img) => img.image === image)
      ) {
        images.push({
          id: item.id || `gallery-${index}`,
          image: getImageUrl(image),
          alt:
            item.alt_text ||
            item.alt ||
            product.name,
        });
      }
    });

    return images;
  }, [product]);

  const availableColors = useMemo(() => {
    const map = new Map();

    activeVariants.forEach((variant) => {
      const name = variant.color?.trim();

      if (!name) return;

      const key = name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name,
          code:
            variant.color_code ||
            "#111827",
          hasStock:
            Number(variant.stock) > 0,
        });
      }
    });

    return Array.from(map.values());
  }, [activeVariants]);

  const colorVariants = useMemo(() => {
    if (!hasVariants) return [];

    if (!selectedColor)
      return activeVariants;

    return activeVariants.filter(
      (v) => v.color === selectedColor
    );
  }, [
    activeVariants,
    hasVariants,
    selectedColor,
  ]);

  const availableSizes = useMemo(() => {
    if (!product) return [];

    if (!hasVariants)
      return getProductSizes(product);

    return [
      ...new Set(
        colorVariants
          .map((v) => v.size)
          .filter(Boolean)
      ),
    ];
  }, [
    product,
    hasVariants,
    colorVariants,
  ]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    return (
      activeVariants.find(
        (variant) =>
          variant.color ===
            selectedColor &&
          variant.size === selectedSize
      ) || null
    );
  }, [
    activeVariants,
    hasVariants,
    selectedColor,
    selectedSize,
  ]);

  const currentStock = hasVariants
    ? Number(selectedVariant?.stock || 0)
    : getProductStock(product);

  const isAvailable = hasVariants
    ? Boolean(
        selectedVariant &&
          currentStock > 0
      )
    : getProductStock(product) > 0;

  const maximumQuantity = hasVariants
    ? Math.max(currentStock, 1)
    : getProductStock(product);

  const brandName =
    getProductBrand(product);

  const discountPercentage =
    getDiscountPercentage(product);

  const normalizedProduct =
    useMemo(() => {
      if (!product) return null;

      return {
        ...normalizeProductForCart(
          product
        ),
        quantity,
        size: selectedSize,
        color: selectedColor,
        stock: currentStock,
      };
    }, [
      product,
      quantity,
      selectedColor,
      selectedSize,
      currentStock,
    ]);

  const handleColorSelect = (color) => {
    if (!color.hasStock) return;

    setSelectedColor(color.name);

    const first =
      activeVariants.find(
        (variant) =>
          variant.color === color.name &&
          Number(variant.stock) > 0
      );

    setSelectedSize(first?.size || "");
    setQuantity(1);
  };

  return {
    loading,
    error,
    product,

    activeImage,
    setActiveImage,

    quantity,
    setQuantity,

    selectedColor,
    setSelectedColor,

    selectedSize,
    setSelectedSize,

    activeVariants,
    hasVariants,

    galleryImages,
    availableColors,
    availableSizes,

    colorVariants,
    selectedVariant,

    currentStock,
    maximumQuantity,
    isAvailable,

    brandName,
    discountPercentage,

    normalizedProduct,

    handleColorSelect,

    loadProduct,
  };
}