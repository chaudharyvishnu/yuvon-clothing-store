import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";

import {
  fetchCategories,
  fetchDepartments,
  fetchSubCategories,
} from "../../services/api";

/* =========================================================
   Helpers
========================================================= */

function getUserDisplayName(user) {
  if (!user) {
    return "Account";
  }

  if (user.display_name) {
    return user.display_name;
  }

  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.username ||
    user.email ||
    user.mobile ||
    "Account"
  );
}

/* =========================================================
   Navbar
========================================================= */

function Navbar() {
  const navigate = useNavigate();

  const accountMenuRef =
    useRef(null);

  /* =======================================================
     Contexts
  ======================================================= */

  const {
    openCart,
    cartItems,
    totalItems,
  } = useCart();

  const {
    user,
    loading: authLoading,
    isAuthenticated,
    isAdmin,
    openLogin,
    logout,
  } = useAuth();

  const {
    wishlistItems,
    loading: wishlistLoading,
  } = useWishlist();

  /* =======================================================
     State
  ======================================================= */

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    departments,
    setDepartments,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    subCategories,
    setSubCategories,
  ] = useState([]);

  const [
    menuLoading,
    setMenuLoading,
  ] = useState(true);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    openMobileDepartment,
    setOpenMobileDepartment,
  ] = useState(null);

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  /* =======================================================
     Counts
  ======================================================= */

  const cartCount =
    totalItems ??
    cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item.quantity || 1
        ),
      0
    );

  const wishlistCount =
    isAuthenticated
      ? wishlistItems.length
      : 0;

  /* =======================================================
     User Display
  ======================================================= */

  const displayName =
    getUserDisplayName(
      user
    );

  const displayInitial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  /* =======================================================
     Load Navigation
  ======================================================= */

  useEffect(() => {
    const loadNavigationData =
      async () => {
        setMenuLoading(true);

        try {
          const [
            departmentsResponse,
            categoriesResponse,
            subCategoriesResponse,
          ] = await Promise.all([
            fetchDepartments(),
            fetchCategories(),
            fetchSubCategories(),
          ]);

          const departmentList =
            Array.isArray(
              departmentsResponse
            )
              ? departmentsResponse
              : departmentsResponse
                  ?.results || [];

          const categoryList =
            Array.isArray(
              categoriesResponse
            )
              ? categoriesResponse
              : categoriesResponse
                  ?.results || [];

          const subCategoryList =
            Array.isArray(
              subCategoriesResponse
            )
              ? subCategoriesResponse
              : subCategoriesResponse
                  ?.results || [];

          setDepartments(
            departmentList.filter(
              (department) =>
                department.is_active !==
                  false &&
                department.show_in_navbar !==
                  false
            )
          );

          setCategories(
            categoryList.filter(
              (category) =>
                category.is_active !==
                false
            )
          );

          setSubCategories(
            subCategoryList.filter(
              (subCategory) =>
                subCategory.is_active !==
                false
            )
          );
        } catch (error) {
          console.error(
            "Navbar categories load error:",
            error
          );

          setDepartments([]);
          setCategories([]);
          setSubCategories([]);
        } finally {
          setMenuLoading(false);
        }
      };

    loadNavigationData();
  }, []);

  /* =======================================================
     Outside Account Menu Click
  ======================================================= */

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(
          event.target
        )
      ) {
        setAccountMenuOpen(
          false
        );
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =======================================================
     Escape
  ======================================================= */

  useEffect(() => {
    const handleEscape = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        setAccountMenuOpen(
          false
        );

        setMobileMenuOpen(
          false
        );

        setOpenMobileDepartment(
          null
        );
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     Navigation Data
  ======================================================= */

  const navigationDepartments =
    useMemo(() => {
      return departments.map(
        (department) => {
          const departmentCategories =
            categories
              .filter(
                (category) => {
                  const
                    categoryDepartmentId =
                      category.department_id ??
                      category.department
                        ?.id ??
                      category.department;

                  const
                    categoryDepartmentSlug =
                      category.department_slug ??
                      category.department
                        ?.slug;

                  return (
                    categoryDepartmentId ===
                      department.id ||
                    categoryDepartmentSlug ===
                      department.slug
                  );
                }
              )
              .map(
                (category) => {
                  const
                    categorySubCategories =
                      subCategories.filter(
                        (
                          subCategory
                        ) => {
                          const
                            subCategoryCategoryId =
                              subCategory.category_id ??
                              subCategory
                                .category
                                ?.id ??
                              subCategory
                                .category;

                          const
                            subCategoryCategorySlug =
                              subCategory.category_slug ??
                              subCategory
                                .category
                                ?.slug;

                          return (
                            subCategoryCategoryId ===
                              category.id ||
                            subCategoryCategorySlug ===
                              category.slug
                          );
                        }
                      );

                  return {
                    ...category,
                    subcategories:
                      categorySubCategories,
                  };
                }
              );

          return {
            ...department,
            categories:
              departmentCategories,
          };
        }
      );
    }, [
      departments,
      categories,
      subCategories,
    ]);

  /* =======================================================
     Search
  ======================================================= */

  const handleSearch = () => {
    const cleanedSearch =
      searchText.trim();

    if (!cleanedSearch) {
      navigate("/shop");

      setMobileMenuOpen(
        false
      );

      return;
    }

    navigate(
      `/shop?search=${encodeURIComponent(
        cleanedSearch
      )}`
    );

    setSearchText("");

    setMobileMenuOpen(
      false
    );
  };

  /* =======================================================
     Department Navigation
  ======================================================= */

  const handleDepartmentClick = (
    departmentSlug
  ) => {
    navigate(
      `/shop?department=${encodeURIComponent(
        departmentSlug
      )}`
    );

    setMobileMenuOpen(
      false
    );
  };

  const handleCategoryClick = (
    categorySlug
  ) => {
    navigate(
      `/shop?category=${encodeURIComponent(
        categorySlug
      )}`
    );

    setMobileMenuOpen(
      false
    );
  };

  const handleSubCategoryClick = (
    subCategorySlug
  ) => {
    navigate(
      `/shop?subcategory=${encodeURIComponent(
        subCategorySlug
      )}`
    );

    setMobileMenuOpen(
      false
    );
  };

  /* =======================================================
     Wishlist
  ======================================================= */

  const handleWishlistNavigation =
    () => {
      if (
        authLoading ||
        wishlistLoading
      ) {
        return;
      }

      if (!isAuthenticated) {
        setAccountMenuOpen(
          false
        );

        setMobileMenuOpen(
          false
        );

        openLogin();

        return;
      }

      setAccountMenuOpen(
        false
      );

      setMobileMenuOpen(
        false
      );

      navigate(
        "/wishlist"
      );
    };

  /* =======================================================
     Account
  ======================================================= */

  const handleAccountClick =
    () => {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        openLogin();

        return;
      }

      setAccountMenuOpen(
        (current) => !current
      );
    };

  const handleAccountNavigation = (
    path
  ) => {
    setAccountMenuOpen(
      false
    );

    setMobileMenuOpen(
      false
    );

    navigate(path);
  };

  /* =======================================================
     Logout
  ======================================================= */

  const handleLogout =
    async () => {
      try {
        await Promise.resolve(
          logout()
        );
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      } finally {
        setAccountMenuOpen(
          false
        );

        setMobileMenuOpen(
          false
        );

        navigate("/");
      }
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      {/* ===================================================
          Announcement Bar
      =================================================== */}

      <div className="announcement-bar">
        <div className="announcement-track">

          <div className="announcement-group">
            <span>
              🚚 Free Shipping on Orders Above ₹999
            </span>

            <span>
              🔥 Up to 50% OFF
            </span>

            <span>
              ↩️ 7 Days Return
            </span>

            <span>
              ☎️ Customer Support
            </span>
          </div>

          <div
            className="announcement-group"
            aria-hidden="true"
          >
            <span>
              🚚 Free Shipping on Orders Above ₹999
            </span>

            <span>
              🔥 Up to 50% OFF
            </span>

            <span>
              ↩️ 7 Days Return
            </span>

            <span>
              ☎️ Customer Support
            </span>
          </div>

        </div>
      </div>

      {/* ===================================================
          Main Navbar
      =================================================== */}

      <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">

        <div className="mx-auto grid max-w-7xl grid-cols-3 items-center px-4 py-4 sm:px-6">

          {/* Desktop Search */}

          <div className="hidden h-10 w-64 items-center rounded-md border border-gray-300 px-3 md:flex">
            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Search products..."
              className="flex-1 text-[13px] text-gray-700 outline-none"
            />

            <button
              type="button"
              onClick={
                handleSearch
              }
              className="text-lg"
              title="Search products"
              aria-label="Search products"
            >
              🔍
            </button>
          </div>

          {/* Mobile Menu */}

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(
                (current) =>
                  !current
              )
            }
            className="justify-self-start text-2xl md:hidden"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
          >
            {mobileMenuOpen
              ? "✕"
              : "☰"}
          </button>

          {/* Logo */}

          <Link
            to="/"
            onClick={() => {
              setMobileMenuOpen(
                false
              );

              setAccountMenuOpen(
                false
              );
            }}
            className="text-center text-2xl font-extrabold leading-none tracking-tight text-black md:text-3xl"
          >
            Yuvon Design

            <span className="mt-1 block text-3xl text-blue-600 md:text-4xl">
              Hub
            </span>
          </Link>

          {/* Right Actions */}

          <div className="flex items-center justify-end gap-3 text-xl text-black sm:gap-4">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shop"
                )
              }
              className="hidden transition hover:text-blue-600 sm:block"
              title="Search"
              aria-label="Open shop search"
            >
              🔍
            </button>

            {/* Wishlist */}

            <button
              type="button"
              onClick={
                handleWishlistNavigation
              }
              disabled={
                authLoading ||
                wishlistLoading
              }
              className="relative transition hover:text-red-500 disabled:cursor-wait disabled:opacity-60"
              title={
                isAuthenticated
                  ? "Wishlist"
                  : "Login to view wishlist"
              }
              aria-label={
                isAuthenticated
                  ? "Open wishlist"
                  : "Login to view wishlist"
              }
            >
              {wishlistCount > 0
                ? "♥"
                : "♡"}

              {wishlistCount >
                0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white">
                  {wishlistCount >
                  99
                    ? "99+"
                    : wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}

            <button
              type="button"
              onClick={openCart}
              className="relative transition hover:text-blue-600"
              title="Cart"
              aria-label="Open cart"
            >
              🛍

              {cartCount >
                0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white">
                  {cartCount > 99
                    ? "99+"
                    : cartCount}
                </span>
              )}
            </button>

            {/* Account */}

            <div
              ref={
                accountMenuRef
              }
              className="relative"
            >
              <button
                type="button"
                onClick={
                  handleAccountClick
                }
                disabled={
                  authLoading
                }
                className="flex items-center gap-2 transition hover:text-blue-600 disabled:cursor-wait disabled:opacity-60"
                title={
                  isAuthenticated
                    ? displayName
                    : "Login"
                }
                aria-label={
                  isAuthenticated
                    ? "Open account menu"
                    : "Login"
                }
              >
                {isAuthenticated ? (
                  <>
                    {user?.profile_image ? (
                      <img
                        src={
                          user.profile_image
                        }
                        alt={
                          displayName
                        }
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {
                          displayInitial
                        }
                      </span>
                    )}

                    <span className="hidden max-w-24 truncate text-sm font-semibold lg:block">
                      {
                        displayName
                      }
                    </span>

                    <span className="hidden text-xs lg:block">
                      ⌄
                    </span>
                  </>
                ) : (
                  <span>
                    👤
                  </span>
                )}
              </button>

              {/* Account Dropdown */}

              {isAuthenticated &&
                accountMenuOpen && (
                  <div className="absolute right-0 top-full z-[70] mt-3 w-64 overflow-hidden rounded-2xl border bg-white shadow-2xl">

                    <div className="border-b bg-gray-50 px-5 py-4">
                      <p className="truncate font-bold text-gray-950">
                        {
                          displayName
                        }
                      </p>

                      {user?.email && (
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {
                            user.email
                          }
                        </p>
                      )}

                      {user?.mobile && (
                        <p className="mt-1 text-xs text-gray-500">
                          +91{" "}
                          {
                            user.mobile
                          }
                        </p>
                      )}

                      {isAdmin && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="py-2 text-sm">

                      {/* Admin Dashboard */}

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAccountNavigation(
                                "/admin/dashboard"
                              )
                            }
                            className="flex w-full items-center gap-3 bg-blue-50 px-5 py-3 text-left font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <span>
                              📊
                            </span>

                            <span>
                              Admin Dashboard
                            </span>
                          </button>

                          <div className="my-1 border-t" />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleAccountNavigation(
                            "/profile"
                          )
                        }
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
                      >
                        <span>
                          👤
                        </span>

                        <span>
                          My Profile
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAccountNavigation(
                            "/my-orders"
                          )
                        }
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
                      >
                        <span>
                          📦
                        </span>

                        <span>
                          My Orders
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAccountNavigation(
                            "/my-reviews"
                          )
                        }
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
                      >
                        <span>
                          ⭐
                        </span>

                        <span>
                          My Reviews
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAccountNavigation(
                            "/saved-addresses"
                          )
                        }
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
                      >
                        <span>
                          📍
                        </span>

                        <span>
                          Saved Addresses
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleWishlistNavigation
                        }
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
                      >
                        <span>
                          {wishlistCount >
                          0
                            ? "♥"
                            : "♡"}
                        </span>

                        <span>
                          Wishlist
                        </span>

                        {wishlistCount >
                          0 && (
                          <span className="ml-auto rounded-full bg-black px-2 py-0.5 text-xs text-white">
                            {
                              wishlistCount
                            }
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="border-t p-2">
                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-red-600 hover:bg-red-50"
                      >
                        <span>
                          ↪
                        </span>

                        <span>
                          Logout
                        </span>
                      </button>
                    </div>

                  </div>
                )}
            </div>
          </div>
        </div>

        {/* =================================================
            Desktop Navigation
        ================================================= */}

        <div className="border-t">
          <ul className="mx-auto hidden max-w-7xl items-center justify-center gap-7 px-6 py-3 text-[14px] font-medium text-black lg:flex">

            <li>
              <Link
                to="/"
                className="transition hover:text-blue-600"
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                to="/shop"
                className="transition hover:text-blue-600"
              >
                Shop
              </Link>
            </li>

            {!menuLoading &&
              navigationDepartments.map(
                (department) => (
                  <li
                    key={
                      department.id ||
                      department.slug
                    }
                    className="group relative"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleDepartmentClick(
                          department.slug
                        )
                      }
                      className="flex items-center gap-1 transition hover:text-blue-600"
                    >
                      {
                        department.name
                      }

                      {department
                        .categories
                        .length >
                        0 && (
                        <span className="text-xs">
                          ⌄
                        </span>
                      )}
                    </button>

                    {department
                      .categories
                      .length >
                      0 && (
                      <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[650px] -translate-x-1/2 rounded-2xl border bg-white p-6 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                              Shop Department
                            </p>

                            <h3 className="mt-1 text-xl font-bold">
                              {
                                department.name
                              }
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDepartmentClick(
                                department.slug
                              )
                            }
                            className="text-sm font-semibold text-blue-600"
                          >
                            View all →
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-7">

                          {department.categories.map(
                            (
                              category
                            ) => (
                              <div
                                key={
                                  category.id ||
                                  category.slug
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCategoryClick(
                                      category.slug
                                    )
                                  }
                                  className="text-left font-bold text-gray-950 hover:text-blue-600"
                                >
                                  {
                                    category.name
                                  }
                                </button>

                                {category
                                  .subcategories
                                  .length >
                                  0 && (
                                  <div className="mt-3 space-y-2">

                                    {category
                                      .subcategories
                                      .slice(
                                        0,
                                        6
                                      )
                                      .map(
                                        (
                                          subCategory
                                        ) => (
                                          <button
                                            key={
                                              subCategory.id ||
                                              subCategory.slug
                                            }
                                            type="button"
                                            onClick={() =>
                                              handleSubCategoryClick(
                                                subCategory.slug
                                              )
                                            }
                                            className="block text-left text-sm text-gray-600 hover:text-blue-600"
                                          >
                                            {
                                              subCategory.name
                                            }
                                          </button>
                                        )
                                      )}
                                  </div>
                                )}
                              </div>
                            )
                          )}

                        </div>
                      </div>
                    )}
                  </li>
                )
              )}

            <li>
              <Link
                to="/new-arrivals"
                className="transition hover:text-blue-600"
              >
                New Arrivals
              </Link>
            </li>

            <li>
              <Link
                to="/offers"
                className="transition hover:text-red-600"
              >
                Offers
              </Link>
            </li>

            <li>
              <Link
                to="/clearance-sale"
                className="transition hover:text-red-600"
              >
                Clearance Sale
              </Link>
            </li>

            <li className="group relative">
              <Link
                to="/support"
                className="flex items-center gap-1 transition hover:text-blue-600"
              >
                Support

                <span className="text-xs">
                  ⌄
                </span>
              </Link>

              <div className="invisible absolute left-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border bg-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">

                <Link
                  to="/track-order"
                  className="block px-5 py-3 hover:bg-gray-50"
                >
                  Track Order
                </Link>

                <Link
                  to="/support"
                  className="block px-5 py-3 hover:bg-gray-50"
                >
                  Contact
                </Link>

                <Link
                  to="/join-yuvon"
                  className="block px-5 py-3 hover:bg-gray-50"
                >
                  Join Yuvon
                </Link>
              </div>
            </li>

            <li>
              <Link
                to="/return-exchange"
                className="transition hover:text-blue-600"
              >
                Return / Exchange
              </Link>
            </li>

            {/* Admin Navigation */}

            {isAdmin && (
              <li>
                <Link
                  to="/admin/dashboard"
                  className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white transition hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              </li>
            )}

          </ul>
        </div>

        {/* =================================================
            Mobile Navigation
        ================================================= */}

        {mobileMenuOpen && (
          <div className="max-h-[75vh] overflow-y-auto border-t bg-white px-4 py-5 lg:hidden">

            {/* Mobile Account */}

            <div className="mb-5 rounded-2xl border bg-gray-50 p-4">

              {isAuthenticated ? (
                <div>

                  <div className="flex items-center gap-3">

                    {user?.profile_image ? (
                      <img
                        src={
                          user.profile_image
                        }
                        alt={
                          displayName
                        }
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                        {
                          displayInitial
                        }
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {
                          displayName
                        }
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {user?.email ||
                          user?.mobile ||
                          "Yuvon Customer"}
                      </p>

                      {isAdmin && (
                        <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin Dashboard Mobile */}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        handleAccountNavigation(
                          "/admin/dashboard"
                        )
                      }
                      className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-3 font-bold text-white"
                    >
                      📊 Admin Dashboard
                    </button>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">

                    <button
                      type="button"
                      onClick={() =>
                        handleAccountNavigation(
                          "/profile"
                        )
                      }
                      className="rounded-lg border bg-white px-3 py-2 font-semibold"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAccountNavigation(
                          "/my-orders"
                        )
                      }
                      className="rounded-lg border bg-white px-3 py-2 font-semibold"
                    >
                      My Orders
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleWishlistNavigation
                      }
                      className="rounded-lg border bg-white px-3 py-2 font-semibold"
                    >
                      Wishlist

                      {wishlistCount >
                      0
                        ? ` (${wishlistCount})`
                        : ""}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAccountNavigation(
                          "/my-reviews"
                        )
                      }
                      className="rounded-lg border bg-white px-3 py-2 font-semibold"
                    >
                      My Reviews
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="mt-3 w-full rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600"
                  >
                    Logout
                  </button>

                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(
                      false
                    );

                    openLogin();
                  }}
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
                >
                  Login / Register
                </button>
              )}
            </div>

            {/* Mobile Search */}

            <div className="mb-5 flex items-center rounded-xl border px-3">

              <input
                type="text"
                value={
                  searchText
                }
                onChange={(
                  event
                ) =>
                  setSearchText(
                    event
                      .target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleSearch();
                  }
                }}
                placeholder="Search products..."
                className="flex-1 py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={
                  handleSearch
                }
                aria-label="Search"
              >
                🔍
              </button>
            </div>

            {/* Mobile Links */}

            <div className="space-y-2">

              <Link
                to="/"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                Home
              </Link>

              <Link
                to="/shop"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                Shop
              </Link>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={
                    handleWishlistNavigation
                  }
                  className="block w-full rounded-lg px-3 py-3 text-left font-semibold hover:bg-gray-50"
                >
                  Wishlist
                </button>
              )}

              {navigationDepartments.map(
                (
                  department
                ) => (
                  <div
                    key={
                      department.id ||
                      department.slug
                    }
                    className="rounded-xl border"
                  >

                    <div className="flex items-center justify-between">

                      <button
                        type="button"
                        onClick={() =>
                          handleDepartmentClick(
                            department.slug
                          )
                        }
                        className="flex-1 px-4 py-3 text-left font-semibold"
                      >
                        {
                          department.name
                        }
                      </button>

                      {department
                        .categories
                        .length >
                        0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMobileDepartment(
                              (
                                current
                              ) =>
                                current ===
                                department.id
                                  ? null
                                  : department.id
                            )
                          }
                          className="px-4 py-3"
                          aria-label={`Toggle ${department.name} categories`}
                        >
                          {openMobileDepartment ===
                          department.id
                            ? "−"
                            : "+"}
                        </button>
                      )}
                    </div>

                    {openMobileDepartment ===
                      department.id && (
                      <div className="border-t bg-gray-50 px-4 py-3">

                        {department.categories.map(
                          (
                            category
                          ) => (
                            <div
                              key={
                                category.id ||
                                category.slug
                              }
                              className="mb-4 last:mb-0"
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  handleCategoryClick(
                                    category.slug
                                  )
                                }
                                className="font-semibold text-gray-900"
                              >
                                {
                                  category.name
                                }
                              </button>

                              <div className="mt-2 space-y-2 pl-3">

                                {category.subcategories.map(
                                  (
                                    subCategory
                                  ) => (
                                    <button
                                      key={
                                        subCategory.id ||
                                        subCategory.slug
                                      }
                                      type="button"
                                      onClick={() =>
                                        handleSubCategoryClick(
                                          subCategory.slug
                                        )
                                      }
                                      className="block text-sm text-gray-600"
                                    >
                                      {
                                        subCategory.name
                                      }
                                    </button>
                                  )
                                )}

                              </div>
                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>
                )
              )}

              <Link
                to="/new-arrivals"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                New Arrivals
              </Link>

              <Link
                to="/offers"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold text-red-600 hover:bg-gray-50"
              >
                Offers
              </Link>

              <Link
                to="/clearance-sale"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold text-red-600 hover:bg-gray-50"
              >
                Clearance Sale
              </Link>

              <Link
                to="/track-order"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                Track Order
              </Link>

              <Link
                to="/support"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                Support
              </Link>

              <Link
                to="/return-exchange"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="block rounded-lg px-3 py-3 font-semibold hover:bg-gray-50"
              >
                Return / Exchange
              </Link>

            </div>
          </div>
        )}

      </nav>
    </>
  );
}


export default Navbar;