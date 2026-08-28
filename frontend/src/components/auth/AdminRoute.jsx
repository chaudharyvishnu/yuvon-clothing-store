import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";


function AdminRoute({
  children,
}) {
  const location =
    useLocation();

  const {
    user,
    isAuthenticated,
    isAdmin,
    loading,
  } = useAuth();


  // ======================================
  // Loading
  // ======================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">

          <div
            className="
              mx-auto
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-gray-200
              border-t-gray-900
            "
          />

          <p className="mt-4 text-sm font-medium text-gray-500">
            Checking admin access...
          </p>

        </div>
      </div>
    );
  }


  // ======================================
  // Authentication Check
  // ======================================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from:
            `${location.pathname}${location.search}`,
        }}
      />
    );
  }


  // ======================================
  // Admin Permission Check
  // ======================================
  //
  // Backend may return:
  //
  // role: "customer"
  // is_staff: true
  // is_superuser: true
  //
  // Therefore Django staff/superuser must also
  // be considered an admin.
  // ======================================

  const normalizedRole =
    String(
      user?.role || ""
    )
      .trim()
      .toLowerCase();


  const hasAdminAccess =
    Boolean(
      isAdmin ||
      user?.is_superuser === true ||
      user?.is_staff === true ||
      user?.is_admin === true ||
      normalizedRole === "admin" ||
      normalizedRole === "administrator"
    );


  // ======================================
  // Not Admin
  // ======================================

  if (!hasAdminAccess) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          adminAccessDenied:
            true,

          from:
            `${location.pathname}${location.search}`,
        }}
      />
    );
  }


  // ======================================
  // Admin Allowed
  // ======================================

  return children;
}


export default AdminRoute;