import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_PAGE_SIZE = 12;

function getBooleanParam(searchParams, key) {
  return searchParams.get(key) === "true";
}

function useShopFilters(
  searchParams,
  {
    pageSize = DEFAULT_PAGE_SIZE,
    onClearFilters,
  } = {}
) {
  const searchQuery =
    searchParams.get("search") || "";

  const departmentQuery =
    searchParams.get("department") || "";

  const categoryQuery =
    searchParams.get("category") || "";

  const subcategoryQuery =
    searchParams.get("subcategory") || "";

  const brandQuery =
    searchParams.get("brand") || "";

  const featuredQuery = getBooleanParam(
    searchParams,
    "featured"
  );

  const trendingQuery = getBooleanParam(
    searchParams,
    "trending"
  );

  const bestSellerQuery = getBooleanParam(
    searchParams,
    "best_seller"
  );

  const offerQuery = getBooleanParam(
    searchParams,
    "offer"
  );

  const clearanceQuery = getBooleanParam(
    searchParams,
    "clearance"
  );

  const newArrivalQuery = getBooleanParam(
    searchParams,
    "new_arrival"
  );

  const [selectedBrand, setSelectedBrand] =
    useState(brandQuery);

  const [selectedSize, setSelectedSize] =
    useState("");

  const [selectedPrice, setSelectedPrice] =
    useState("");

  const [ordering, setOrdering] =
    useState("newest");

  const [page, setPage] = useState(1);

  useEffect(() => {
    setSelectedBrand(brandQuery);
  }, [brandQuery]);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    departmentQuery,
    categoryQuery,
    subcategoryQuery,
    selectedBrand,
    selectedPrice,
    selectedSize,
    ordering,
    featuredQuery,
    trendingQuery,
    bestSellerQuery,
    offerQuery,
    clearanceQuery,
    newArrivalQuery,
  ]);

  const clearFilters = useCallback(() => {
    setSelectedBrand("");
    setSelectedSize("");
    setSelectedPrice("");
    setOrdering("newest");
    setPage(1);

    onClearFilters?.();
  }, [onClearFilters]);

  const productParams = useMemo(() => {
    const params = {
      page,
      page_size: pageSize,
    };

    if (searchQuery) {
      params.search = searchQuery;
    }

    if (departmentQuery) {
      params.department = departmentQuery;
    }

    if (categoryQuery) {
      params.category = categoryQuery;
    }

    if (subcategoryQuery) {
      params.subcategory =
        subcategoryQuery;
    }

    if (selectedBrand) {
      params.brand = selectedBrand;
    }

    if (featuredQuery) {
      params.featured = "true";
    }

    if (trendingQuery) {
      params.trending = "true";
    }

    if (bestSellerQuery) {
      params.best_seller = "true";
    }

    if (offerQuery) {
      params.offer = "true";
    }

    if (clearanceQuery) {
      params.clearance = "true";
    }

    if (newArrivalQuery) {
      params.new_arrival = "true";
    }

    if (ordering) {
      params.ordering = ordering;
    }

    switch (selectedPrice) {
      case "under-999":
        params.max_price = 999;
        break;

      case "1000-1999":
        params.min_price = 1000;
        params.max_price = 1999;
        break;

      case "2000-4999":
        params.min_price = 2000;
        params.max_price = 4999;
        break;

      case "5000-plus":
        params.min_price = 5000;
        break;

      default:
        break;
    }

    return params;
  }, [
    page,
    pageSize,
    searchQuery,
    departmentQuery,
    categoryQuery,
    subcategoryQuery,
    selectedBrand,
    selectedPrice,
    ordering,
    featuredQuery,
    trendingQuery,
    bestSellerQuery,
    offerQuery,
    clearanceQuery,
    newArrivalQuery,
  ]);

  return {
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
  };
}

export default useShopFilters;