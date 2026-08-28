import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  deleteAdminProduct,
  fetchAdminProducts,
} from "../../services/api";

import "../../styles/dashboard.css";


// =========================================================
// Environment / Backend URL
// =========================================================

const BACKEND_BASE_URL =
  (
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  )
    .trim()
    .replace(/\/+$/, "");


// =========================================================
// Constants
// =========================================================

const DEFAULT_FILTERS = {
  search: "",
  is_active: "",
  ordering: "-created_at",
};


const STATUS_OPTIONS = [
  {
    value: "",
    label: "All Products",
  },
  {
    value: "true",
    label: "Active",
  },
  {
    value: "false",
    label: "Inactive",
  },
];


const ORDERING_OPTIONS = [
  {
    value: "-created_at",
    label: "Newest First",
  },
  {
    value: "created_at",
    label: "Oldest First",
  },
  {
    value: "name",
    label: "Name A-Z",
  },
  {
    value: "-name",
    label: "Name Z-A",
  },
  {
    value: "price",
    label: "Price Low to High",
  },
  {
    value: "-price",
    label: "Price High to Low",
  },
];


// =========================================================
// Formatting Helpers
// =========================================================

const formatCurrency = (
  value
) => {
  const amount =
    Number(
      value || 0
    );

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    amount
  );
};


const formatDateTime = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};


// =========================================================
// Media URL Helper
// =========================================================

const getMediaUrl = (
  value
) => {
  if (!value) {
    return "";
  }

  const url =
    String(
      value
    ).trim();

  if (!url) {
    return "";
  }


  // Already absolute URL
  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }


  // Protocol-relative URL
  if (
    url.startsWith("//")
  ) {
    return `${window.location.protocol}${url}`;
  }


  // Django media URL:
  // /media/products/main/image.jpeg
  if (
    url.startsWith("/media/")
  ) {
    return (
      `${BACKEND_BASE_URL}${url}`
    );
  }


  // Django media URL without first slash:
  // media/products/main/image.jpeg
  if (
    url.startsWith("media/")
  ) {
    return (
      `${BACKEND_BASE_URL}/${url}`
    );
  }


  // Common ImageField value:
  // products/main/image.jpeg
  if (
    url.startsWith("products/")
  ) {
    return (
      `${BACKEND_BASE_URL}/media/${url}`
    );
  }


  // Other root-relative backend URLs
  if (
    url.startsWith("/")
  ) {
    return (
      `${BACKEND_BASE_URL}${url}`
    );
  }


  return url;
};


// =========================================================
// Product Helpers
// =========================================================

const getProductPrice = (
  product
) => {
  return (
    product?.price ??
    product?.selling_price ??
    product?.base_price ??
    0
  );
};


const getOldPrice = (
  product
) => {
  return (
    product?.old_price ??
    product?.mrp ??
    null
  );
};


const getVariants = (
  product
) => {
  return Array.isArray(
    product?.variants
  )
    ? product.variants
    : [];
};


const getTotalStock = (
  product
) => {
  if (
    product?.total_stock !==
      undefined &&
    product?.total_stock !==
      null
  ) {
    return Number(
      product.total_stock
    );
  }


  const variants =
    getVariants(
      product
    );


  if (
    variants.length
  ) {
    return variants.reduce(
      (
        total,
        variant
      ) =>
        total +
        Number(
          variant?.stock ||
          0
        ),
      0
    );
  }


  return Number(
    product?.stock ||
    0
  );
};


const getActiveVariantCount = (
  product
) => {
  return getVariants(
    product
  ).filter(
    (
      variant
    ) =>
      variant?.is_active !==
      false
  ).length;
};


// =========================================================
// Primary Image Helper
// =========================================================

const getPrimaryImage = (
  product
) => {
  if (!product) {
    return "";
  }


  const directImage =
    product?.main_image_url ||
    product?.main_image ||
    product?.primary_image_url ||
    product?.primary_image ||
    product?.image_url ||
    product?.image ||
    "";


  if (
    directImage
  ) {
    return getMediaUrl(
      directImage
    );
  }


  if (
    Array.isArray(
      product?.images
    ) &&
    product.images.length
  ) {
    const primary =
      product.images.find(
        (
          image
        ) =>
          image?.is_primary ===
          true
      );


    const imageValue =
      primary?.image_url ||
      primary?.image ||
      primary?.url ||
      product.images[0]?.image_url ||
      product.images[0]?.image ||
      product.images[0]?.url ||
      "";


    return getMediaUrl(
      imageValue
    );
  }


  return "";
};


const getBrandName = (
  product
) => {
  return (
    product?.brand_name ||
    product?.brand?.name ||
    ""
  );
};


const getCategoryName = (
  product
) => {
  return (
    product?.category_name ||
    product?.category?.name ||
    "-"
  );
};


const getSubCategoryName = (
  product
) => {
  return (
    product?.subcategory_name ||
    product?.subcategory?.name ||
    ""
  );
};


// =========================================================
// Response Normalizer
// =========================================================

const normalizeProductResponse = (
  response
) => {
  if (
    Array.isArray(
      response
    )
  ) {
    return {
      results:
        response,

      count:
        response.length,

      next:
        null,

      previous:
        null,
    };
  }


  const results =
    Array.isArray(
      response?.results
    )
      ? response.results
      : [];


  return {
    results,

    count:
      Number(
        response?.count ??
        results.length
      ),

    next:
      response?.next ||
      null,

    previous:
      response?.previous ||
      null,
  };
};


// =========================================================
// Product Image Component
// =========================================================

const ProductThumbnail = ({
  src,
  alt,
}) => {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);


  useEffect(
    () => {
      setImageFailed(
        false
      );
    },
    [
      src,
    ]
  );


  if (
    !src ||
    imageFailed
  ) {
    return (
      <div
        style={{
          width:
            "52px",

          height:
            "52px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          border:
            "1px solid #e5e7eb",

          borderRadius:
            "8px",

          fontSize:
            "10px",

          color:
            "#6b7280",

          background:
            "#f8fafc",

          textAlign:
            "center",

          flexShrink:
            0,
        }}
      >
        No Image
      </div>
    );
  }


  return (
    <img
      src={
        src
      }
      alt={
        alt
      }
      loading="lazy"
      onError={
        () =>
          setImageFailed(
            true
          )
      }
      style={{
        width:
          "52px",

        height:
          "52px",

        objectFit:
          "cover",

        borderRadius:
          "8px",

        border:
          "1px solid #e5e7eb",

        background:
          "#f8fafc",

        flexShrink:
          0,
      }}
    />
  );
};


// =========================================================
// Component
// =========================================================

const AdminProducts = () => {

  // =======================================================
  // Filters
  // =======================================================

  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );


  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(
    DEFAULT_FILTERS
  );


  // =======================================================
  // Products
  // =======================================================

  const [
    products,
    setProducts,
  ] = useState([]);


  const [
    count,
    setCount,
  ] = useState(0);


  // =======================================================
  // Pagination
  // =======================================================

  const [
    page,
    setPage,
  ] = useState(1);


  const [
    pageSize,
    setPageSize,
  ] = useState(25);


  const [
    hasNext,
    setHasNext,
  ] = useState(false);


  const [
    hasPrevious,
    setHasPrevious,
  ] = useState(false);


  // =======================================================
  // UI State
  // =======================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    deletingId,
    setDeletingId,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  // =======================================================
  // Pagination Calculations
  // =======================================================

  const totalPages =
    useMemo(
      () => {
        if (!count) {
          return 1;
        }


        return Math.max(
          1,
          Math.ceil(
            count /
            pageSize
          )
        );
      },
      [
        count,
        pageSize,
      ]
    );


  const firstResult =
    count === 0
      ? 0
      : (
          (
            page - 1
          ) *
          pageSize
        ) + 1;


  const lastResult =
    Math.min(
      page *
      pageSize,
      count
    );


  // =======================================================
  // Load Products
  // =======================================================

  const loadProducts =
    useCallback(
      async () => {
        setLoading(
          true
        );


        setError(
          ""
        );


        try {
          const response =
            await fetchAdminProducts({
              ...appliedFilters,

              page,

              page_size:
                pageSize,
            });


          const normalized =
            normalizeProductResponse(
              response
            );


          setProducts(
            normalized.results
          );


          setCount(
            normalized.count
          );


          setHasNext(
            Boolean(
              normalized.next
            )
          );


          setHasPrevious(
            Boolean(
              normalized.previous
            )
          );
        } catch (
          requestError
        ) {
          setProducts(
            []
          );


          setCount(
            0
          );


          setHasNext(
            false
          );


          setHasPrevious(
            false
          );


          setError(
            requestError?.message ||
            "Unable to load admin products."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        appliedFilters,
        page,
        pageSize,
      ]
    );


  useEffect(
    () => {
      loadProducts();
    },
    [
      loadProducts,
    ]
  );


  // =======================================================
  // Filters
  // =======================================================

  const handleFilterChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;


      setFilters(
        (
          current
        ) => ({
          ...current,

          [name]:
            value,
        })
      );
    };


  const handleApplyFilters =
    (
      event
    ) => {
      event.preventDefault();


      setPage(
        1
      );


      setAppliedFilters({
        ...filters,
      });
    };


  const handleResetFilters =
    () => {
      setFilters({
        ...DEFAULT_FILTERS,
      });


      setAppliedFilters({
        ...DEFAULT_FILTERS,
      });


      setPage(
        1
      );
    };


  // =======================================================
  // Page Size
  // =======================================================

  const handlePageSizeChange =
    (
      event
    ) => {
      const nextPageSize =
        Number(
          event.target.value
        );


      setPageSize(
        nextPageSize
      );


      setPage(
        1
      );
    };


  // =======================================================
  // Delete Product
  // =======================================================

  const handleDeleteProduct =
    async (
      product
    ) => {
      const productName =
        product?.name ||
        product?.title ||
        product?.sku ||
        product?.id;


      const confirmed =
        window.confirm(
          `Delete product "${productName}"?\n\nThis may also remove related variants and gallery images.`
        );


      if (
        !confirmed
      ) {
        return;
      }


      setDeletingId(
        product.id
      );


      setError(
        ""
      );


      setSuccessMessage(
        ""
      );


      try {
        await deleteAdminProduct(
          product.id
        );


        setSuccessMessage(
          "Product deleted successfully."
        );


        if (
          products.length === 1 &&
          page > 1
        ) {
          setPage(
            (
              currentPage
            ) =>
              Math.max(
                1,
                currentPage - 1
              )
          );

          return;
        }


        await loadProducts();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Unable to delete product."
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };


  // =======================================================
  // Render
  // =======================================================

  return (
    <main className="admin-dashboard-page">

      {/* =================================================
          Header
      ================================================= */}

      <section className="dashboard-header">

        <div>

          <p className="dashboard-eyebrow">
            Yuvon Admin
          </p>


          <h1>
            Products
          </h1>


          <p className="dashboard-subtitle">
            Manage products, pricing,
            variants, inventory,
            images and bulk uploads.
          </p>


          {
            loading && (
              <p className="dashboard-loading-text">
                Loading products...
              </p>
            )
          }

        </div>


        <div className="dashboard-header-actions">

          <Link
            to="/admin/dashboard"
            className="dashboard-button dashboard-button-secondary"
          >
            Dashboard
          </Link>


          <Link
            to="/admin/products/bulk-upload"
            className="dashboard-button dashboard-button-secondary"
          >
            Bulk Upload
          </Link>


          <Link
            to="/admin/products/new"
            className="dashboard-button dashboard-button-primary"
          >
            Add Product
          </Link>


          <button
            type="button"
            className="dashboard-button dashboard-button-secondary"
            onClick={
              loadProducts
            }
            disabled={
              loading
            }
          >
            {
              loading
                ? "Refreshing..."
                : "Refresh"
            }
          </button>

        </div>

      </section>


      {/* =================================================
          Messages
      ================================================= */}

      {
        error && (
          <section className="dashboard-error">
            {error}
          </section>
        )
      }


      {
        successMessage && (
          <section
            className="dashboard-panel"
            style={{
              border:
                "1px solid #86efac",
            }}
          >
            {successMessage}
          </section>
        )
      }


      {/* =================================================
          Filters
      ================================================= */}

      <section className="dashboard-filter-card">

        <form
          className="admin-orders-filter-form"
          onSubmit={
            handleApplyFilters
          }
        >

          <div className="dashboard-filter-field">

            <label htmlFor="admin-product-search">
              Search
            </label>


            <input
              id="admin-product-search"
              name="search"
              type="search"
              placeholder="Product name, SKU, slug or brand..."
              value={
                filters.search
              }
              onChange={
                handleFilterChange
              }
            />

          </div>


          <div className="dashboard-filter-field">

            <label htmlFor="admin-product-status">
              Status
            </label>


            <select
              id="admin-product-status"
              name="is_active"
              value={
                filters.is_active
              }
              onChange={
                handleFilterChange
              }
            >

              {
                STATUS_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option.value ||
                        "all"
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )
              }

            </select>

          </div>


          <div className="dashboard-filter-field">

            <label htmlFor="admin-product-ordering">
              Sort By
            </label>


            <select
              id="admin-product-ordering"
              name="ordering"
              value={
                filters.ordering
              }
              onChange={
                handleFilterChange
              }
            >

              {
                ORDERING_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )
              }

            </select>

          </div>


          <div className="dashboard-filter-actions">

            <button
              type="submit"
              className="dashboard-button dashboard-button-primary"
              disabled={
                loading
              }
            >
              Apply Filters
            </button>


            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                handleResetFilters
              }
              disabled={
                loading
              }
            >
              Reset
            </button>

          </div>

        </form>

      </section>


      {/* =================================================
          Product List
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                All Products
              </h2>


              <p>
                {
                  count
                    ? (
                        `Showing ${firstResult}-${lastResult} of ${count} products`
                      )
                    : (
                        "No products found"
                      )
                }
              </p>

            </div>


            <div className="admin-orders-page-size">

              <label htmlFor="admin-products-page-size">
                Per page
              </label>


              <select
                id="admin-products-page-size"
                value={
                  pageSize
                }
                onChange={
                  handlePageSizeChange
                }
                disabled={
                  loading
                }
              >

                <option value="10">
                  10
                </option>

                <option value="25">
                  25
                </option>

                <option value="50">
                  50
                </option>

                <option value="100">
                  100
                </option>

              </select>

            </div>

          </div>


          {/* =============================================
              Table
          ============================================= */}

          <div className="dashboard-table-wrap">

            <table className="dashboard-table admin-products-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Variants
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  loading ? (

                    <tr>

                      <td
                        colSpan="9"
                        className="admin-orders-empty-cell"
                      >
                        Loading products...
                      </td>

                    </tr>

                  ) : products.length ? (

                    products.map(
                      (
                        product
                      ) => {

                        const productName =
                          product?.name ||
                          product?.title ||
                          "Unnamed Product";


                        const imageUrl =
                          getPrimaryImage(
                            product
                          );


                        const variants =
                          getVariants(
                            product
                          );


                        const totalStock =
                          getTotalStock(
                            product
                          );


                        const oldPrice =
                          getOldPrice(
                            product
                          );


                        const currentPrice =
                          getProductPrice(
                            product
                          );


                        const brandName =
                          getBrandName(
                            product
                          );


                        const categoryName =
                          getCategoryName(
                            product
                          );


                        const subCategoryName =
                          getSubCategoryName(
                            product
                          );


                        return (
                          <tr
                            key={
                              product.id
                            }
                          >

                            {/* Product */}

                            <td>

                              <div
                                style={{
                                  display:
                                    "flex",

                                  alignItems:
                                    "center",

                                  gap:
                                    "10px",

                                  minWidth:
                                    "240px",
                                }}
                              >

                                <ProductThumbnail
                                  src={
                                    imageUrl
                                  }
                                  alt={
                                    productName
                                  }
                                />


                                <div>

                                  <strong>
                                    {
                                      productName
                                    }
                                  </strong>


                                  <small className="dashboard-table-subtext">
                                    ID:{" "}
                                    {
                                      product.id
                                    }
                                  </small>


                                  {
                                    brandName && (
                                      <small className="dashboard-table-subtext">
                                        {
                                          brandName
                                        }
                                      </small>
                                    )
                                  }

                                </div>

                              </div>

                            </td>


                            {/* SKU */}

                            <td>

                              <strong>
                                {
                                  product?.sku ||
                                  "-"
                                }
                              </strong>

                            </td>


                            {/* Category */}

                            <td>

                              <strong>
                                {
                                  categoryName
                                }
                              </strong>


                              {
                                subCategoryName && (
                                  <small className="dashboard-table-subtext">
                                    {
                                      subCategoryName
                                    }
                                  </small>
                                )
                              }

                            </td>


                            {/* Price */}

                            <td>

                              <strong>
                                {
                                  formatCurrency(
                                    currentPrice
                                  )
                                }
                              </strong>


                              {
                                oldPrice &&
                                Number(
                                  oldPrice
                                ) >
                                Number(
                                  currentPrice
                                ) && (

                                  <small className="dashboard-table-subtext">
                                    MRP{" "}
                                    {
                                      formatCurrency(
                                        oldPrice
                                      )
                                    }
                                  </small>

                                )
                              }

                            </td>


                            {/* Variants */}

                            <td>

                              <strong>
                                {
                                  variants.length
                                }
                              </strong>


                              {
                                variants.length > 0 && (
                                  <small className="dashboard-table-subtext">
                                    {
                                      getActiveVariantCount(
                                        product
                                      )
                                    }{" "}
                                    active
                                  </small>
                                )
                              }

                            </td>


                            {/* Stock */}

                            <td>

                              <strong>
                                {
                                  totalStock
                                }
                              </strong>


                              {
                                totalStock <= 0 ? (

                                  <small className="dashboard-table-subtext">
                                    Out of stock
                                  </small>

                                ) : totalStock <= 5 ? (

                                  <small className="dashboard-table-subtext">
                                    Low stock
                                  </small>

                                ) : (

                                  <small className="dashboard-table-subtext">
                                    In stock
                                  </small>

                                )
                              }

                            </td>


                            {/* Status */}

                            <td>

                              <span
                                className={
                                  [
                                    "admin-orders-badge",

                                    product
                                      ?.is_active
                                      ? "admin-orders-badge-delivered"
                                      : "admin-orders-badge-cancelled",
                                  ].join(
                                    " "
                                  )
                                }
                              >
                                {
                                  product?.is_active
                                    ? "Active"
                                    : "Inactive"
                                }
                              </span>

                            </td>


                            {/* Created */}

                            <td>

                              {
                                formatDateTime(
                                  product?.created_at
                                )
                              }

                            </td>


                            {/* Actions */}

                            <td>

                              <div
                                style={{
                                  display:
                                    "flex",

                                  flexWrap:
                                    "wrap",

                                  gap:
                                    "6px",
                                }}
                              >

                                <Link
                                  to={`/admin/products/${encodeURIComponent(
                                    product.id
                                  )}`}
                                  className="dashboard-button dashboard-button-secondary admin-orders-view-button"
                                >
                                  Edit
                                </Link>


                                <Link
                                  to={`/product/${encodeURIComponent(
                                    product.id
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="dashboard-button dashboard-button-secondary admin-orders-view-button"
                                >
                                  View
                                </Link>


                                <button
                                  type="button"
                                  className="dashboard-button dashboard-button-secondary admin-orders-view-button"
                                  onClick={
                                    () =>
                                      handleDeleteProduct(
                                        product
                                      )
                                  }
                                  disabled={
                                    deletingId ===
                                    product.id
                                  }
                                >
                                  {
                                    deletingId ===
                                    product.id
                                      ? "Deleting..."
                                      : "Delete"
                                  }
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="9"
                        className="admin-orders-empty-cell"
                      >
                        No products match the selected filters.
                      </td>

                    </tr>

                  )
                }

              </tbody>

            </table>

          </div>


          {/* =============================================
              Pagination
          ============================================= */}

          <div className="admin-orders-pagination">

            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                () =>
                  setPage(
                    (
                      currentPage
                    ) =>
                      Math.max(
                        1,
                        currentPage - 1
                      )
                  )
              }
              disabled={
                loading ||
                !hasPrevious ||
                page <= 1
              }
            >
              Previous
            </button>


            <span>
              Page{" "}

              <strong>
                {
                  page
                }
              </strong>{" "}

              of{" "}

              <strong>
                {
                  totalPages
                }
              </strong>
            </span>


            <button
              type="button"
              className="dashboard-button dashboard-button-secondary"
              onClick={
                () =>
                  setPage(
                    (
                      currentPage
                    ) =>
                      Math.min(
                        totalPages,
                        currentPage + 1
                      )
                  )
              }
              disabled={
                loading ||
                !hasNext ||
                page >=
                  totalPages
              }
            >
              Next
            </button>

          </div>

        </article>

      </section>

    </main>
  );
};


export default AdminProducts;