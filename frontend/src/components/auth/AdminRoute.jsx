import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";


/* =========================================================
   Boolean Normalizer
========================================================= */

function normalizeBoolean(
  value
) {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }


  if (
    value === false ||
    value === 0 ||
    value === null ||
    value === undefined
  ) {
    return false;
  }


  const normalizedValue =
    String(
      value
    )
      .trim()
      .toLowerCase();


  return [
    "true",
    "1",
    "yes",
    "y",
  ].includes(
    normalizedValue
  );
}


/* =========================================================
   Role Normalizer
========================================================= */

function normalizeRole(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   Admin Access Helper
========================================================= */

function userHasAdminAccess(
  user,
  contextIsAdmin
) {
  /*
   * AuthContext may already calculate isAdmin.
   *
   * If it does, we respect that first.
   */

  if (
    contextIsAdmin === true
  ) {
    return true;
  }


  if (
    !user ||
    typeof user !==
      "object"
  ) {
    return false;
  }


  /*
   * Django / backend permission flags.
   *
   * Backend may return booleans:
   *
   * is_staff: true
   * is_superuser: true
   * is_admin: true
   *
   * Some APIs may serialize them as:
   *
   * "true"
   * 1
   */

  const isSuperuser =
    normalizeBoolean(
      user.is_superuser
    );


  const isStaff =
    normalizeBoolean(
      user.is_staff
    );


  const isAdminFlag =
    normalizeBoolean(
      user.is_admin
    );


  /*
   * Role may be returned directly.
   */

  const directRole =
    normalizeRole(
      user.role
    );


  /*
   * Some serializers may return role inside
   * another object.
   */

  const nestedRole =
    normalizeRole(
      user.role?.name ||
      user.role?.slug ||
      user.user_role ||
      user.user_type
    );


  const adminRoles =
    new Set([
      "admin",
      "administrator",
      "superadmin",
      "super_admin",
      "superuser",
      "staff",
    ]);


  const hasAdminRole =
    adminRoles.has(
      directRole
    ) ||
    adminRoles.has(
      nestedRole
    );


  return Boolean(
    isSuperuser ||
    isStaff ||
    isAdminFlag ||
    hasAdminRole
  );
}


/* =========================================================
   Admin Route
========================================================= */

function AdminRoute({
  children,
}) {
  const location =
    useLocation();


  const auth =
    useAuth();


  const user =
    auth?.user ||
    null;


  const isAuthenticated =
    Boolean(
      auth?.isAuthenticated
    );


  const isAdmin =
    Boolean(
      auth?.isAdmin
    );


  const loading =
    Boolean(
      auth?.loading
    );


  /* =======================================================
     Current Route
  ======================================================= */

  const currentRoute =
    `${location.pathname}${location.search}${location.hash}`;


  /* =======================================================
     Authentication Loading
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
          px-6
        "
      >
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


  /* =======================================================
     Authentication Check
  ======================================================= */

  if (
    !isAuthenticated
  ) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from:
            currentRoute,

          requiresAuthentication:
            true,

          requiresAdmin:
            true,
        }}
      />
    );
  }


  /* =======================================================
     Admin Permission Check
  ======================================================= */

  const hasAdminAccess =
    userHasAdminAccess(
      user,
      isAdmin
    );


  /* =======================================================
     Authenticated But Not Admin
  ======================================================= */

  if (
    !hasAdminAccess
  ) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          adminAccessDenied:
            true,

          from:
            currentRoute,
        }}
      />
    );
  }


  /* =======================================================
     Admin Access Granted
  ======================================================= */

  return children;
}


export default AdminRoute;