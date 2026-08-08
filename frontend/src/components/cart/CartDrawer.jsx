import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

import {
  createOrder,
  fetchAddresses,
} from "../../services/api";

const BACKEND_URL = "http://127.0.0.1:8000";

const INITIAL_SHIPPING_FORM = {
  full_name: "",
  phone: "",
  alternate_phone: "",
  address_line_1: "",
  address_line_2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "home",
  payment_method: "cod",
  customer_note: "",
};

function getCartImage(item) {
  const image =
    item.image ||
    item.main_image_url ||
    item.main_image ||
    "";

  if (!image) {
    return "https://placehold.co/300x400?text=No+Image";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${
    image.startsWith("/") ? image : `/${image}`
  }`;
}

function formatApiErrors(errorData, parentKey = "") {
  if (!errorData) {
    return "";
  }

  if (typeof errorData === "string") {
    return parentKey
      ? `${parentKey}: ${errorData}`
      : errorData;
  }

  if (Array.isArray(errorData)) {
    return errorData
      .map((item, index) => {
        if (item && typeof item === "object") {
          return formatApiErrors(
            item,
            parentKey
              ? `${parentKey} ${index + 1}`
              : `Item ${index + 1}`
          );
        }

        return parentKey
          ? `${parentKey}: ${String(item)}`
          : String(item);
      })
      .filter(Boolean)
      .join(" ");
  }

  if (typeof errorData === "object") {
    return Object.entries(errorData)
      .map(([key, value]) => {
        const label = parentKey
          ? `${parentKey}.${key}`
          : key;

        return formatApiErrors(value, label);
      })
      .filter(Boolean)
      .join(" ");
  }

  return String(errorData);
}

function normalizeAddress(address) {
  return {
    id: address.id,
    full_name: address.full_name || "",
    phone: String(address.phone || "").replace(/\D/g, ""),
    alternate_phone: String(
      address.alternate_phone || ""
    ).replace(/\D/g, ""),
    address_line_1: address.address_line_1 || "",
    address_line_2: address.address_line_2 || "",
    landmark: address.landmark || "",
    city: address.city || "",
    state: address.state || "",
    postal_code: String(
      address.postal_code || ""
    ).replace(/\D/g, ""),
    country: address.country || "India",
    address_type: address.address_type || "home",
    is_default: Boolean(address.is_default),
  };
}

function getAddressText(address) {
  return [
    address.address_line_1,
    address.address_line_2,
    address.landmark,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function CartDrawer() {
  const {
    cartItems,
    isCartOpen,
    closeCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
  } = useCart();

  const {
    user,
    isAuthenticated,
    openLogin,
  } = useAuth();

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [couponCode, setCouponCode] =
    useState("");

  const [sendUpdates, setSendUpdates] =
    useState(true);

  const [shippingForm, setShippingForm] =
    useState(INITIAL_SHIPPING_FORM);

  const [savedAddresses, setSavedAddresses] =
    useState([]);

  const [selectedAddressId, setSelectedAddressId] =
    useState(null);

  const [addressMode, setAddressMode] =
    useState("saved");

  const [saveNewAddress, setSaveNewAddress] =
    useState(true);

  const [makeDefaultAddress, setMakeDefaultAddress] =
    useState(false);

  const [addressesLoading, setAddressesLoading] =
    useState(false);

  const [addressesError, setAddressesError] =
    useState("");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [checkoutError, setCheckoutError] =
    useState("");

  const [orderSuccess, setOrderSuccess] =
    useState(null);

  const selectedAddress = useMemo(
    () =>
      savedAddresses.find(
        (address) =>
          String(address.id) ===
          String(selectedAddressId)
      ) || null,
    [savedAddresses, selectedAddressId]
  );

  const resetCheckout = () => {
    setShowCheckout(false);
    setCouponCode("");
    setSendUpdates(true);
    setShippingForm(INITIAL_SHIPPING_FORM);
    setSavedAddresses([]);
    setSelectedAddressId(null);
    setAddressMode("saved");
    setSaveNewAddress(true);
    setMakeDefaultAddress(false);
    setAddressesLoading(false);
    setAddressesError("");
    setPlacingOrder(false);
    setCheckoutError("");
    setOrderSuccess(null);
  };

  const handleCloseCart = () => {
    resetCheckout();
    closeCart();
  };

  const handleSuccessClose = () => {
    clearCart();
    resetCheckout();
    closeCart();
  };

  useEffect(() => {
    if (
      !showCheckout ||
      !isAuthenticated ||
      orderSuccess
    ) {
      return;
    }

    let active = true;

    const loadAddresses = async () => {
      setAddressesLoading(true);
      setAddressesError("");

      try {
        const response = await fetchAddresses();

        if (!active) {
          return;
        }

        const addressList = Array.isArray(response)
          ? response
          : response.results ||
            response.addresses ||
            [];

        const normalized =
          addressList.map(normalizeAddress);

        setSavedAddresses(normalized);

        if (normalized.length > 0) {
          const defaultAddress =
            normalized.find(
              (address) => address.is_default
            ) || normalized[0];

          setSelectedAddressId(
            defaultAddress.id
          );
          setAddressMode("saved");
        } else {
          setAddressMode("new");

          setShippingForm((current) => ({
            ...current,
            full_name:
              current.full_name ||
              user?.display_name ||
              [user?.first_name, user?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              user?.username ||
              "",
            phone:
              current.phone ||
              String(user?.mobile || "").replace(
                /\D/g,
                ""
              ),
          }));
        }
      } catch (error) {
        console.error(
          "Saved addresses load error:",
          error
        );

        if (!active) {
          return;
        }

        setAddressesError(
          formatApiErrors(error.data) ||
            error.message ||
            "Saved addresses load nahi ho paaye."
        );

        setAddressMode("new");
      } finally {
        if (active) {
          setAddressesLoading(false);
        }
      }
    };

    loadAddresses();

    return () => {
      active = false;
    };
  }, [
    showCheckout,
    isAuthenticated,
    orderSuccess,
    user,
  ]);

  useEffect(() => {
    if (
      addressMode !== "saved" ||
      !selectedAddress
    ) {
      return;
    }

    setShippingForm((current) => ({
      ...current,
      ...selectedAddress,
      payment_method:
        current.payment_method || "cod",
      customer_note:
        current.customer_note || "",
    }));
  }, [addressMode, selectedAddress]);

  const handleShippingChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    if (
      name === "phone" ||
      name === "alternate_phone"
    ) {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    if (name === "postal_code") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 6);
    }

    setShippingForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setCheckoutError("");
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      return;
    }

    if (!isAuthenticated) {
      openLogin();
      return;
    }

    setShowCheckout(true);
    setCheckoutError("");
  };

  const validateCheckout = () => {
    if (!isAuthenticated) {
      return "Please login before placing the order.";
    }

    if (cartItems.length === 0) {
      return "Your cart is empty.";
    }

    if (
      addressMode === "saved" &&
      !selectedAddress
    ) {
      return "Please select a saved address.";
    }

    const requiredFields = [
      "full_name",
      "phone",
      "address_line_1",
      "city",
      "state",
      "postal_code",
    ];

    const missingField = requiredFields.find(
      (field) =>
        !String(
          shippingForm[field] || ""
        ).trim()
    );

    if (missingField) {
      return "Please fill all required shipping address fields.";
    }

    const phone =
      shippingForm.phone.replace(/\D/g, "");

    if (phone.length !== 10) {
      return "Please enter a valid 10-digit phone number.";
    }

    const alternatePhone =
      shippingForm.alternate_phone.replace(
        /\D/g,
        ""
      );

    if (
      alternatePhone &&
      alternatePhone.length !== 10
    ) {
      return "Please enter a valid alternate phone number.";
    }

    const postalCode =
      shippingForm.postal_code.replace(
        /\D/g,
        ""
      );

    if (postalCode.length !== 6) {
      return "Please enter a valid 6-digit pincode.";
    }

    const invalidCartItem = cartItems.find(
      (item) => {
        const productId =
          item.productId ??
          item.product_id ??
          item.id;

        const quantity = Number(
          item.quantity || 0
        );

        return !productId || quantity < 1;
      }
    );

    if (invalidCartItem) {
      return "Cart contains an invalid product. Please remove it and add it again.";
    }

    return "";
  };

  const handlePlaceOrder = async () => {
    setCheckoutError("");

    const validationError =
      validateCheckout();

    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    const payload = {
      full_name:
        shippingForm.full_name.trim(),

      phone:
        shippingForm.phone.replace(
          /\D/g,
          ""
        ),

      alternate_phone:
        shippingForm.alternate_phone.replace(
          /\D/g,
          ""
        ),

      address_line_1:
        shippingForm.address_line_1.trim(),

      address_line_2:
        shippingForm.address_line_2.trim(),

      landmark:
        shippingForm.landmark.trim(),

      city:
        shippingForm.city.trim(),

      state:
        shippingForm.state.trim(),

      postal_code:
        shippingForm.postal_code.replace(
          /\D/g,
          ""
        ),

      country:
        shippingForm.country.trim() ||
        "India",

      address_type:
        shippingForm.address_type,

      payment_method:
        shippingForm.payment_method,

      customer_note:
        shippingForm.customer_note.trim(),

      coupon_code:
        couponCode.trim(),

      send_updates:
        sendUpdates,

      save_address:
        addressMode === "new" &&
        saveNewAddress,

      is_default_address:
        addressMode === "new" &&
        saveNewAddress &&
        makeDefaultAddress,

      saved_address_id:
        addressMode === "saved"
          ? selectedAddressId
          : null,

      items: cartItems.map((item) => ({
        product_id:
          item.productId ??
          item.product_id ??
          item.id,

        variant_id:
          item.variantId ??
          item.variant_id ??
          null,

        quantity: Number(
          item.quantity || 1
        ),
      })),
    };

    try {
      setPlacingOrder(true);

      const response = await createOrder(
        payload
      );

      setOrderSuccess(
        response.order || response
      );
    } catch (error) {
      console.error(
        "Order creation error:",
        error
      );

      setCheckoutError(
        formatApiErrors(error.data) ||
          error.message ||
          "Order place nahi ho paya."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isCartOpen) {
    return null;
  }

  return (
    <>
      {/* Cart Drawer */}
      <div
        className="fixed inset-0 z-[999] flex justify-end bg-black/50"
        onClick={handleCloseCart}
      >
        <div
          className="flex h-screen w-full flex-col bg-white shadow-2xl sm:w-[430px]"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <div className="flex items-center justify-between border-b px-6 py-5">
            <h2 className="text-xl font-bold">
              CART

              <span className="ml-2 rounded-full bg-black px-2 py-1 text-xs text-white">
                {totalItems}
              </span>
            </h2>

            <button
              type="button"
              onClick={handleCloseCart}
              className="text-3xl font-light"
              aria-label="Close cart"
            >
              ×
            </button>
          </div>

          <div className="bg-gray-100 py-3 text-center text-sm">
            ⚡ Ships in 24 Hours | ❤️ Loved by
            1,00,000+ Customers
          </div>

          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-xl font-bold">
                  Your cart is empty
                </h3>

                <p className="mt-2 text-gray-500">
                  Add products to continue.
                </p>

                <button
                  type="button"
                  onClick={handleCloseCart}
                  className="mt-5 rounded-full bg-black px-6 py-3 text-white"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const image =
                  getCartImage(item);

                const quantity = Number(
                  item.quantity || 1
                );

                const stock =
                  item.stock === null ||
                  item.stock === undefined
                    ? null
                    : Number(item.stock);

                const reachedStockLimit =
                  stock !== null &&
                  stock > 0 &&
                  quantity >= stock;

                return (
                  <div
                    key={item.itemKey}
                    className="flex gap-4 border-b p-5"
                  >
                    <img
                      src={image}
                      alt={item.name}
                      onError={(event) => {
                        event.currentTarget.onerror =
                          null;

                        event.currentTarget.src =
                          "https://placehold.co/300x400?text=No+Image";
                      }}
                      className="h-28 w-24 rounded object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-semibold">
                        {item.name}
                      </h3>

                      {item.brand && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.brand}
                        </p>
                      )}

                      {item.size && (
                        <p className="mt-2 text-sm text-orange-500">
                          Size: {item.size}
                        </p>
                      )}

                      {item.color && (
                        <p className="text-sm text-gray-500">
                          Color: {item.color}
                        </p>
                      )}

                      {(item.variantSku ||
                        item.variant_sku) && (
                        <p className="mt-1 text-xs text-gray-400">
                          SKU:{" "}
                          {item.variantSku ||
                            item.variant_sku}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-bold text-blue-600">
                          ₹
                          {Number(
                            item.price || 0
                          ).toFixed(2)}
                        </span>

                        {(item.oldPrice ||
                          item.old_price) && (
                          <span className="text-sm text-gray-400 line-through">
                            ₹
                            {Number(
                              item.oldPrice ||
                                item.old_price
                            ).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={quantity <= 1}
                          onClick={() =>
                            decreaseQuantity(
                              item.itemKey
                            )
                          }
                          className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>

                        <span className="min-w-8 text-center font-semibold">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          disabled={
                            reachedStockLimit
                          }
                          onClick={() =>
                            increaseQuantity(
                              item.itemKey
                            )
                          }
                          className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.itemKey
                            )
                          }
                          className="ml-3 text-red-500 hover:text-red-700"
                          aria-label={`Remove ${item.name}`}
                        >
                          🗑
                        </button>
                      </div>

                      {stock !== null &&
                        stock > 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            {stock} available
                          </p>
                        )}

                      <p className="mt-2 text-sm font-semibold">
                        Item total: ₹
                        {(
                          Number(
                            item.price || 0
                          ) * quantity
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {cartItems.length > 0 && (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold">
                    ITEMS IN YOUR CART
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          "Remove all items from cart?"
                        );

                      if (confirmed) {
                        clearCart();
                      }
                    }}
                    className="text-sm font-semibold text-red-500"
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="flex gap-4 overflow-x-auto">
                  {cartItems.map((item) => (
                    <div
                      key={`preview-${item.itemKey}`}
                      className="min-w-[120px]"
                    >
                      <img
                        src={getCartImage(item)}
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.onerror =
                            null;

                          event.currentTarget.src =
                            "https://placehold.co/300x400?text=No+Image";
                        }}
                        className="h-28 w-24 rounded object-cover"
                      />

                      <p className="mt-2 line-clamp-2 text-sm">
                        {item.name}
                      </p>

                      <p className="font-semibold text-red-500">
                        ₹
                        {Number(
                          item.price || 0
                        ).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-5">
            <div className="mb-2 flex justify-between text-sm text-gray-500">
              <span>
                Items ({totalItems})
              </span>

              <span>
                ₹{subtotal.toFixed(2)}
              </span>
            </div>

            <div className="mb-5 flex justify-between text-lg font-bold">
              <span>Subtotal</span>

              <span>
                ₹{subtotal.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              disabled={
                cartItems.length === 0
              }
              onClick={
                handleProceedToCheckout
              }
              className="w-full rounded-lg bg-black py-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isAuthenticated
                ? "PROCEED TO CHECKOUT →"
                : "LOGIN TO CHECKOUT →"}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Drawer */}
      {showCheckout && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-black/40">
          <div className="h-full w-full overflow-y-auto bg-gray-50 shadow-2xl sm:w-[500px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowCheckout(false)
                }
                className="text-3xl"
                aria-label="Back to cart"
              >
                ‹
              </button>

              <div className="text-xl font-bold">
                Yuvon Checkout
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {totalItems} items
                </p>

                <p className="text-lg font-bold">
                  ₹{subtotal.toFixed(2)}
                </p>
              </div>
            </div>

            {orderSuccess ? (
              <div className="flex min-h-[80vh] items-center justify-center p-6">
                <div className="w-full rounded-3xl bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
                    ✓
                  </div>

                  <h2 className="mt-5 text-2xl font-bold text-green-700">
                    Order Placed Successfully
                  </h2>

                  <p className="mt-3 text-gray-500">
                    Your order number is
                  </p>

                  <p className="mt-2 break-all text-xl font-bold">
                    {orderSuccess.order_number ||
                      orderSuccess.id}
                  </p>

                  <p className="mt-4 text-gray-600">
                    Total: ₹
                    {Number(
                      orderSuccess.total_amount ||
                        orderSuccess.total ||
                        subtotal
                    ).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={handleSuccessClose}
                    className="mt-7 w-full rounded-full bg-black py-4 font-semibold text-white"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-green-50 py-3 text-center text-sm">
                  ↩ Easy 7-Day Returns & Exchange
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
                        👤
                      </div>

                      <div>
                        <p className="font-bold">
                          {user?.display_name ||
                            [user?.first_name, user?.last_name]
                              .filter(Boolean)
                              .join(" ")
                              .trim() ||
                            user?.username ||
                            "Yuvon Customer"}
                        </p>

                        <p className="text-sm text-gray-500">
                          {user?.email ||
                            user?.mobile ||
                            "Logged in"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold">
                          Delivery Address
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Select a saved address or enter a new one.
                        </p>
                      </div>

                      {savedAddresses.length >
                        0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMode(
                              addressMode ===
                                "saved"
                                ? "new"
                                : "saved"
                            );
                            setCheckoutError("");
                          }}
                          className="text-sm font-semibold text-blue-600"
                        >
                          {addressMode ===
                          "saved"
                            ? "+ New Address"
                            : "Use Saved"}
                        </button>
                      )}
                    </div>

                    {addressesLoading && (
                      <div className="mt-4 space-y-3">
                        {[1, 2].map(
                          (item) => (
                            <div
                              key={item}
                              className="h-28 animate-pulse rounded-xl bg-gray-100"
                            />
                          )
                        )}
                      </div>
                    )}

                    {addressesError && (
                      <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
                        {addressesError}
                      </p>
                    )}

                    {!addressesLoading &&
                      addressMode ===
                        "saved" &&
                      savedAddresses.length >
                        0 && (
                        <div className="mt-4 space-y-3">
                          {savedAddresses.map(
                            (address) => (
                              <label
                                key={
                                  address.id
                                }
                                className={`block cursor-pointer rounded-xl border p-4 transition ${
                                  String(
                                    selectedAddressId
                                  ) ===
                                  String(
                                    address.id
                                  )
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-gray-200 hover:border-blue-300"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="radio"
                                    name="saved_address"
                                    checked={
                                      String(
                                        selectedAddressId
                                      ) ===
                                      String(
                                        address.id
                                      )
                                    }
                                    onChange={() => {
                                      setSelectedAddressId(
                                        address.id
                                      );
                                      setCheckoutError(
                                        ""
                                      );
                                    }}
                                    className="mt-1"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-bold">
                                        {
                                          address.full_name
                                        }
                                      </p>

                                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold capitalize">
                                        {
                                          address.address_type
                                        }
                                      </span>

                                      {address.is_default && (
                                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                          Default
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                      {getAddressText(
                                        address
                                      )}
                                    </p>

                                    <p className="mt-2 text-sm text-gray-600">
                                      +91{" "}
                                      {
                                        address.phone
                                      }
                                    </p>
                                  </div>
                                </div>
                              </label>
                            )
                          )}
                        </div>
                      )}

                    {!addressesLoading &&
                      addressMode === "new" && (
                        <div className="mt-4 space-y-3">
                          <input
                            type="text"
                            name="full_name"
                            value={
                              shippingForm.full_name
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Full Name *"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <input
                            type="text"
                            name="phone"
                            inputMode="numeric"
                            maxLength={10}
                            value={
                              shippingForm.phone
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Phone Number *"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <input
                            type="text"
                            name="alternate_phone"
                            inputMode="numeric"
                            maxLength={10}
                            value={
                              shippingForm.alternate_phone
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Alternate Phone"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <input
                            type="text"
                            name="address_line_1"
                            value={
                              shippingForm.address_line_1
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="House / Flat / Street *"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <input
                            type="text"
                            name="address_line_2"
                            value={
                              shippingForm.address_line_2
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Area / Locality"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <input
                            type="text"
                            name="landmark"
                            value={
                              shippingForm.landmark
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Landmark"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input
                              type="text"
                              name="city"
                              value={
                                shippingForm.city
                              }
                              onChange={
                                handleShippingChange
                              }
                              placeholder="City *"
                              className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                              type="text"
                              name="state"
                              value={
                                shippingForm.state
                              }
                              onChange={
                                handleShippingChange
                              }
                              placeholder="State *"
                              className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <input
                            type="text"
                            name="postal_code"
                            inputMode="numeric"
                            maxLength={6}
                            value={
                              shippingForm.postal_code
                            }
                            onChange={
                              handleShippingChange
                            }
                            placeholder="Pincode *"
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <select
                            name="address_type"
                            value={
                              shippingForm.address_type
                            }
                            onChange={
                              handleShippingChange
                            }
                            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="home">
                              Home
                            </option>
                            <option value="work">
                              Work
                            </option>
                            <option value="other">
                              Other
                            </option>
                          </select>

                          <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                            <input
                              type="checkbox"
                              checked={
                                saveNewAddress
                              }
                              onChange={(
                                event
                              ) =>
                                setSaveNewAddress(
                                  event
                                    .target
                                    .checked
                                )
                              }
                              className="h-5 w-5"
                            />

                            <span className="text-sm">
                              Save this address for future orders
                            </span>
                          </label>

                          {saveNewAddress && (
                            <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                              <input
                                type="checkbox"
                                checked={
                                  makeDefaultAddress
                                }
                                onChange={(
                                  event
                                ) =>
                                  setMakeDefaultAddress(
                                    event
                                      .target
                                      .checked
                                  )
                                }
                                className="h-5 w-5"
                              />

                              <span className="text-sm">
                                Make this my default address
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="font-bold">
                      Payment Method
                    </h3>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={
                          shippingForm.payment_method ===
                          "cod"
                        }
                        onChange={
                          handleShippingChange
                        }
                      />

                      <div>
                        <p className="font-semibold">
                          Cash on Delivery
                        </p>

                        <p className="text-sm text-gray-500">
                          Pay when your order arrives
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="font-bold">
                      Coupon
                    </h3>

                    <input
                      type="text"
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="Enter coupon code"
                      className="mt-3 w-full rounded-xl border px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="font-bold">
                      Order Note
                    </h3>

                    <textarea
                      name="customer_note"
                      value={
                        shippingForm.customer_note
                      }
                      onChange={
                        handleShippingChange
                      }
                      placeholder="Order note (optional)"
                      rows={3}
                      className="mt-3 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="font-bold">
                      Order Summary
                    </h3>

                    <div className="mt-4 space-y-3">
                      {cartItems.map(
                        (item) => (
                          <div
                            key={`summary-${item.itemKey}`}
                            className="flex justify-between gap-4 text-sm"
                          >
                            <span className="line-clamp-1">
                              {item.name} ×{" "}
                              {item.quantity}
                            </span>

                            <span className="font-semibold">
                              ₹
                              {(
                                Number(
                                  item.price ||
                                    0
                                ) *
                                Number(
                                  item.quantity ||
                                    0
                                )
                              ).toFixed(2)}
                            </span>
                          </div>
                        )
                      )}

                      <div className="flex justify-between border-t pt-3 font-bold">
                        <span>
                          Subtotal
                        </span>

                        <span>
                          ₹
                          {subtotal.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 border-t bg-white p-4">
                  <label className="mb-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendUpdates}
                      onChange={(event) =>
                        setSendUpdates(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5"
                    />

                    <span>
                      Send me order updates and offers
                    </span>
                  </label>

                  {checkoutError && (
                    <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                      {checkoutError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={
                      handlePlaceOrder
                    }
                    disabled={
                      placingOrder ||
                      addressesLoading
                    }
                    className="w-full rounded-lg bg-black py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {placingOrder
                      ? "Placing Order..."
                      : `Place Order ₹${subtotal.toFixed(
                          2
                        )} →`}
                  </button>

                  <p className="mt-4 text-center text-xs">
                    By proceeding, I agree to Privacy Policy and Terms & Conditions.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default CartDrawer;
