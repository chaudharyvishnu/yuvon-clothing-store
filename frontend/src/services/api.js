const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";


const API_BASE_URL =
  String(
    RAW_API_BASE_URL
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );


const ACCESS_TOKEN_KEY =
  "yuvon_access_token";

const REFRESH_TOKEN_KEY =
  "yuvon_refresh_token";

const USER_DATA_KEY =
  "yuvon_user";


// =========================================================
// Local Storage Helpers
// =========================================================

function getAccessToken() {
  return (
    localStorage.getItem(
      ACCESS_TOKEN_KEY
    ) ||
    localStorage.getItem(
      "access_token"
    ) ||
    localStorage.getItem(
      "access"
    ) ||
    localStorage.getItem(
      "token"
    ) ||
    ""
  );
}


function getRefreshToken() {
  return (
    localStorage.getItem(
      REFRESH_TOKEN_KEY
    ) ||
    localStorage.getItem(
      "refresh_token"
    ) ||
    localStorage.getItem(
      "refresh"
    ) ||
    ""
  );
}


function saveAccessToken(
  token
) {
  if (!token) {
    return;
  }

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    token
  );

  localStorage.setItem(
    "access",
    token
  );
}


function saveRefreshToken(
  token
) {
  if (!token) {
    return;
  }

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    token
  );

  localStorage.setItem(
    "refresh",
    token
  );
}


function clearStoredAuthentication() {
  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );

  localStorage.removeItem(
    USER_DATA_KEY
  );

  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "refresh_token"
  );

  localStorage.removeItem(
    "access"
  );

  localStorage.removeItem(
    "refresh"
  );

  localStorage.removeItem(
    "token"
  );
}


// =========================================================
// URL Helpers
// =========================================================

function buildApiUrl(
  endpoint = ""
) {
  const endpointString =
    String(
      endpoint || ""
    );

  const cleanEndpoint =
    endpointString.startsWith("/")
      ? endpointString
      : `/${endpointString}`;

  return (
    `${API_BASE_URL}${cleanEndpoint}`
  );
}


function createQueryString(
  params = {}
) {
  const cleanParams =
    Object.fromEntries(
      Object.entries(
        params || {}
      ).filter(
        (
          [
            ,
            value,
          ]
        ) =>
          value !==
            undefined &&
          value !==
            null &&
          value !==
            ""
      )
    );

  return new URLSearchParams(
    cleanParams
  ).toString();
}


// =========================================================
// Common Validation Helper
// =========================================================

function requireValue(
  value,
  message
) {
  if (
    value === undefined ||
    value === null ||
    String(
      value
    ).trim() === ""
  ) {
    throw new Error(
      message
    );
  }
}


// =========================================================
// Response Helpers
// =========================================================

async function parseResponse(
  response
) {
  if (
    response.status ===
    204
  ) {
    return {};
  }


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return response
      .json()
      .catch(
        () => ({})
      );
  }


  const text =
    await response
      .text()
      .catch(
        () => ""
      );


  return text
    ? {
        detail:
          text,
      }
    : {};
}


function createApiError(
  response,
  data
) {
  let message =
    data?.detail ||
    data?.message ||
    `API Error: ${response.status}`;


  if (
    Array.isArray(
      message
    )
  ) {
    message =
      message.join(
        " "
      );
  }


  if (
    typeof message ===
    "object"
  ) {
    message =
      JSON.stringify(
        message
      );
  }


  const error =
    new Error(
      String(
        message
      )
    );


  error.status =
    response.status;

  error.data =
    data;


  return error;
}


// =========================================================
// Refresh Token Request
// =========================================================

async function requestNewAccessToken() {
  const refreshToken =
    getRefreshToken();


  if (
    !refreshToken
  ) {
    throw new Error(
      "Refresh token is not available."
    );
  }


  const response =
    await fetch(
      buildApiUrl(
        "/accounts/token/refresh/"
      ),
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            refresh:
              refreshToken,
          }),
      }
    );


  const data =
    await parseResponse(
      response
    );


  if (
    !response.ok
  ) {
    clearStoredAuthentication();

    throw createApiError(
      response,
      data
    );
  }


  if (
    !data?.access
  ) {
    clearStoredAuthentication();

    throw new Error(
      "New access token was not returned."
    );
  }


  saveAccessToken(
    data.access
  );


  if (
    data?.refresh
  ) {
    saveRefreshToken(
      data.refresh
    );
  }


  return data.access;
}


// =========================================================
// Common API Request
// =========================================================

async function apiRequest(
  endpoint,
  options = {},
  allowRefresh = true
) {
  const token =
    getAccessToken();


  const isFormData =
    typeof FormData !==
      "undefined" &&
    options.body instanceof
      FormData;


  const headers = {
    ...(
      isFormData
        ? {}
        : {
            "Content-Type":
              "application/json",
          }
    ),

    ...(
      token
        ? {
            Authorization:
              `Bearer ${token}`,
          }
        : {}
    ),

    ...(
      options.headers ||
      {}
    ),
  };


  /*
   * Important:
   *
   * Never manually set
   * multipart/form-data for FormData.
   *
   * Browser automatically adds
   * the correct multipart boundary.
   */
  if (
    isFormData &&
    headers[
      "Content-Type"
    ]
  ) {
    delete headers[
      "Content-Type"
    ];
  }


  const response =
    await fetch(
      buildApiUrl(
        endpoint
      ),
      {
        ...options,

        headers,
      }
    );


  const data =
    await parseResponse(
      response
    );


  if (
    response.status ===
      401 &&
    allowRefresh &&
    getRefreshToken() &&
    endpoint !==
      "/accounts/token/refresh/"
  ) {
    try {
      const newAccessToken =
        await requestNewAccessToken();


      return apiRequest(
        endpoint,
        {
          ...options,

          headers: {
            ...(
              options.headers ||
              {}
            ),

            Authorization:
              `Bearer ${newAccessToken}`,
          },
        },
        false
      );
    } catch (
      refreshError
    ) {
      clearStoredAuthentication();

      throw refreshError;
    }
  }


  if (
    !response.ok
  ) {
    throw createApiError(
      response,
      data
    );
  }


  return data;
}


// =========================================================
// FormData Helpers
// =========================================================

function isFileValue(
  value
) {
  return (
    typeof File !==
      "undefined" &&
    value instanceof
      File
  );
}


function isBlobValue(
  value
) {
  return (
    typeof Blob !==
      "undefined" &&
    value instanceof
      Blob
  );
}


function appendFormDataValue(
  formData,
  key,
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }


  if (
    Array.isArray(
      value
    )
  ) {
    value.forEach(
      (
        item
      ) => {
        if (
          item === undefined ||
          item === null
        ) {
          return;
        }


        if (
          typeof item ===
            "object" &&
          !isFileValue(
            item
          ) &&
          !isBlobValue(
            item
          )
        ) {
          formData.append(
            key,
            JSON.stringify(
              item
            )
          );

          return;
        }


        formData.append(
          key,
          item
        );
      }
    );

    return;
  }


  if (
    typeof value ===
      "boolean"
  ) {
    formData.append(
      key,
      value
        ? "true"
        : "false"
    );

    return;
  }


  if (
    typeof value ===
      "object" &&
    !isFileValue(
      value
    ) &&
    !isBlobValue(
      value
    )
  ) {
    formData.append(
      key,
      JSON.stringify(
        value
      )
    );

    return;
  }


  formData.append(
    key,
    value
  );
}


function createFormDataFromObject(
  payload = {}
) {
  if (
    typeof FormData !==
      "undefined" &&
    payload instanceof
      FormData
  ) {
    return payload;
  }


  const formData =
    new FormData();


  Object.entries(
    payload || {}
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {
      appendFormDataValue(
        formData,
        key,
        value
      );
    }
  );


  return formData;
}


// =========================================================
// API Body Helper
// =========================================================

function createApiBody(
  payload
) {
  if (
    typeof FormData !==
      "undefined" &&
    payload instanceof
      FormData
  ) {
    return payload;
  }


  return JSON.stringify(
    payload
  );
}


// =========================================================
// Authentication
// =========================================================

export async function registerUser(
  payload
) {
  return apiRequest(
    "/accounts/register/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function loginUser({
  username,
  password,
}) {
  return apiRequest(
    "/accounts/login/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          username,
          password,
        }),
    }
  );
}


export async function refreshAccessToken(
  refreshToken =
    getRefreshToken()
) {
  if (
    !refreshToken
  ) {
    throw new Error(
      "Refresh token is not available."
    );
  }


  return apiRequest(
    "/accounts/token/refresh/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          refresh:
            refreshToken,
        }),
    },
    false
  );
}


export async function logoutUser(
  refreshToken =
    getRefreshToken()
) {
  if (
    !refreshToken
  ) {
    clearStoredAuthentication();

    return {
      message:
        "Local logout completed.",
    };
  }


  try {
    return await apiRequest(
      "/accounts/logout/",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            refresh:
              refreshToken,
          }),
      },
      false
    );
  } finally {
    clearStoredAuthentication();
  }
}


export async function fetchProfile() {
  return apiRequest(
    "/accounts/profile/"
  );
}


export async function updateProfile(
  profileData
) {
  const hasImage =
    typeof File !==
      "undefined" &&
    profileData
      ?.profile_image instanceof
    File;


  if (
    hasImage
  ) {
    const formData =
      createFormDataFromObject(
        profileData
      );


    return apiRequest(
      "/accounts/profile/update/",
      {
        method:
          "PATCH",

        body:
          formData,
      }
    );
  }


  return apiRequest(
    "/accounts/profile/update/",
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          profileData
        ),
    }
  );
}


export async function changePassword({
  oldPassword,
  newPassword,
  confirmPassword,
}) {
  return apiRequest(
    "/accounts/change-password/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          old_password:
            oldPassword,

          new_password:
            newPassword,

          confirm_password:
            confirmPassword,
        }),
    }
  );
}


// =========================================================
// Public Products
// =========================================================

export async function fetchProducts(
  params = {}
) {
  const query =
    createQueryString(
      params
    );


  return apiRequest(
    `/products/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchProductById(
  id
) {
  requireValue(
    id,
    "Product ID is required."
  );


  return apiRequest(
    `/products/${encodeURIComponent(
      id
    )}/`
  );
}


// =========================================================
// Brands
// =========================================================

export async function fetchBrands() {
  return apiRequest(
    "/products/brands/"
  );
}


// =========================================================
// Categories
// =========================================================

export async function fetchDepartments() {
  return apiRequest(
    "/categories/departments/"
  );
}


export async function fetchCategories() {
  return apiRequest(
    "/categories/categories/"
  );
}


export async function fetchSubCategories() {
  return apiRequest(
    "/categories/subcategories/"
  );
}


// =========================================================
// Homepage Collections
// =========================================================

export async function fetchFeaturedProducts(
  limit = 4
) {
  return fetchProducts({
    featured:
      true,

    limit,
  });
}


export async function fetchTrendingProducts(
  limit = 4
) {
  return fetchProducts({
    trending:
      true,

    limit,
  });
}


export async function fetchBestSellerProducts(
  limit = 4
) {
  return fetchProducts({
    best_seller:
      true,

    limit,
  });
}


export async function fetchNewArrivalProducts(
  limit = 4
) {
  return fetchProducts({
    new_arrival:
      true,

    limit,
  });
}


export async function fetchOfferProducts(
  limit = 4
) {
  return fetchProducts({
    offer:
      true,

    limit,
  });
}


export async function fetchClearanceProducts(
  limit = 4
) {
  return fetchProducts({
    clearance:
      true,

    limit,
  });
}


// =========================================================
// Product Search
// =========================================================

export async function searchProducts(
  keyword
) {
  return fetchProducts({
    search:
      String(
        keyword ||
        ""
      ).trim(),
  });
}


// =========================================================
// Product Filters
// =========================================================

export async function fetchProductsByDepartment(
  slug,
  extraParams = {}
) {
  return fetchProducts({
    department:
      slug,

    ...extraParams,
  });
}


export async function fetchProductsByCategory(
  slug,
  extraParams = {}
) {
  return fetchProducts({
    category:
      slug,

    ...extraParams,
  });
}


export async function fetchProductsBySubCategory(
  slug,
  extraParams = {}
) {
  return fetchProducts({
    subcategory:
      slug,

    ...extraParams,
  });
}


export async function fetchProductsByBrand(
  slug,
  extraParams = {}
) {
  return fetchProducts({
    brand:
      slug,

    ...extraParams,
  });
}


// =========================================================
// Admin Product Management
// =========================================================

export async function fetchAdminProducts(
  params = {}
) {
  const query =
    createQueryString(
      params
    );


  return apiRequest(
    `/products/admin/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchAdminProductDetail(
  productId
) {
  requireValue(
    productId,
    "Product ID is required."
  );


  return apiRequest(
    `/products/admin/${encodeURIComponent(
      productId
    )}/`
  );
}


// Compatibility Alias
export async function fetchAdminProductById(
  productId
) {
  return fetchAdminProductDetail(
    productId
  );
}


// =========================================================
// Admin Product Create
// Supports JSON + FormData
// =========================================================

export async function createAdminProduct(
  payload
) {
  if (
    !payload
  ) {
    throw new Error(
      "Product data is required."
    );
  }


  return apiRequest(
    "/products/admin/",
    {
      method:
        "POST",

      body:
        createApiBody(
          payload
        ),
    }
  );
}


// =========================================================
// Admin Product Update
// Supports JSON + FormData
// =========================================================

export async function updateAdminProduct(
  productId,
  payload
) {
  requireValue(
    productId,
    "Product ID is required."
  );


  if (
    !payload
  ) {
    throw new Error(
      "Product data is required."
    );
  }


  return apiRequest(
    `/products/admin/${encodeURIComponent(
      productId
    )}/`,
    {
      method:
        "PATCH",

      body:
        createApiBody(
          payload
        ),
    }
  );
}


export async function deleteAdminProduct(
  productId
) {
  requireValue(
    productId,
    "Product ID is required."
  );


  return apiRequest(
    `/products/admin/${encodeURIComponent(
      productId
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


// =========================================================
// Admin Product Variants
// =========================================================

export async function fetchAdminProductVariants(
  params = {}
) {
  /*
   * Supported:
   *
   * fetchAdminProductVariants()
   *
   * fetchAdminProductVariants({
   *   product: 3,
   * })
   *
   * fetchAdminProductVariants(3)
   */

  let normalizedParams =
    params;


  if (
    typeof params ===
      "string" ||
    typeof params ===
      "number"
  ) {
    normalizedParams = {
      product:
        params,
    };
  }


  const query =
    createQueryString(
      normalizedParams
    );


  return apiRequest(
    `/products/admin/variants/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchAdminProductVariantDetail(
  variantId
) {
  requireValue(
    variantId,
    "Variant ID is required."
  );


  return apiRequest(
    `/products/admin/variants/${encodeURIComponent(
      variantId
    )}/`
  );
}


export async function createAdminProductVariant(
  payload
) {
  if (
    !payload
  ) {
    throw new Error(
      "Variant data is required."
    );
  }


  return apiRequest(
    "/products/admin/variants/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function updateAdminProductVariant(
  variantId,
  payload
) {
  requireValue(
    variantId,
    "Variant ID is required."
  );


  if (
    !payload
  ) {
    throw new Error(
      "Variant data is required."
    );
  }


  return apiRequest(
    `/products/admin/variants/${encodeURIComponent(
      variantId
    )}/`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function deleteAdminProductVariant(
  variantId
) {
  requireValue(
    variantId,
    "Variant ID is required."
  );


  return apiRequest(
    `/products/admin/variants/${encodeURIComponent(
      variantId
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


// =========================================================
// Admin Product Images
// =========================================================

export async function fetchAdminProductImages(
  params = {}
) {
  /*
   * Supported:
   *
   * fetchAdminProductImages()
   *
   * fetchAdminProductImages({
   *   product: 3,
   * })
   *
   * fetchAdminProductImages(3)
   */

  let normalizedParams =
    params;


  if (
    typeof params ===
      "string" ||
    typeof params ===
      "number"
  ) {
    normalizedParams = {
      product:
        params,
    };
  }


  const query =
    createQueryString(
      normalizedParams
    );


  return apiRequest(
    `/products/admin/images/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchAdminProductImageDetail(
  imageId
) {
  requireValue(
    imageId,
    "Image ID is required."
  );


  return apiRequest(
    `/products/admin/images/${encodeURIComponent(
      imageId
    )}/`
  );
}


export async function createAdminProductImage(
  payload
) {
  if (
    !payload
  ) {
    throw new Error(
      "Image data is required."
    );
  }


  const formData =
    createFormDataFromObject(
      payload
    );


  return apiRequest(
    "/products/admin/images/",
    {
      method:
        "POST",

      body:
        formData,
    }
  );
}


export async function updateAdminProductImage(
  imageId,
  payload
) {
  requireValue(
    imageId,
    "Image ID is required."
  );


  if (
    !payload
  ) {
    throw new Error(
      "Image data is required."
    );
  }


  const formData =
    createFormDataFromObject(
      payload
    );


  return apiRequest(
    `/products/admin/images/${encodeURIComponent(
      imageId
    )}/`,
    {
      method:
        "PATCH",

      body:
        formData,
    }
  );
}


export async function deleteAdminProductImage(
  imageId
) {
  requireValue(
    imageId,
    "Image ID is required."
  );


  return apiRequest(
    `/products/admin/images/${encodeURIComponent(
      imageId
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


// =========================================================
// Admin Bulk Product Upload
// Excel / XLSX
//
// Backend expected field:
// excel_file
//
// Endpoint:
// POST /api/products/admin/bulk-upload/
// =========================================================

export async function bulkUploadAdminProducts(
  file
) {
  if (
    !file
  ) {
    throw new Error(
      "Product Excel file is required."
    );
  }


  const formData =
    new FormData();


  formData.append(
    "excel_file",
    file
  );


  return apiRequest(
    "/products/admin/bulk-upload/",
    {
      method:
        "POST",

      body:
        formData,
    }
  );
}


// Compatibility Alias
export async function uploadAdminProductsExcel(
  file
) {
  return bulkUploadAdminProducts(
    file
  );
}


// =========================================================
// Admin Bulk Variant Upload
// Excel / XLSX
//
// Backend expected field:
// excel_file
//
// Endpoint:
// POST /api/products/admin/variants/bulk-upload/
// =========================================================

export async function bulkUploadAdminVariants(
  file
) {
  if (
    !file
  ) {
    throw new Error(
      "Variant Excel file is required."
    );
  }


  const formData =
    new FormData();


  formData.append(
    "excel_file",
    file
  );


  return apiRequest(
    "/products/admin/variants/bulk-upload/",
    {
      method:
        "POST",

      body:
        formData,
    }
  );
}


// Compatibility Alias
export async function uploadAdminVariantsExcel(
  file
) {
  return bulkUploadAdminVariants(
    file
  );
}


// =========================================================
// Admin Bulk Product Image Upload
// ZIP
//
// Backend expected field:
// zip_file
//
// Endpoint:
// POST /api/products/admin/images/bulk-upload/
// =========================================================

export async function bulkUploadAdminProductImages(
  file
) {
  if (
    !file
  ) {
    throw new Error(
      "Product image ZIP file is required."
    );
  }


  const formData =
    new FormData();


  formData.append(
    "zip_file",
    file
  );


  return apiRequest(
    "/products/admin/images/bulk-upload/",
    {
      method:
        "POST",

      body:
        formData,
    }
  );
}


// Compatibility Alias
export async function uploadAdminProductImagesZip(
  file
) {
  return bulkUploadAdminProductImages(
    file
  );
}


// =========================================================
// Generic Admin Bulk Upload Helpers
// =========================================================

export async function adminBulkProductUpload(
  file
) {
  return bulkUploadAdminProducts(
    file
  );
}


export async function adminBulkVariantUpload(
  file
) {
  return bulkUploadAdminVariants(
    file
  );
}


export async function adminBulkImageUpload(
  file
) {
  return bulkUploadAdminProductImages(
    file
  );
}


// =========================================================
// Orders
// =========================================================

export async function createOrder(
  payload
) {
  return apiRequest(
    "/orders/checkout/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


// =========================================================
// Razorpay Payments
// =========================================================

export async function createRazorpayOrder(
  payload
) {
  return apiRequest(
    "/orders/payments/razorpay/create-order/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function verifyRazorpayPayment({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  orderNumber,
}) {
  return apiRequest(
    "/orders/payments/razorpay/verify/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          razorpay_order_id:
            razorpayOrderId,

          razorpay_payment_id:
            razorpayPaymentId,

          razorpay_signature:
            razorpaySignature,

          order_number:
            orderNumber,
        }),
    }
  );
}


export async function reportRazorpayFailure({
  orderNumber,
  razorpayOrderId,
  errorCode,
  errorDescription,
  errorSource,
  errorStep,
  errorReason,
}) {
  return apiRequest(
    "/orders/payments/razorpay/failure/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          order_number:
            orderNumber,

          razorpay_order_id:
            razorpayOrderId,

          error_code:
            errorCode,

          error_description:
            errorDescription,

          error_source:
            errorSource,

          error_step:
            errorStep,

          error_reason:
            errorReason,
        }),
    }
  );
}


// =========================================================
// Customer Orders
// =========================================================

export async function fetchMyOrders() {
  return apiRequest(
    "/orders/my-orders/"
  );
}


export async function fetchOrder(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/my-orders/${encodeURIComponent(
      orderNumber
    )}/`
  );
}
// =========================================================
// Return / Exchange
// =========================================================

export async function fetchMyReturnRequests() {
  return apiRequest(
    "/orders/returns/"
  );
}


export async function fetchReturnRequest(
  returnNumber
) {
  requireValue(
    returnNumber,
    "Return request number is required."
  );


  return apiRequest(
    `/orders/returns/${encodeURIComponent(
      returnNumber
    )}/`
  );
}


export async function createReturnRequest(
  payload
) {
  if (
    !payload
  ) {
    throw new Error(
      "Return / exchange request data is required."
    );
  }


  return apiRequest(
    "/orders/returns/create/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function cancelReturnRequest(
  returnNumber
) {
  requireValue(
    returnNumber,
    "Return request number is required."
  );


  return apiRequest(
    `/orders/returns/${encodeURIComponent(
      returnNumber
    )}/cancel/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Customer Order Tracking
// =========================================================

export async function fetchOrderTracking(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/my-orders/${encodeURIComponent(
      orderNumber
    )}/tracking/`
  );
}


export async function cancelOrder(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/my-orders/${encodeURIComponent(
      orderNumber
    )}/cancel/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Invoice Download
// =========================================================

export async function downloadInvoice(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  let token =
    getAccessToken();


  let response =
    await fetch(
      buildApiUrl(
        `/orders/my-orders/${encodeURIComponent(
          orderNumber
        )}/invoice/`
      ),
      {
        method:
          "GET",

        headers: {
          ...(
            token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}
          ),
        },
      }
    );


  if (
    response.status ===
      401 &&
    getRefreshToken()
  ) {
    token =
      await requestNewAccessToken();


    response =
      await fetch(
        buildApiUrl(
          `/orders/my-orders/${encodeURIComponent(
            orderNumber
          )}/invoice/`
        ),
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );
  }


  if (
    !response.ok
  ) {
    const data =
      await parseResponse(
        response
      );


    throw createApiError(
      response,
      data
    );
  }


  return response.blob();
}


// =========================================================
// Guest Order Tracking
// =========================================================

export async function trackGuestOrder(
  orderNumber,
  phone
) {
  const cleanedOrderNumber =
    String(
      orderNumber ||
      ""
    ).trim();


  const cleanedPhone =
    String(
      phone ||
      ""
    ).replace(
      /\D/g,
      ""
    );


  if (
    !cleanedOrderNumber
  ) {
    throw new Error(
      "Order number is required."
    );
  }


  if (
    cleanedPhone.length !==
    10
  ) {
    throw new Error(
      "Please enter a valid 10-digit mobile number."
    );
  }


  return apiRequest(
    "/orders/guest-order/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          order_number:
            cleanedOrderNumber,

          phone:
            cleanedPhone,
        }),
    }
  );
}


// =========================================================
// Shipping Addresses
// =========================================================

export async function fetchAddresses() {
  return apiRequest(
    "/orders/addresses/"
  );
}


export async function createAddress(
  data
) {
  return apiRequest(
    "/orders/addresses/",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          data
        ),
    }
  );
}


export async function updateAddress(
  id,
  data
) {
  requireValue(
    id,
    "Address ID is required."
  );


  return apiRequest(
    `/orders/addresses/${encodeURIComponent(
      id
    )}/`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          data
        ),
    }
  );
}


export async function deleteAddress(
  id
) {
  requireValue(
    id,
    "Address ID is required."
  );


  return apiRequest(
    `/orders/addresses/${encodeURIComponent(
      id
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


// =========================================================
// Wishlist
// =========================================================

export async function fetchWishlist() {
  return apiRequest(
    "/wishlist/"
  );
}


export async function addToWishlist(
  productId
) {
  return apiRequest(
    "/wishlist/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          product_id:
            productId,
        }),
    }
  );
}


export async function toggleWishlistItem(
  productId
) {
  return apiRequest(
    "/wishlist/toggle/",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          product_id:
            productId,
        }),
    }
  );
}


export async function removeWishlistItem(
  wishlistItemId
) {
  return apiRequest(
    `/wishlist/${encodeURIComponent(
      wishlistItemId
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


export async function fetchWishlistStatus(
  productId
) {
  return apiRequest(
    `/wishlist/status/${encodeURIComponent(
      productId
    )}/`
  );
}


export async function clearWishlist() {
  return apiRequest(
    "/wishlist/clear/",
    {
      method:
        "DELETE",
    }
  );
}


// =========================================================
// Product Reviews
// =========================================================

export async function fetchProductReviews(
  productId
) {
  return apiRequest(
    `/reviews/product/${encodeURIComponent(
      productId
    )}/`
  );
}


export async function fetchProductReviewSummary(
  productId
) {
  return apiRequest(
    `/reviews/product/${encodeURIComponent(
      productId
    )}/summary/`
  );
}


export async function fetchReviewEligibility(
  productId
) {
  return apiRequest(
    `/reviews/product/${encodeURIComponent(
      productId
    )}/eligibility/`
  );
}


// =========================================================
// Create Product Review
// =========================================================

export async function createReview({
  productId,
  orderItemId = null,
  rating,
  title = "",
  comment,
  image = null,
}) {
  const formData =
    new FormData();


  formData.append(
    "product",
    String(
      productId
    )
  );


  formData.append(
    "rating",
    String(
      rating
    )
  );


  formData.append(
    "title",
    String(
      title ||
      ""
    ).trim()
  );


  formData.append(
    "comment",
    String(
      comment ||
      ""
    ).trim()
  );


  if (
    orderItemId
  ) {
    formData.append(
      "order_item",
      String(
        orderItemId
      )
    );
  }


  if (
    image
  ) {
    formData.append(
      "image",
      image
    );
  }


  return apiRequest(
    "/reviews/create/",
    {
      method:
        "POST",

      body:
        formData,
    }
  );
}


export async function fetchMyReviews() {
  return apiRequest(
    "/reviews/my-reviews/"
  );
}


export async function fetchMyReview(
  reviewId
) {
  return apiRequest(
    `/reviews/my-reviews/${encodeURIComponent(
      reviewId
    )}/`
  );
}


// =========================================================
// Update Product Review
// =========================================================

export async function updateReview(
  reviewId,
  {
    rating,
    title,
    comment,
    image,
    removeImage = false,
  }
) {
  const formData =
    new FormData();


  if (
    rating !==
      undefined &&
    rating !==
      null
  ) {
    formData.append(
      "rating",
      String(
        rating
      )
    );
  }


  if (
    title !==
    undefined
  ) {
    formData.append(
      "title",
      String(
        title ||
        ""
      )
    );
  }


  if (
    comment !==
    undefined
  ) {
    formData.append(
      "comment",
      String(
        comment ||
        ""
      )
    );
  }


  if (
    image
  ) {
    formData.append(
      "image",
      image
    );
  }


  if (
    removeImage
  ) {
    formData.append(
      "remove_image",
      "true"
    );
  }


  return apiRequest(
    `/reviews/my-reviews/${encodeURIComponent(
      reviewId
    )}/`,
    {
      method:
        "PATCH",

      body:
        formData,
    }
  );
}


export async function deleteReview(
  reviewId
) {
  return apiRequest(
    `/reviews/my-reviews/${encodeURIComponent(
      reviewId
    )}/`,
    {
      method:
        "DELETE",
    }
  );
}


export async function toggleReviewHelpful(
  reviewId
) {
  return apiRequest(
    `/reviews/${encodeURIComponent(
      reviewId
    )}/helpful/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Admin Return / Exchange Management
// =========================================================

export async function fetchAdminReturnRequests(
  params = {}
) {
  const query =
    createQueryString(
      params
    );


  return apiRequest(
    `/orders/admin/returns/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchAdminReturnRequestDetail(
  returnNumber
) {
  requireValue(
    returnNumber,
    "Return request number is required."
  );


  return apiRequest(
    `/orders/admin/returns/${encodeURIComponent(
      returnNumber
    )}/`
  );
}


export async function updateAdminReturnRequestStatus(
  returnNumber,
  payload
) {
  requireValue(
    returnNumber,
    "Return request number is required."
  );


  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    throw new Error(
      "Return / exchange update data is required."
    );
  }


  return apiRequest(
    `/orders/admin/returns/${encodeURIComponent(
      returnNumber
    )}/status/`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


// =========================================================
// Admin Orders
// =========================================================


// =========================================================
// Admin Orders
// =========================================================


// =========================================================
// Admin Orders
// =========================================================

export async function fetchAdminOrders(
  params = {}
) {
  const query =
    createQueryString(
      params
    );


  return apiRequest(
    `/orders/admin/orders/${
      query
        ? `?${query}`
        : ""
    }`
  );
}


export async function fetchAdminOrderDetail(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/`
  );
}


export async function updateAdminOrder(
  orderNumber,
  payload
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/update/`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


export async function updateAdminOrderStatus(
  orderNumber,
  orderStatus
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/status/`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify({
          status:
            orderStatus,
        }),
    }
  );
}


export async function fetchAdminOrderDashboard() {
  return apiRequest(
    "/orders/admin/orders/dashboard/"
  );
}


// =========================================================
// Admin Order Shipping
// =========================================================

export async function fetchAdminOrderShipping(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shipping/`
  );
}


// =========================================================
// Shiprocket - Courier Serviceability
// =========================================================

export async function checkAdminOrderServiceability(
  orderNumber,
  pickupPostcode = "110059"
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );

  requireValue(
    pickupPostcode,
    "Pickup postcode is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/serviceability/`,
    {
      method: "POST",

      body: JSON.stringify({
        pickup_postcode: String(
          pickupPostcode
        ).trim(),
      }),
    }
  );
}


// Compatibility Alias
export async function fetchAdminShiprocketServiceability(
  orderNumber,
  pickupPostcode = "110059"
) {
  return checkAdminOrderServiceability(
    orderNumber,
    pickupPostcode
  );
}


// =========================================================
// Shiprocket - Create Order
// =========================================================

export async function createAdminShiprocketOrder(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/create-order/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Shiprocket - Assign AWB
// =========================================================

export async function assignAdminShiprocketAWB(
  orderNumber,
  courierId = null
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  const payload =
    {};


  if (
    courierId !==
      undefined &&
    courierId !==
      null &&
    courierId !==
      ""
  ) {
    payload.courier_id =
      courierId;
  }


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/assign-awb/`,
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}


// =========================================================
// Shiprocket - Schedule Pickup
// IMPORTANT:
// Backend URL is /shiprocket/pickup/
// =========================================================

export async function scheduleAdminShiprocketPickup(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/pickup/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Shiprocket - Generate Label
// =========================================================

export async function generateAdminShiprocketLabel(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/label/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Shiprocket - Generate Manifest
// =========================================================

export async function generateAdminShiprocketManifest(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/manifest/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Shiprocket - Refresh Tracking
// =========================================================

export async function refreshAdminShiprocketTracking(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shiprocket/tracking/`,
    {
      method:
        "POST",
    }
  );
}


// =========================================================
// Existing Internal Admin Shipping Label
// =========================================================

export async function fetchAdminShippingLabel(
  orderNumber
) {
  requireValue(
    orderNumber,
    "Order number is required."
  );


  return apiRequest(
    `/orders/admin/orders/${encodeURIComponent(
      orderNumber
    )}/shipping-label/`
  );
}


// =========================================================
// Useful Exports
// =========================================================

export {
  API_BASE_URL,
  buildApiUrl,
  createQueryString,
  getAccessToken,
  getRefreshToken,
  clearStoredAuthentication,
};