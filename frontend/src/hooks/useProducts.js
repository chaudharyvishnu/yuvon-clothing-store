import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { fetchProducts } from "../services/api";
import { getProductBrand } from "../utils/productHelpers";

function formatApiError(error) {
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
    "Products load nahi ho paaye."
  );
}

function getUniqueBrands(productList) {
  const brandMap = new Map();

  productList.forEach((product) => {
    const slug =
      product?.brand_slug ||
      product?.brand_detail?.slug ||
      product?.brand_details?.slug ||
      product?.brand?.slug;

    const name = getProductBrand(product);

    if (slug && name) {
      brandMap.set(slug, {
        name,
        slug,
      });
    }
  });

  return Array.from(brandMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

function useProducts(params = {}) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalProducts, setTotalProducts] =
    useState(0);

  const [hasNextPage, setHasNextPage] =
    useState(false);

  const [
    hasPreviousPage,
    setHasPreviousPage,
  ] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshCount, setRefreshCount] =
    useState(0);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  /*
   * params object har render par naya ho sakta hai.
   * JSON stringify se unnecessary API calls avoid hongi.
   */
  const paramsKey = JSON.stringify(params);

  const stableParams = useMemo(
    () => JSON.parse(paramsKey),
    [paramsKey]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const response =
        await fetchProducts(stableParams);

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      const productList = Array.isArray(response)
        ? response
        : response?.results || [];

      setProducts(productList);

      setTotalProducts(
        Array.isArray(response)
          ? productList.length
          : Number(
              response?.count ??
                productList.length
            )
      );

      setHasNextPage(
        Boolean(
          !Array.isArray(response) &&
            response?.next
        )
      );

      setHasPreviousPage(
        Boolean(
          !Array.isArray(response) &&
            response?.previous
        )
      );

      setBrands(getUniqueBrands(productList));
    } catch (err) {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      console.error(
        "Products loading error:",
        err
      );

      setError(formatApiError(err));

      setProducts([]);
      setBrands([]);
      setTotalProducts(0);
      setHasNextPage(false);
      setHasPreviousPage(false);
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [stableParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts, refreshCount]);

  const retry = useCallback(() => {
    setRefreshCount(
      (current) => current + 1
    );
  }, []);

  return {
    products,
    brands,
    totalProducts,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    retry,
    reloadProducts: loadProducts,
  };
}

export default useProducts;