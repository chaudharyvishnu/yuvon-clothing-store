import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useCart,
} from "../context/CartContext";

import {
  createOrder,
  createRazorpayOrder,
  fetchAddresses,
  reportRazorpayFailure,
  verifyRazorpayPayment,
} from "../services/api";


// =========================================================
// Razorpay
// =========================================================

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";


// =========================================================
// Initial Shipping Form
// =========================================================

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


// =========================================================
// API Error Formatter
// =========================================================

function formatApiErrors(
  errorData,
  parentKey = ""
) {
  if (!errorData) {
    return "";
  }


  if (
    typeof errorData ===
    "string"
  ) {
    return parentKey
      ? `${parentKey}: ${errorData}`
      : errorData;
  }


  if (
    Array.isArray(
      errorData
    )
  ) {
    return errorData
      .map(
        (
          item,
          index
        ) => {

          if (
            item &&
            typeof item ===
              "object"
          ) {
            return formatApiErrors(
              item,
              parentKey
                ? `${parentKey} ${index + 1}`
                : `Item ${index + 1}`
            );
          }


          return parentKey
            ? `${parentKey}: ${String(
                item
              )}`
            : String(
                item
              );
        }
      )
      .filter(
        Boolean
      )
      .join(
        " "
      );
  }


  if (
    typeof errorData ===
    "object"
  ) {
    return Object.entries(
      errorData
    )
      .map(
        (
          [
            key,
            value,
          ]
        ) => {

          const label =
            parentKey
              ? `${parentKey}.${key}`
              : key;


          return formatApiErrors(
            value,
            label
          );
        }
      )
      .filter(
        Boolean
      )
      .join(
        " "
      );
  }


  return String(
    errorData
  );
}


// =========================================================
// Address Helpers
// =========================================================

function normalizeAddress(
  address
) {
  return {
    id:
      address?.id,

    full_name:
      address?.full_name ||
      "",

    phone:
      String(
        address?.phone ||
        ""
      ).replace(
        /\D/g,
        ""
      ),

    alternate_phone:
      String(
        address?.alternate_phone ||
        ""
      ).replace(
        /\D/g,
        ""
      ),

    address_line_1:
      address?.address_line_1 ||
      "",

    address_line_2:
      address?.address_line_2 ||
      "",

    landmark:
      address?.landmark ||
      "",

    city:
      address?.city ||
      "",

    state:
      address?.state ||
      "",

    postal_code:
      String(
        address?.postal_code ||
        ""
      ).replace(
        /\D/g,
        ""
      ),

    country:
      address?.country ||
      "India",

    address_type:
      address?.address_type ||
      "home",

    is_default:
      Boolean(
        address?.is_default
      ),
  };
}


function getAddressText(
  address
) {
  return [
    address?.address_line_1,
    address?.address_line_2,
    address?.landmark,
    address?.city,
    address?.state,
    address?.postal_code,
    address?.country,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );
}


// =========================================================
// Cart Helpers
// =========================================================

function getCartProductId(
  item
) {
  return (
    item?.productId ??
    item?.product_id ??
    item?.id ??
    null
  );
}


function getCartVariantId(
  item
) {
  const value =
    item?.variantId ??
    item?.variant_id ??
    item?.selectedVariant?.id ??
    null;


  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }


  return value;
}


function getCartVariantSku(
  item
) {
  return (
    item?.variantSku ||
    item?.variant_sku ||
    item?.selectedVariant?.sku ||
    (
      getCartVariantId(
        item
      )
        ? item?.sku
        : ""
    ) ||
    ""
  );
}


function getCartColor(
  item
) {
  return (
    item?.color ||
    item?.selectedColor ||
    item?.selectedVariant?.color ||
    ""
  );
}


function getCartSize(
  item
) {
  return (
    item?.size ||
    item?.selectedSize ||
    item?.selectedVariant?.size ||
    ""
  );
}


function getCartItemKey(
  item,
  index
) {
  const productId =
    getCartProductId(
      item
    );


  const variantId =
    getCartVariantId(
      item
    );


  return (
    item?.itemKey ||
    item?.cartKey ||
    `${productId || "product"}-${
      variantId ||
      getCartVariantSku(
        item
      ) ||
      "base"
    }-${index}`
  );
}


// =========================================================
// Razorpay Script
// =========================================================

function loadRazorpayScript() {
  return new Promise(
    (
      resolve
    ) => {

      if (
        window.Razorpay
      ) {
        resolve(
          true
        );

        return;
      }


      const existingScript =
        document.querySelector(
          `script[src="${RAZORPAY_SCRIPT_URL}"]`
        );


      if (
        existingScript
      ) {

        existingScript.addEventListener(
          "load",
          () =>
            resolve(
              true
            ),
          {
            once: true,
          }
        );


        existingScript.addEventListener(
          "error",
          () =>
            resolve(
              false
            ),
          {
            once: true,
          }
        );


        return;
      }


      const script =
        document.createElement(
          "script"
        );


      script.src =
        RAZORPAY_SCRIPT_URL;


      script.async =
        true;


      script.onload =
        () =>
          resolve(
            true
          );


      script.onerror =
        () =>
          resolve(
            false
          );


      document.body.appendChild(
        script
      );
    }
  );
}


// =========================================================
// Checkout Component
// =========================================================

function Checkout() {

  const navigate =
    useNavigate();


  const {
    user,
    isAuthenticated,
    openLogin,
  } =
    useAuth();


  const {
    cartItems = [],
    subtotal = 0,
    totalItems = 0,
    clearCart,
  } =
    useCart();


  // =======================================================
  // Form State
  // =======================================================

  const [
    shippingForm,
    setShippingForm,
  ] =
    useState(
      INITIAL_SHIPPING_FORM
    );


  const [
    savedAddresses,
    setSavedAddresses,
  ] =
    useState(
      []
    );


  const [
    selectedAddressId,
    setSelectedAddressId,
  ] =
    useState(
      null
    );


  const [
    addressMode,
    setAddressMode,
  ] =
    useState(
      "saved"
    );


  const [
    saveNewAddress,
    setSaveNewAddress,
  ] =
    useState(
      true
    );


  const [
    makeDefaultAddress,
    setMakeDefaultAddress,
  ] =
    useState(
      false
    );


  const [
    sendUpdates,
    setSendUpdates,
  ] =
    useState(
      true
    );


  const [
    couponCode,
    setCouponCode,
  ] =
    useState(
      ""
    );


  // =======================================================
  // UI State
  // =======================================================

  const [
    addressesLoading,
    setAddressesLoading,
  ] =
    useState(
      false
    );


  const [
    addressesError,
    setAddressesError,
  ] =
    useState(
      ""
    );


  const [
    placingOrder,
    setPlacingOrder,
  ] =
    useState(
      false
    );


  const [
    checkoutError,
    setCheckoutError,
  ] =
    useState(
      ""
    );


  const [
    orderSuccess,
    setOrderSuccess,
  ] =
    useState(
      null
    );


  // =======================================================
  // Selected Saved Address
  // =======================================================

  const selectedAddress =
    useMemo(
      () =>
        savedAddresses.find(
          (
            address
          ) =>
            String(
              address.id
            ) ===
            String(
              selectedAddressId
            )
        ) ||
        null,
      [
        savedAddresses,
        selectedAddressId,
      ]
    );


  // =======================================================
  // Recalculate Checkout Subtotal
  // =======================================================

  const calculatedSubtotal =
    useMemo(
      () =>
        cartItems.reduce(
          (
            total,
            item
          ) => {

            const price =
              Number(
                item?.price ||
                0
              );


            const quantity =
              Number(
                item?.quantity ||
                0
              );


            return (
              total +
              (
                price *
                quantity
              )
            );
          },
          0
        ),
      [
        cartItems,
      ]
    );


  const displayedSubtotal =
    Number(
      subtotal ||
      calculatedSubtotal ||
      0
    );


  // =======================================================
  // Load Addresses
  // =======================================================

  useEffect(
    () => {

      if (
        !isAuthenticated
      ) {
        openLogin();

        return;
      }


      let active =
        true;


      async function loadAddresses() {

        setAddressesLoading(
          true
        );


        setAddressesError(
          ""
        );


        try {

          const response =
            await fetchAddresses();


          if (
            !active
          ) {
            return;
          }


          const addressList =
            Array.isArray(
              response
            )
              ? response
              : (
                  Array.isArray(
                    response?.results
                  )
                    ? response.results
                    : (
                        Array.isArray(
                          response?.addresses
                        )
                          ? response.addresses
                          : []
                      )
                );


          const normalized =
            addressList.map(
              normalizeAddress
            );


          setSavedAddresses(
            normalized
          );


          if (
            normalized.length >
            0
          ) {

            const defaultAddress =
              normalized.find(
                (
                  address
                ) =>
                  address.is_default
              ) ||
              normalized[0];


            setSelectedAddressId(
              defaultAddress.id
            );


            setAddressMode(
              "saved"
            );

          } else {

            setAddressMode(
              "new"
            );


            setShippingForm(
              (
                current
              ) => ({
                ...current,

                full_name:
                  current.full_name ||
                  user?.display_name ||
                  [
                    user?.first_name,
                    user?.last_name,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )
                    .trim() ||
                  user?.username ||
                  "",

                phone:
                  current.phone ||
                  String(
                    user?.mobile ||
                    user?.phone ||
                    ""
                  )
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      -10
                    ),
              })
            );
          }

        } catch (
          error
        ) {

          console.error(
            "Address load error:",
            error
          );


          if (
            !active
          ) {
            return;
          }


          setAddressesError(
            formatApiErrors(
              error?.data
            ) ||
            error?.message ||
            "Saved addresses load nahi ho paaye."
          );


          setAddressMode(
            "new"
          );

        } finally {

          if (
            active
          ) {
            setAddressesLoading(
              false
            );
          }

        }
      }


      loadAddresses();


      return () => {
        active =
          false;
      };

    },
    [
      isAuthenticated,
      openLogin,
      user,
    ]
  );


  // =======================================================
  // Copy Saved Address To Shipping Form
  // =======================================================

  useEffect(
    () => {

      if (
        addressMode !==
          "saved" ||
        !selectedAddress
      ) {
        return;
      }


      setShippingForm(
        (
          current
        ) => ({
          ...current,

          full_name:
            selectedAddress.full_name,

          phone:
            selectedAddress.phone,

          alternate_phone:
            selectedAddress.alternate_phone,

          address_line_1:
            selectedAddress.address_line_1,

          address_line_2:
            selectedAddress.address_line_2,

          landmark:
            selectedAddress.landmark,

          city:
            selectedAddress.city,

          state:
            selectedAddress.state,

          postal_code:
            selectedAddress.postal_code,

          country:
            selectedAddress.country,

          address_type:
            selectedAddress.address_type,

          payment_method:
            current.payment_method ||
            "cod",

          customer_note:
            current.customer_note ||
            "",
        })
      );

    },
    [
      addressMode,
      selectedAddress,
    ]
  );


  // =======================================================
  // Shipping Change
  // =======================================================

  const handleShippingChange =
    (
      event
    ) => {

      const {
        name,
        value,
      } =
        event.target;


      let nextValue =
        value;


      if (
        name ===
          "phone" ||
        name ===
          "alternate_phone"
      ) {
        nextValue =
          value
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              10
            );
      }


      if (
        name ===
        "postal_code"
      ) {
        nextValue =
          value
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              6
            );
      }


      setShippingForm(
        (
          current
        ) => ({
          ...current,

          [name]:
            nextValue,
        })
      );


      setCheckoutError(
        ""
      );
    };


  // =======================================================
  // Checkout Validation
  // =======================================================

  const validateCheckout =
    () => {

      if (
        !isAuthenticated
      ) {
        return (
          "Please login before placing the order."
        );
      }


      if (
        !Array.isArray(
          cartItems
        ) ||
        cartItems.length ===
          0
      ) {
        return (
          "Your cart is empty."
        );
      }


      if (
        addressMode ===
          "saved" &&
        !selectedAddress
      ) {
        return (
          "Please select a saved address."
        );
      }


      const requiredFields = [
        "full_name",
        "phone",
        "address_line_1",
        "city",
        "state",
        "postal_code",
      ];


      const missingField =
        requiredFields.find(
          (
            field
          ) =>
            !String(
              shippingForm?.[
                field
              ] ||
              ""
            ).trim()
        );


      if (
        missingField
      ) {
        return (
          "Please fill all required shipping address fields."
        );
      }


      const phone =
        String(
          shippingForm.phone ||
          ""
        ).replace(
          /\D/g,
          ""
        );


      if (
        phone.length !==
        10
      ) {
        return (
          "Please enter a valid 10-digit phone number."
        );
      }


      const alternatePhone =
        String(
          shippingForm.alternate_phone ||
          ""
        ).replace(
          /\D/g,
          ""
        );


      if (
        alternatePhone &&
        alternatePhone.length !==
          10
      ) {
        return (
          "Please enter a valid alternate phone number."
        );
      }


      const postalCode =
        String(
          shippingForm.postal_code ||
          ""
        ).replace(
          /\D/g,
          ""
        );


      if (
        postalCode.length !==
        6
      ) {
        return (
          "Please enter a valid 6-digit pincode."
        );
      }


      for (
        const item of cartItems
      ) {

        const productId =
          getCartProductId(
            item
          );


        const variantId =
          getCartVariantId(
            item
          );


        const quantity =
          Number(
            item?.quantity ||
            0
          );


        if (
          !productId
        ) {
          return (
            "Cart contains an invalid product. Please remove it and add it again."
          );
        }


        if (
          !Number.isFinite(
            quantity
          ) ||
          quantity <
            1
        ) {
          return (
            "Cart contains an invalid quantity."
          );
        }


        const appearsToHaveVariant =
          Boolean(
            item?.variantSku ||
            item?.variant_sku ||
            item?.selectedVariant ||
            item?.size ||
            item?.color
          );


        if (
          appearsToHaveVariant &&
          !variantId
        ) {
          return (
            `Variant information is missing for ${
              item?.name ||
              "a product"
            }. Please remove it from cart and add the variant again.`
          );
        }
      }


      if (
        ![
          "cod",
          "razorpay",
        ].includes(
          shippingForm.payment_method
        )
      ) {
        return (
          "Please select a valid payment method."
        );
      }


      return "";
    };


  // =======================================================
  // Checkout Payload
  // =======================================================

  const createCheckoutPayload =
    () => {

      const items =
        cartItems.map(
          (
            item
          ) => {

            const productId =
              getCartProductId(
                item
              );


            const variantId =
              getCartVariantId(
                item
              );


            return {
              product_id:
                Number(
                  productId
                ),

              variant_id:
                variantId !==
                  null
                  ? Number(
                      variantId
                    )
                  : null,

              quantity:
                Number(
                  item?.quantity ||
                  1
                ),
            };
          }
        );


      return {
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
          couponCode
            .trim()
            .toUpperCase(),

        send_updates:
          Boolean(
            sendUpdates
          ),

        save_address:
          addressMode ===
            "new" &&
          Boolean(
            saveNewAddress
          ),

        is_default_address:
          addressMode ===
            "new" &&
          Boolean(
            saveNewAddress
          ) &&
          Boolean(
            makeDefaultAddress
          ),

        saved_address_id:
          addressMode ===
            "saved"
            ? Number(
                selectedAddressId
              )
            : null,

        items,
      };
    };


  // =======================================================
  // COD
  // =======================================================

  const handleCodOrder =
    async (
      payload
    ) => {

      const response =
        await createOrder(
          payload
        );


      setOrderSuccess(
        response?.order ||
        response
      );
    };


  // =======================================================
  // Razorpay
  // =======================================================

  const handleOnlinePayment =
    async (
      payload
    ) => {

      const scriptLoaded =
        await loadRazorpayScript();


      if (
        !scriptLoaded
      ) {
        throw new Error(
          "Razorpay payment window load nahi ho paayi. Please check your internet connection."
        );
      }


      // -----------------------------------------
      // Step 1 - Create website order
      // -----------------------------------------

      const orderResponse =
        await createOrder(
          payload
        );


      const websiteOrder =
        orderResponse?.order ||
        orderResponse;


      const orderNumber =
        websiteOrder?.order_number ||
        orderResponse?.order_number;


      if (
        !orderNumber
      ) {
        throw new Error(
          "Order number backend se return nahi hua."
        );
      }


      // -----------------------------------------
      // Step 2 - Create Razorpay order
      // -----------------------------------------

      const razorpayResponse =
        await createRazorpayOrder({
          order_number:
            orderNumber,
        });


      const razorpayOrderId =
        razorpayResponse?.razorpay_order_id ||
        razorpayResponse?.id;


      const amount =
        Number(
          razorpayResponse?.amount ||
          0
        );


      const currency =
        razorpayResponse?.currency ||
        "INR";


      const key =
        razorpayResponse?.key ||
        razorpayResponse?.key_id ||
        import.meta.env
          .VITE_RAZORPAY_KEY_ID;


      if (
        !razorpayOrderId ||
        !amount ||
        !key
      ) {
        throw new Error(
          "Razorpay order response incomplete hai."
        );
      }


      const options = {

        key,

        amount,

        currency,

        name:
          "Yuvon Design Hub",

        description:
          `Payment for order ${orderNumber}`,

        order_id:
          razorpayOrderId,

        prefill: {
          name:
            shippingForm.full_name,

          email:
            user?.email ||
            "",

          contact:
            shippingForm.phone,
        },

        notes: {
          order_number:
            orderNumber,
        },

        theme: {
          color:
            "#111827",
        },


        handler:
          async (
            paymentResponse
          ) => {

            try {

              const verifyResponse =
                await verifyRazorpayPayment({
                  razorpayOrderId:
                    paymentResponse
                      .razorpay_order_id,

                  razorpayPaymentId:
                    paymentResponse
                      .razorpay_payment_id,

                  razorpaySignature:
                    paymentResponse
                      .razorpay_signature,

                  orderNumber,
                });


              setOrderSuccess(
                verifyResponse?.order ||
                websiteOrder
              );

            } catch (
              error
            ) {

              console.error(
                "Payment verification error:",
                error
              );


              setCheckoutError(
                formatApiErrors(
                  error?.data
                ) ||
                error?.message ||
                "Payment verify nahi ho paayi."
              );

            } finally {

              setPlacingOrder(
                false
              );

            }
          },


        modal: {

          ondismiss:
            () => {

              setCheckoutError(
                "Payment cancelled. Aap dobara payment try kar sakte hain."
              );


              setPlacingOrder(
                false
              );
            },
        },
      };


      const razorpay =
        new window.Razorpay(
          options
        );


      razorpay.on(
        "payment.failed",
        async (
          response
        ) => {

          const failure =
            response?.error ||
            {};


          try {

            await reportRazorpayFailure({
              orderNumber,

              razorpayOrderId,

              errorCode:
                failure?.code ||
                "",

              errorDescription:
                failure?.description ||
                "",

              errorSource:
                failure?.source ||
                "",

              errorStep:
                failure?.step ||
                "",

              errorReason:
                failure?.reason ||
                "",
            });

          } catch (
            reportError
          ) {

            console.error(
              "Payment failure report error:",
              reportError
            );

          }


          setCheckoutError(
            failure?.description ||
            "Online payment failed. Please try again."
          );


          setPlacingOrder(
            false
          );
        }
      );


      razorpay.open();
    };


  // =======================================================
  // Place Order
  // =======================================================

  const handlePlaceOrder =
    async () => {

      if (
        placingOrder
      ) {
        return;
      }


      setCheckoutError(
        ""
      );


      const validationError =
        validateCheckout();


      if (
        validationError
      ) {
        setCheckoutError(
          validationError
        );

        return;
      }


      const payload =
        createCheckoutPayload();


      console.log(
        "Checkout payload:",
        payload
      );


      try {

        setPlacingOrder(
          true
        );


        if (
          shippingForm.payment_method ===
          "razorpay"
        ) {

          await handleOnlinePayment(
            payload
          );


          return;
        }


        await handleCodOrder(
          payload
        );


        setPlacingOrder(
          false
        );

      } catch (
        error
      ) {

        console.error(
          "Checkout error:",
          error
        );


        setCheckoutError(
          formatApiErrors(
            error?.data
          ) ||
          error?.message ||
          "Order place nahi ho paya."
        );


        setPlacingOrder(
          false
        );
      }
    };


  // =======================================================
  // Continue Shopping
  // =======================================================

  const handleContinueShopping =
    () => {

      clearCart();


      navigate(
        "/shop"
      );
    };


  // =======================================================
  // Empty Cart
  // =======================================================

  if (
    !orderSuccess &&
    cartItems.length ===
      0
  ) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-6 py-16">

        <div className="w-full max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">

          <h1 className="text-3xl font-bold">
            Your cart is empty
          </h1>


          <p className="mt-3 text-gray-500">
            Add a product before proceeding to checkout.
          </p>


          <Link
            to="/shop"
            className="mt-7 inline-block rounded-full bg-black px-8 py-3 font-semibold text-white"
          >
            Continue Shopping
          </Link>

        </div>

      </section>
    );
  }


  // =======================================================
  // Success
  // =======================================================

  if (
    orderSuccess
  ) {
    return (
      <section className="flex min-h-[75vh] items-center justify-center bg-gray-50 px-6 py-16">

        <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
            ✓
          </div>


          <h1 className="mt-5 text-3xl font-bold text-green-700">
            Order Placed Successfully
          </h1>


          <p className="mt-4 text-gray-500">
            Your order number is
          </p>


          <p className="mt-2 break-all text-xl font-bold">
            {
              orderSuccess?.order_number ||
              orderSuccess?.id
            }
          </p>


          <p className="mt-4 text-gray-600">
            Total: ₹
            {
              Number(
                orderSuccess?.total_amount ||
                orderSuccess?.total ||
                displayedSubtotal
              ).toFixed(
                2
              )
            }
          </p>


          <div className="mt-8 grid gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={
                handleContinueShopping
              }
              className="w-full rounded-full bg-black py-4 font-semibold text-white"
            >
              Continue Shopping
            </button>


            <Link
              to="/my-orders"
              onClick={
                clearCart
              }
              className="flex w-full items-center justify-center rounded-full border border-gray-300 py-4 font-semibold text-gray-800"
            >
              View My Orders
            </Link>

          </div>

        </div>

      </section>
    );
  }


  // =======================================================
  // Checkout
  // =======================================================

  return (
    <section className="min-h-screen bg-gray-50 py-10">

      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>

            <Link
              to="/shop"
              className="text-sm font-semibold text-blue-600"
            >
              ← Continue Shopping
            </Link>


            <h1 className="mt-2 text-3xl font-bold">
              Checkout
            </h1>

          </div>


          <div className="text-right">

            <p className="text-sm text-gray-500">
              {totalItems} items
            </p>


            <p className="text-xl font-bold">
              ₹
              {
                displayedSubtotal.toFixed(
                  2
                )
              }
            </p>

          </div>

        </div>


        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* =================================================
              Left Column
          ================================================= */}

          <div className="space-y-5">

            {/* Customer */}

            <div className="rounded-2xl border bg-white p-5">

              <h2 className="text-lg font-bold">
                Customer
              </h2>


              <p className="mt-2 font-semibold">

                {
                  user?.display_name ||
                  [
                    user?.first_name,
                    user?.last_name,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )
                    .trim() ||
                  user?.username ||
                  "Yuvon Customer"
                }

              </p>


              <p className="text-sm text-gray-500">

                {
                  user?.email ||
                  user?.mobile ||
                  "Logged in"
                }

              </p>

            </div>


            {/* =================================================
                Delivery Address
            ================================================= */}

            <div className="rounded-2xl border bg-white p-5">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="text-lg font-bold">
                    Delivery Address
                  </h2>


                  <p className="mt-1 text-sm text-gray-500">
                    Select a saved address or add a new one.
                  </p>

                </div>


                {
                  savedAddresses.length >
                    0 && (

                    <button
                      type="button"
                      onClick={
                        () => {

                          setAddressMode(
                            addressMode ===
                              "saved"
                              ? "new"
                              : "saved"
                          );


                          setCheckoutError(
                            ""
                          );
                        }
                      }
                      className="text-sm font-semibold text-blue-600"
                    >
                      {
                        addressMode ===
                          "saved"
                          ? "+ New Address"
                          : "Use Saved"
                      }
                    </button>

                  )
                }

              </div>


              {
                addressesLoading && (

                  <p className="mt-5 text-sm text-gray-500">
                    Loading addresses...
                  </p>

                )
              }


              {
                addressesError && (

                  <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
                    {addressesError}
                  </p>

                )
              }


              {/* Saved Addresses */}

              {
                !addressesLoading &&
                addressMode ===
                  "saved" &&
                savedAddresses.length >
                  0 && (

                  <div className="mt-5 space-y-3">

                    {
                      savedAddresses.map(
                        (
                          address
                        ) => (

                          <label
                            key={
                              address.id
                            }
                            className={
                              `block cursor-pointer rounded-xl border p-4 ${
                                String(
                                  selectedAddressId
                                ) ===
                                String(
                                  address.id
                                )
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200"
                              }`
                            }
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
                                onChange={
                                  () => {
                                    setSelectedAddressId(
                                      address.id
                                    );

                                    setCheckoutError(
                                      ""
                                    );
                                  }
                                }
                                className="mt-1"
                              />


                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  <p className="font-bold">
                                    {
                                      address.full_name
                                    }
                                  </p>


                                  {
                                    address.is_default && (

                                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                        Default
                                      </span>

                                    )
                                  }

                                </div>


                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                  {
                                    getAddressText(
                                      address
                                    )
                                  }
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
                      )
                    }

                  </div>

                )
              }


              {/* New Address */}

              {
                !addressesLoading &&
                addressMode ===
                  "new" && (

                  <div className="mt-5 space-y-3">

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


                    <div className="grid gap-3 sm:grid-cols-2">

                      <input
                        type="text"
                        name="phone"
                        inputMode="numeric"
                        maxLength={
                          10
                        }
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
                        maxLength={
                          10
                        }
                        value={
                          shippingForm.alternate_phone
                        }
                        onChange={
                          handleShippingChange
                        }
                        placeholder="Alternate Phone"
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      />

                    </div>


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


                    <div className="grid gap-3 sm:grid-cols-3">

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


                      <input
                        type="text"
                        name="postal_code"
                        inputMode="numeric"
                        maxLength={
                          6
                        }
                        value={
                          shippingForm.postal_code
                        }
                        onChange={
                          handleShippingChange
                        }
                        placeholder="Pincode *"
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      />

                    </div>


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
                        onChange={
                          (
                            event
                          ) =>
                            setSaveNewAddress(
                              event.target.checked
                            )
                        }
                      />


                      <span className="text-sm">
                        Save this address for future orders
                      </span>

                    </label>


                    {
                      saveNewAddress && (

                        <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">

                          <input
                            type="checkbox"
                            checked={
                              makeDefaultAddress
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setMakeDefaultAddress(
                                  event.target.checked
                                )
                            }
                          />


                          <span className="text-sm">
                            Make this my default address
                          </span>

                        </label>

                      )
                    }

                  </div>

                )
              }

            </div>


            {/* =================================================
                Payment
            ================================================= */}

            <div className="rounded-2xl border bg-white p-5">

              <h2 className="text-lg font-bold">
                Payment Method
              </h2>


              <div className="mt-4 space-y-3">

                <label
                  className={
                    `flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                      shippingForm.payment_method ===
                        "razorpay"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200"
                    }`
                  }
                >

                  <input
                    type="radio"
                    name="payment_method"
                    value="razorpay"
                    checked={
                      shippingForm.payment_method ===
                      "razorpay"
                    }
                    onChange={
                      handleShippingChange
                    }
                  />


                  <div>

                    <p className="font-semibold">
                      Pay Online
                    </p>


                    <p className="text-sm text-gray-500">
                      UPI, Card, Net Banking and Wallets
                    </p>

                  </div>

                </label>


                <label
                  className={
                    `flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                      shippingForm.payment_method ===
                        "cod"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200"
                    }`
                  }
                >

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

            </div>


            {/* Coupon */}

            <div className="rounded-2xl border bg-white p-5">

              <h2 className="text-lg font-bold">
                Coupon
              </h2>


              <input
                type="text"
                value={
                  couponCode
                }
                onChange={
                  (
                    event
                  ) => {

                    setCouponCode(
                      event.target.value
                        .toUpperCase()
                    );


                    setCheckoutError(
                      ""
                    );
                  }
                }
                placeholder="Enter coupon code"
                className="mt-3 w-full rounded-xl border px-4 py-3 outline-none"
              />

            </div>


            {/* Order Note */}

            <div className="rounded-2xl border bg-white p-5">

              <h2 className="text-lg font-bold">
                Order Note
              </h2>


              <textarea
                name="customer_note"
                value={
                  shippingForm.customer_note
                }
                onChange={
                  handleShippingChange
                }
                placeholder="Order note (optional)"
                rows={
                  3
                }
                className="mt-3 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>


          {/* =================================================
              Order Summary
          ================================================= */}

          <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-24">

            <h2 className="text-lg font-bold">
              Order Summary
            </h2>


            <div className="mt-5 space-y-5">

              {
                cartItems.map(
                  (
                    item,
                    index
                  ) => {

                    const color =
                      getCartColor(
                        item
                      );


                    const size =
                      getCartSize(
                        item
                      );


                    const variantSku =
                      getCartVariantSku(
                        item
                      );


                    const quantity =
                      Number(
                        item?.quantity ||
                        0
                      );


                    const itemTotal =
                      Number(
                        item?.price ||
                        0
                      ) *
                      quantity;


                    return (
                      <div
                        key={
                          getCartItemKey(
                            item,
                            index
                          )
                        }
                        className="border-b border-gray-100 pb-4 last:border-b-0"
                      >

                        <div className="flex justify-between gap-4 text-sm">

                          <div className="min-w-0">

                            <p className="font-semibold text-gray-900">
                              {
                                item?.name ||
                                "Product"
                              }{" "}
                              ×{" "}
                              {
                                quantity
                              }
                            </p>


                            {
                              (
                                color ||
                                size
                              ) && (

                                <p className="mt-1 text-xs text-gray-500">

                                  {
                                    color &&
                                    `Color: ${color}`
                                  }

                                  {
                                    color &&
                                    size &&
                                    " • "
                                  }

                                  {
                                    size &&
                                    `Size: ${size}`
                                  }

                                </p>

                              )
                            }


                            {
                              variantSku && (

                                <p className="mt-1 break-all text-xs text-gray-400">
                                  SKU:{" "}
                                  {
                                    variantSku
                                  }
                                </p>

                              )
                            }

                          </div>


                          <span className="whitespace-nowrap font-semibold">
                            ₹
                            {
                              itemTotal.toFixed(
                                2
                              )
                            }
                          </span>

                        </div>

                      </div>
                    );
                  }
                )
              }


              <div className="flex justify-between border-t pt-4 text-lg font-bold">

                <span>
                  Subtotal
                </span>


                <span>
                  ₹
                  {
                    displayedSubtotal.toFixed(
                      2
                    )
                  }
                </span>

              </div>

            </div>


            <label className="mt-6 flex items-start gap-3">

              <input
                type="checkbox"
                checked={
                  sendUpdates
                }
                onChange={
                  (
                    event
                  ) =>
                    setSendUpdates(
                      event.target.checked
                    )
                }
                className="mt-1"
              />


              <span className="text-sm">
                Send me order updates and offers
              </span>

            </label>


            {
              checkoutError && (

                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-600">
                  {checkoutError}
                </p>

              )
            }


            <button
              type="button"
              onClick={
                handlePlaceOrder
              }
              disabled={
                placingOrder ||
                addressesLoading
              }
              className="mt-5 w-full rounded-xl bg-black py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >

              {
                placingOrder
                  ? (
                      shippingForm.payment_method ===
                        "razorpay"
                        ? "Opening Payment..."
                        : "Placing Order..."
                    )
                  : (
                      shippingForm.payment_method ===
                        "razorpay"
                        ? `Pay ₹${displayedSubtotal.toFixed(
                            2
                          )}`
                        : `Place Order ₹${displayedSubtotal.toFixed(
                            2
                          )}`
                    )
              }

            </button>


            <p className="mt-4 text-center text-xs text-gray-500">
              By proceeding, I agree to Privacy Policy and Terms & Conditions.
            </p>

          </aside>

        </div>

      </div>

    </section>
  );
}


export default Checkout;