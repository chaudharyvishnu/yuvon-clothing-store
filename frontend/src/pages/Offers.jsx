import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  fetchOfferProducts,
} from "../services/api";

import {
  getDiscountPercentage,
} from "../utils/productHelpers";


const offerTabs = [
  "ALL",
  "Buy 2 Trousers. Save ₹99 Extra",
  "Any 2 Textured Tops = ₹99 Off",
  "Pocket Tights Combo ₹1599",
  "Shorts Combo @₹1399",
  "Stripe Tights Combo ₹1599",
  "Upto 40% off - New Arrivals",
  "Live Clearance Sale",
];


function extractProducts(
  response
) {
  if (
    Array.isArray(
      response
    )
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return response.results;
  }

  if (
    Array.isArray(
      response?.products
    )
  ) {
    return response.products;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
}


function normalizeImageValue(
  value
) {
  if (
    !value
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }

  if (
    typeof value ===
    "object"
  ) {
    return (
      value?.url ||
      value?.image_url ||
      value?.image ||
      ""
    );
  }

  return "";
}


function getProductImages(
  product
) {
  const candidates = [
    normalizeImageValue(
      product?.main_image_url
    ),

    normalizeImageValue(
      product?.main_image
    ),

    normalizeImageValue(
      product?.image_url
    ),

    normalizeImageValue(
      product?.image
    ),
  ];


  if (
    Array.isArray(
      product?.images
    )
  ) {
    product.images.forEach(
      (
        image
      ) => {

        candidates.push(
          normalizeImageValue(
            image?.image_url
          )
        );

        candidates.push(
          normalizeImageValue(
            image?.image
          )
        );

        candidates.push(
          normalizeImageValue(
            image
          )
        );
      }
    );
  }


  return [
    ...new Set(
      candidates.filter(
        Boolean
      )
    ),
  ];
}


function formatCurrency(
  value
) {
  const amount =
    Number(
      value ?? 0
    );

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "₹0";
  }

  return amount.toLocaleString(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      maximumFractionDigits:
        2,
    }
  );
}


function ProductImage({
  product,
}) {
  const images =
    getProductImages(
      product
    );

  const [
    imageIndex,
    setImageIndex,
  ] =
    useState(0);


  useEffect(
    () => {
      setImageIndex(
        0
      );
    },
    [
      product?.id,
    ]
  );


  const image =
    images[
      imageIndex
    ] ||
    "";


  if (
    !image
  ) {
    return (
      <div className="flex h-80 w-full items-center justify-center bg-gray-100 text-gray-400">
        No image available
      </div>
    );
  }


  return (
    <img
      src={
        image
      }
      alt={
        product?.name ||
        "Yuvon product"
      }
      className="h-80 w-full object-cover transition duration-500 group-hover:scale-105"
      onError={() => {

        if (
          imageIndex <
          images.length - 1
        ) {
          setImageIndex(
            (
              current
            ) =>
              current + 1
          );
        } else {
          setImageIndex(
            images.length
          );
        }

      }}
    />
  );
}


function Offers() {
  const navigate =
    useNavigate();

  const [
    products,
    setProducts,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(
    () => {
      let cancelled =
        false;


      const loadOffers =
        async () => {
          try {

            setLoading(
              true
            );

            setError(
              ""
            );


            const response =
              await fetchOfferProducts(
                20
              );


            const offerItems =
              extractProducts(
                response
              );


            if (
              !cancelled
            ) {
              setProducts(
                offerItems
              );
            }

          } catch (
            loadError
          ) {

            if (
              !cancelled
            ) {
              setProducts(
                []
              );

              setError(
                loadError?.message ||
                  "Unable to load offer products."
              );
            }

          } finally {

            if (
              !cancelled
            ) {
              setLoading(
                false
              );
            }
          }
        };


      loadOffers();


      return () => {
        cancelled =
          true;
      };
    },
    []
  );


  const handleProductClick =
    (
      product
    ) => {

      if (
        !product?.id
      ) {
        return;
      }


      navigate(
        `/product/${product.id}`
      );
    };


  const handleShopOffers =
    () => {

      navigate(
        "/shop?offer=true"
      );
    };


  const handleTabClick =
    (
      tab
    ) => {

      if (
        tab ===
        "ALL"
      ) {
        return;
      }


      if (
        tab ===
        "Live Clearance Sale"
      ) {
        navigate(
          "/clearance-sale"
        );

        return;
      }


      if (
        tab ===
        "Upto 40% off - New Arrivals"
      ) {
        navigate(
          "/new-arrivals"
        );
      }
    };


  return (
    <section className="min-h-screen bg-white">

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* =================================================
            Page Heading
        ================================================= */}

        <h1 className="mb-10 text-5xl font-extrabold md:text-6xl">
          YUVON OFFERS OF THE SEASON
        </h1>


        {/* =================================================
            Offer Tabs
        ================================================= */}

        <div className="mb-12 flex gap-3 overflow-x-auto border-b-4 border-gray-700 pb-3">

          {offerTabs.map(
            (
              tab,
              index
            ) => (

              <button
                key={tab}
                type="button"
                onClick={() =>
                  handleTabClick(
                    tab
                  )
                }
                className={`whitespace-nowrap border px-5 py-3 font-semibold transition ${
                  index === 0
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>

            )
          )}

        </div>


        {/* =================================================
            Offer Banner
        ================================================= */}

        <div className="mb-14 grid items-center gap-8 rounded-2xl bg-blue-100 p-8 md:grid-cols-2">

          <div>

            <p className="mb-5 inline-block rounded-full bg-white px-4 py-2 text-sm">
              Exclusive Season Deals
            </p>


            <h2 className="mb-4 text-4xl font-bold">
              Flat discounts on selected styles
            </h2>


            <p className="mb-6 text-gray-700">
              Grab limited-time offers on trousers,
              tops, co-ord sets and more.
            </p>


            <button
              type="button"
              onClick={
                handleShopOffers
              }
              className="rounded-lg bg-black px-8 py-4 font-bold text-white transition hover:bg-gray-800"
            >
              SHOP OFFERS
            </button>

          </div>


          <img
            src="https://images.unsplash.com/photo-1496747611176-843222e1e57c"
            alt="Yuvon offer banner"
            className="h-96 w-full rounded-2xl object-cover"
          />

        </div>


        {/* =================================================
            Loading
        ================================================= */}

        {loading && (

          <div className="py-20 text-center">

            <p className="text-lg font-medium text-gray-600">
              Loading offers...
            </p>

          </div>

        )}


        {/* =================================================
            Error
        ================================================= */}

        {!loading &&
          error && (

            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">

              <p className="font-medium text-red-600">
                {error}
              </p>

            </div>

          )}


        {/* =================================================
            Empty
        ================================================= */}

        {!loading &&
          !error &&
          products.length ===
            0 && (

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">

              <h2 className="text-2xl font-bold text-gray-900">
                No offers available
              </h2>


              <p className="mt-2 text-gray-500">
                Products marked as offers will
                automatically appear here.
              </p>

            </div>

          )}


        {/* =================================================
            Offer Products
        ================================================= */}

        {!loading &&
          !error &&
          products.length >
            0 && (

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

              {products.map(
                (
                  product
                ) => {

                  const price =
                    Number(
                      product?.price ??
                        0
                    );


                  const oldPrice =
                    Number(
                      product?.old_price ??
                        0
                    );


                  const discount =
                    getDiscountPercentage(
                      product
                    );


                  const rating =
                    Number(
                      product?.rating ??
                        0
                    );


                  return (

                    <article
                      key={
                        product.id
                      }
                      onClick={() =>
                        handleProductClick(
                          product
                        )
                      }
                      className="group cursor-pointer"
                    >

                      {/* Image */}

                      <div className="relative overflow-hidden rounded-lg bg-gray-100">

                        <ProductImage
                          product={
                            product
                          }
                        />


                        {discount >
                          0 && (

                          <span className="absolute left-4 top-4 rounded bg-red-500 px-4 py-2 text-sm font-semibold text-white">
                            {discount}% OFF
                          </span>

                        )}


                        {product
                          ?.is_offer && (

                          <span className="absolute bottom-4 left-4 rounded bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                            Offer
                          </span>

                        )}

                      </div>


                      {/* Product Details */}

                      <div className="pt-4">

                        <div className="flex items-start justify-between gap-3">

                          <h3 className="text-lg font-medium transition group-hover:text-blue-600">
                            {product?.name ||
                              "Product"}
                          </h3>


                          <span className="whitespace-nowrap text-sm text-gray-700">
                            ★{" "}
                            {Number.isFinite(
                              rating
                            )
                              ? rating.toFixed(
                                  1
                                )
                              : "0.0"}
                          </span>

                        </div>


                        {/* Price */}

                        <div className="mt-2 flex flex-wrap items-center gap-3">

                          {Number.isFinite(
                            oldPrice
                          ) &&
                            oldPrice >
                              price && (

                              <span className="text-gray-400 line-through">
                                {formatCurrency(
                                  oldPrice
                                )}
                              </span>

                            )}


                          <span className="font-semibold text-red-600">
                            {formatCurrency(
                              price
                            )}
                          </span>

                        </div>


                        {/* Savings */}

                        {Number.isFinite(
                          oldPrice
                        ) &&
                          Number.isFinite(
                            price
                          ) &&
                          oldPrice >
                            price && (

                            <p className="mt-2 text-sm font-medium text-green-700">
                              You save{" "}
                              {formatCurrency(
                                oldPrice -
                                  price
                              )}
                            </p>

                          )}


                        {/* Stock */}

                        {product?.is_in_stock ===
                          false && (

                          <p className="mt-2 text-sm font-semibold text-red-600">
                            Out of stock
                          </p>

                        )}

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          )}


        {/* =================================================
            Benefits
        ================================================= */}

        <div className="mt-20 grid gap-10 text-center md:grid-cols-3">

          <div>

            <div className="mb-4 text-6xl">
              📦
            </div>

            <h3 className="text-3xl font-semibold">
              Cash on Delivery Available
            </h3>

          </div>


          <div>

            <div className="mb-4 text-6xl">
              %
            </div>

            <h3 className="text-3xl font-semibold">
              Exclusive Discounts
            </h3>

          </div>


          <div>

            <div className="mb-4 text-6xl">
              ↩
            </div>

            <h3 className="text-3xl font-semibold">
              7-Day Easy Returns & Exchanges
            </h3>

          </div>

        </div>

      </div>

    </section>
  );
}


export default Offers;