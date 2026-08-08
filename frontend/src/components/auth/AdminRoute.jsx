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
    isAuthenticated,
    isAdmin,
    loading,
  } = useAuth();


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


  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  return children;
}


export default AdminRoute;