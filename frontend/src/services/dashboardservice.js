const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

/* =========================================================
   Auth
========================================================= */

const getAccessToken = () => {
  return (
    localStorage.getItem("yuvon_access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};

const getAuthHeaders = () => {
  const accessToken = getAccessToken();

  return {
    "Content-Type": "application/json",

    ...(accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : {}),
  };
};

/* =========================================================
   Query String
========================================================= */

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString
    ? `?${queryString}`
    : "";
};

/* =========================================================
   Base Request
========================================================= */

const request = async (
  endpoint,
  options = {}
) => {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

/* =========================================================
   Fast Dashboard Summary
========================================================= */

export const getDashboardSummary = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/summary/${queryString}`,
    options
  );
};

/* =========================================================
   Dashboard Details
========================================================= */

export const getDashboardDetails = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/details/${queryString}`,
    options
  );
};

/* =========================================================
   Complete Dashboard
   Backward compatibility
========================================================= */

export const getDashboard = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/${queryString}`,
    options
  );
};

/* =========================================================
   Overview
========================================================= */

export const getDashboardOverview = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/overview/${queryString}`,
    options
  );
};

/* =========================================================
   Sales
========================================================= */

export const getDashboardSales = async (
  options = {}
) => {
  return request(
    "/dashboard/sales/",
    options
  );
};

/* =========================================================
   Orders
========================================================= */

export const getDashboardOrders = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/orders/${queryString}`,
    options
  );
};

/* =========================================================
   Payments
========================================================= */

export const getDashboardPayments = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/payments/${queryString}`,
    options
  );
};

/* =========================================================
   Products / Inventory
========================================================= */

export const getDashboardProducts = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/products/${queryString}`,
    options
  );
};

/* =========================================================
   Customers
========================================================= */

export const getDashboardCustomers = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/customers/${queryString}`,
    options
  );
};

/* =========================================================
   Coupons
========================================================= */

export const getDashboardCoupons = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/coupons/${queryString}`,
    options
  );
};

/* =========================================================
   Reviews
========================================================= */

export const getDashboardReviews = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/reviews/${queryString}`,
    options
  );
};

/* =========================================================
   Charts
========================================================= */

export const getDashboardCharts = async (
  params = {},
  options = {}
) => {
  const queryString =
    buildQueryString(params);

  return request(
    `/dashboard/charts/${queryString}`,
    options
  );
};

/* =========================================================
   Recent Activity
========================================================= */

export const getDashboardRecentActivity =
  async (
    limit = 10,
    options = {}
  ) => {
    const queryString =
      buildQueryString({
        limit,
      });

    return request(
      `/dashboard/recent-activity/${queryString}`,
      options
    );
  };

/* =========================================================
   Default Export
========================================================= */

const dashboardService = {
  getDashboardSummary,
  getDashboardDetails,

  getDashboard,

  getDashboardOverview,
  getDashboardSales,
  getDashboardOrders,
  getDashboardPayments,
  getDashboardProducts,
  getDashboardCustomers,
  getDashboardCoupons,
  getDashboardReviews,
  getDashboardCharts,
  getDashboardRecentActivity,
};


export default dashboardService;