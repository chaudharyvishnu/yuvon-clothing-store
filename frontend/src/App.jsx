import {
  Routes,
  Route,
  Link,
} from "react-router-dom";


// =========================================================
// Global Layout
// =========================================================

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";


// =========================================================
// Home Components
// =========================================================

import Hero from "./components/home/Hero";
import HomeNewArrivals from "./components/home/HomeNewArrivals";
import FeaturedProducts from "./components/home/FeaturedProducts";
import TrendingProducts from "./components/home/TrendingProducts";
import BestSellerProducts from "./components/home/BestSellerProducts";
import OfferProducts from "./components/home/OfferProducts";
import ClearanceProducts from "./components/home/ClearanceProducts";
import MediaShowcase from "./components/home/MediaShowcase";
import Testimonials from "./components/home/Testimonials";


// =========================================================
// Authentication / Route Protection
// =========================================================

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";


// =========================================================
// Public / Customer Pages
// =========================================================

import Shop from "./pages/shop";
import ProductDetails from "./pages/productdetails";
import Wishlist from "./pages/Wishlist";
import NewArrivals from "./pages/NewArrivals";
import Offers from "./pages/Offers";
import Support from "./pages/support";
import TrackOrder from "./pages/TrackOrder";
import JoinYuvon from "./pages/JoinYuvon";
import ReturnExchange from "./pages/ReturnExchange";
import ClearanceSale from "./pages/ClearanceSale";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import MyReviews from "./pages/MyReviews";
import SavedAddresses from "./pages/SavedAddresses";
import Checkout from "./pages/Checkout";


// =========================================================
// Admin Dashboard
// =========================================================

import Dashboard from "./pages/admin/Dashboard";


// =========================================================
// Admin Orders
// =========================================================

import AdminOrders from "./components/admin/AdminOrders";
import AdminOrderDetails from "./components/admin/AdminOrderDetails";


// =========================================================
// Admin Products
// =========================================================

import AdminProducts from "./components/admin/AdminProducts";
import AdminProductForm from "./components/admin/AdminProductForm";
import AdminBulkUpload from "./components/admin/AdminBulkUpload";


// =========================================================
// Context Providers
// =========================================================

import {
  CartProvider,
} from "./context/CartContext";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  WishlistProvider,
} from "./context/WishlistContext";


// =========================================================
// Global Drawers
// =========================================================

import CartDrawer from "./components/cart/CartDrawer";
import LoginDrawer from "./components/auth/LoginDrawer";


// =========================================================
// App
// =========================================================

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>

          {/* ==========================================
              Global Layout
          ========================================== */}

          <Navbar />

          <CartDrawer />

          <LoginDrawer />


          {/* ==========================================
              Application Routes
          ========================================== */}

          <Routes>

            {/* ==========================================
                Home
            ========================================== */}

            <Route
              path="/"
              element={
                <>
                  <Hero />

                  <HomeNewArrivals />

                  <FeaturedProducts />

                  <TrendingProducts />

                  <BestSellerProducts />

                  <OfferProducts />

                  <ClearanceProducts />

                  <MediaShowcase />

                  <Testimonials />
                </>
              }
            />


            {/* ==========================================
                Store
            ========================================== */}

            <Route
              path="/shop"
              element={
                <Shop />
              }
            />


            <Route
              path="/product/:id"
              element={
                <ProductDetails />
              }
            />


            <Route
              path="/wishlist"
              element={
                <Wishlist />
              }
            />


            {/* ==========================================
                Checkout
            ========================================== */}

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />


            {/* ==========================================
                Customer Account
            ========================================== */}

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />


            <Route
              path="/my-orders"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />


            <Route
              path="/my-orders/:orderNumber"
              element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />


            <Route
              path="/my-reviews"
              element={
                <ProtectedRoute>
                  <MyReviews />
                </ProtectedRoute>
              }
            />


            <Route
              path="/saved-addresses"
              element={
                <ProtectedRoute>
                  <SavedAddresses />
                </ProtectedRoute>
              }
            />


            {/* ==========================================
                Admin Dashboard
            ========================================== */}

            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Admin Orders
            ========================================== */}

            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />


            <Route
              path="/admin/orders/:orderNumber"
              element={
                <AdminRoute>
                  <AdminOrderDetails />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Admin Products
            ========================================== */}

            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminProducts />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Admin Bulk Product Upload

                IMPORTANT:
                Fixed route must stay BEFORE
                /admin/products/:id
            ========================================== */}

            <Route
              path="/admin/products/bulk-upload"
              element={
                <AdminRoute>
                  <AdminBulkUpload />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Admin Add Product

                IMPORTANT:
                Fixed route must stay BEFORE
                /admin/products/:id
            ========================================== */}

            <Route
              path="/admin/products/new"
              element={
                <AdminRoute>
                  <AdminProductForm />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Admin Edit Product

                Dynamic route stays AFTER fixed routes.
            ========================================== */}

            <Route
              path="/admin/products/:id"
              element={
                <AdminRoute>
                  <AdminProductForm />
                </AdminRoute>
              }
            />


            {/* ==========================================
                Information Pages
            ========================================== */}

            <Route
              path="/about-us"
              element={
                <AboutUs />
              }
            />


            <Route
              path="/privacy-policy"
              element={
                <PrivacyPolicy />
              }
            />


            <Route
              path="/shipping-policy"
              element={
                <ShippingPolicy />
              }
            />


            {/* ==========================================
                Shopping Collections
            ========================================== */}

            <Route
              path="/new-arrivals"
              element={
                <NewArrivals />
              }
            />


            <Route
              path="/offers"
              element={
                <Offers />
              }
            />


            <Route
              path="/clearance-sale"
              element={
                <ClearanceSale />
              }
            />


            {/* ==========================================
                Support / Tracking
            ========================================== */}

            <Route
              path="/support"
              element={
                <Support />
              }
            />


            <Route
              path="/track-order"
              element={
                <TrackOrder />
              }
            />


            <Route
              path="/join-yuvon"
              element={
                <JoinYuvon />
              }
            />


            <Route
              path="/return-exchange"
              element={
                <ReturnExchange />
              }
            />


            {/* ==========================================
                404
            ========================================== */}

            <Route
              path="*"
              element={
                <div
                  className="
                    flex
                    min-h-screen
                    flex-col
                    items-center
                    justify-center
                    bg-gray-100
                    px-6
                    text-center
                  "
                >

                  <h1
                    className="
                      text-7xl
                      font-bold
                      text-blue-600
                    "
                  >
                    404
                  </h1>


                  <p
                    className="
                      mt-4
                      text-2xl
                      font-semibold
                      text-gray-700
                    "
                  >
                    Page Not Found
                  </p>


                  <p
                    className="
                      mt-2
                      text-gray-500
                    "
                  >
                    Sorry, the page you are looking for
                    doesn't exist.
                  </p>


                  <Link
                    to="/"
                    className="
                      mt-6
                      rounded-lg
                      bg-blue-600
                      px-6
                      py-3
                      text-white
                      transition
                      hover:bg-blue-700
                    "
                  >
                    Back to Home
                  </Link>

                </div>
              }
            />

          </Routes>


          {/* ==========================================
              Global Footer
          ========================================== */}

          <Footer />

        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}


export default App;