import {
  useEffect,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";


function ProtectedRoute({
  children,
}) {
  const location =
    useLocation();

  const {
    isAuthenticated,
    loading,
    openLogin,
  } = useAuth();


  /* =========================================================
     Open login drawer safely
  ========================================================= */

  useEffect(() => {
    if (
      !loading &&
      !isAuthenticated
    ) {
      openLogin();
    }
  }, [
    loading,
    isAuthenticated,
    openLogin,
  ]);


  /* =========================================================
     Authentication Loading
  ========================================================= */

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
            Checking your account...
          </p>
        </div>
      </div>
    );
  }


  /* =========================================================
     Not Logged In
  ========================================================= */

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }


  /* =========================================================
     Authenticated
  ========================================================= */

  return children;
}


export default ProtectedRoute;