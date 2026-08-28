import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createAdminProduct,
  fetchAdminProductDetail,
  updateAdminProduct,

  fetchAdminProductVariants,
  createAdminProductVariant,
  updateAdminProductVariant,
  deleteAdminProductVariant,

  fetchAdminProductImages,
  createAdminProductImage,
  updateAdminProductImage,
  deleteAdminProductImage,

  fetchBrands,
  fetchDepartments,
  fetchCategories,
  fetchSubCategories,
} from "../../services/api";

import "../../styles/dashboard.css";


const INITIAL_FORM = {
  name: "",
  slug: "",
  sku: "",

  brand: "",
  department: "",
  category: "",
  subcategory: "",

  description: "",

  price: "",
  old_price: "",

  main_image: null,
  main_image_url: "",

  meta_title: "",
  meta_description: "",

  is_active: true,
  is_featured: false,
  is_trending: false,
  is_best_seller: false,
  is_new_arrival: false,
  is_offer: false,
  is_clearance_sale: false,
};


const INITIAL_VARIANT_FORM = {
  color: "",
  color_code: "",
  size: "",
  stock: "",
  sku: "",
  is_active: true,
};


const INITIAL_IMAGE_FORM = {
  image: null,
  alt_text: "",
  order: "0",
};


// =========================================================
// Helpers
// =========================================================

function normalizeListResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  return [];
}


function createSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function getRelationId(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return value.id ?? "";
  }

  return value;
}


function getErrorMessage(error) {
  if (
    error?.data &&
    typeof error.data ===
      "object"
  ) {
    const messages =
      Object.entries(
        error.data
      ).flatMap(
        ([
          field,
          value,
        ]) => {
          if (
            Array.isArray(value)
          ) {
            return value.map(
              (message) => {
                if (
                  typeof message ===
                  "object"
                ) {
                  return (
                    `${field}: ` +
                    JSON.stringify(
                      message
                    )
                  );
                }

                return (
                  `${field}: ${message}`
                );
              }
            );
          }

          if (
            typeof value ===
            "string"
          ) {
            return [
              `${field}: ${value}`,
            ];
          }

          if (
            value &&
            typeof value ===
              "object"
          ) {
            return [
              (
                `${field}: ` +
                JSON.stringify(
                  value
                )
              ),
            ];
          }

          return [];
        }
      );

    if (messages.length) {
      return messages.join(
        " | "
      );
    }
  }

  return (
    error?.message ||
    "Something went wrong."
  );
}


// =========================================================
// Component
// =========================================================

const AdminProductForm = () => {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const isEditMode =
    Boolean(id);


  // =======================================================
  // Product State
  // =======================================================

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );


  const [
    productId,
    setProductId,
  ] = useState(
    id || ""
  );


  const [
    mainImagePreview,
    setMainImagePreview,
  ] = useState("");


  // =======================================================
  // Classification State
  // =======================================================

  const [
    brands,
    setBrands,
  ] = useState([]);


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


  // =======================================================
  // Variant State
  // =======================================================

  const [
    variants,
    setVariants,
  ] = useState([]);


  const [
    variantForm,
    setVariantForm,
  ] = useState(
    INITIAL_VARIANT_FORM
  );


  const [
    editingVariantId,
    setEditingVariantId,
  ] = useState(null);


  const [
    variantSaving,
    setVariantSaving,
  ] = useState(false);


  const [
    variantDeletingId,
    setVariantDeletingId,
  ] = useState(null);


  // =======================================================
  // Gallery State
  // =======================================================

  const [
    images,
    setImages,
  ] = useState([]);


  const [
    imageForm,
    setImageForm,
  ] = useState(
    INITIAL_IMAGE_FORM
  );


  const [
    imageInputKey,
    setImageInputKey,
  ] = useState(0);


  const [
    imageSaving,
    setImageSaving,
  ] = useState(false);


  const [
    imageDeletingId,
    setImageDeletingId,
  ] = useState(null);


  // =======================================================
  // General State
  // =======================================================

  const [
    loading,
    setLoading,
  ] = useState(
    isEditMode
  );


  const [
    optionsLoading,
    setOptionsLoading,
  ] = useState(true);


  const [
    relatedLoading,
    setRelatedLoading,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  // =======================================================
  // Filtered Categories
  // =======================================================

  const filteredCategories =
    useMemo(
      () => {
        if (
          !form.department
        ) {
          return categories;
        }

        return categories.filter(
          (category) => {
            const departmentId =
              getRelationId(
                category?.department
              );

            if (!departmentId) {
              return true;
            }

            return (
              String(
                departmentId
              ) ===
              String(
                form.department
              )
            );
          }
        );
      },
      [
        categories,
        form.department,
      ]
    );


  const filteredSubCategories =
    useMemo(
      () => {
        if (
          !form.category
        ) {
          return subCategories;
        }

        return subCategories.filter(
          (subCategory) => {
            const categoryId =
              getRelationId(
                subCategory?.category
              );

            if (!categoryId) {
              return true;
            }

            return (
              String(
                categoryId
              ) ===
              String(
                form.category
              )
            );
          }
        );
      },
      [
        subCategories,
        form.category,
      ]
    );


  // =======================================================
  // Load Classification Options
  // =======================================================

  const loadOptions =
    useCallback(
      async () => {
        setOptionsLoading(true);

        try {
          const [
            brandsResponse,
            departmentsResponse,
            categoriesResponse,
            subCategoriesResponse,
          ] =
            await Promise.all([
              fetchBrands(),
              fetchDepartments(),
              fetchCategories(),
              fetchSubCategories(),
            ]);

          setBrands(
            normalizeListResponse(
              brandsResponse
            )
          );

          setDepartments(
            normalizeListResponse(
              departmentsResponse
            )
          );

          setCategories(
            normalizeListResponse(
              categoriesResponse
            )
          );

          setSubCategories(
            normalizeListResponse(
              subCategoriesResponse
            )
          );
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setOptionsLoading(false);
        }
      },
      []
    );


  // =======================================================
  // Load Product
  // =======================================================

  const loadProduct =
    useCallback(
      async () => {
        if (
          !isEditMode ||
          !id
        ) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const product =
            await fetchAdminProductDetail(
              id
            );

          const loadedProductId =
            product?.id ||
            id;

          const loadedMainImage =
            product?.main_image_url ||
            product?.main_image ||
            "";

          setProductId(
            loadedProductId
          );

          setMainImagePreview(
            loadedMainImage
          );

          setForm({
            name:
              product?.name ??
              "",

            slug:
              product?.slug ??
              "",

            sku:
              product?.sku ??
              "",

            brand:
              getRelationId(
                product?.brand
              ),

            department:
              getRelationId(
                product?.department
              ),

            category:
              getRelationId(
                product?.category
              ),

            subcategory:
              getRelationId(
                product?.subcategory
              ),

            description:
              product?.description ??
              "",

            price:
              product?.price ??
              "",

            old_price:
              product?.old_price ??
              "",

            main_image:
              null,

            main_image_url:
              loadedMainImage,

            meta_title:
              product?.meta_title ??
              "",

            meta_description:
              product?.meta_description ??
              "",

            is_active:
              product?.is_active !==
              false,

            is_featured:
              Boolean(
                product?.is_featured
              ),

            is_trending:
              Boolean(
                product?.is_trending
              ),

            is_best_seller:
              Boolean(
                product?.is_best_seller
              ),

            is_new_arrival:
              Boolean(
                product?.is_new_arrival
              ),

            is_offer:
              Boolean(
                product?.is_offer
              ),

            is_clearance_sale:
              Boolean(
                product?.is_clearance_sale
              ),
          });

          if (
            Array.isArray(
              product?.variants
            )
          ) {
            setVariants(
              product.variants
            );
          }
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        id,
        isEditMode,
      ]
    );


  // =======================================================
  // Load Variants + Gallery
  // IMPORTANT:
  // api.js expects productId directly.
  // =======================================================

  const loadRelatedData =
    useCallback(
      async (
        targetProductId
      ) => {
        if (!targetProductId) {
          return;
        }

        setRelatedLoading(true);

        try {
          const [
            variantsResponse,
            imagesResponse,
          ] =
            await Promise.all([
              fetchAdminProductVariants(
                targetProductId
              ),

              fetchAdminProductImages(
                targetProductId
              ),
            ]);

          setVariants(
            normalizeListResponse(
              variantsResponse
            )
          );

          setImages(
            normalizeListResponse(
              imagesResponse
            )
          );
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setRelatedLoading(false);
        }
      },
      []
    );


  // =======================================================
  // Effects
  // =======================================================

  useEffect(
    () => {
      loadOptions();
    },
    [
      loadOptions,
    ]
  );


  useEffect(
    () => {
      loadProduct();
    },
    [
      loadProduct,
    ]
  );


  useEffect(
    () => {
      if (productId) {
        loadRelatedData(
          productId
        );
      }
    },
    [
      productId,
      loadRelatedData,
    ]
  );


  useEffect(
    () => {
      return () => {
        if (
          mainImagePreview &&
          mainImagePreview.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            mainImagePreview
          );
        }
      };
    },
    [
      mainImagePreview,
    ]
  );


  // =======================================================
  // Product Handlers
  // =======================================================

  const handleChange =
    (event) => {
      const {
        name,
        value,
        type,
        checked,
      } =
        event.target;

      setForm(
        (currentForm) => {
          const nextForm = {
            ...currentForm,

            [name]:
              type ===
              "checkbox"
                ? checked
                : value,
          };

          if (
            name === "name" &&
            !isEditMode
          ) {
            nextForm.slug =
              createSlug(
                value
              );
          }

          if (
            name ===
            "department"
          ) {
            nextForm.category =
              "";

            nextForm.subcategory =
              "";
          }

          if (
            name ===
            "category"
          ) {
            nextForm.subcategory =
              "";
          }

          return nextForm;
        }
      );
    };


  // =======================================================
  // Main Product Image
  // =======================================================

  const handleMainImageChange =
    (event) => {
      const file =
        event.target
          .files?.[0] ||
        null;

      setForm(
        (current) => ({
          ...current,

          main_image:
            file,
        })
      );

      if (!file) {
        setMainImagePreview(
          form.main_image_url ||
          ""
        );

        return;
      }

      const previewUrl =
        URL.createObjectURL(
          file
        );

      setMainImagePreview(
        previewUrl
      );
    };


  const clearSelectedMainImage =
    () => {
      setForm(
        (current) => ({
          ...current,

          main_image:
            null,
        })
      );

      setMainImagePreview(
        form.main_image_url ||
        ""
      );
    };


  // =======================================================
  // Product Validation
  // =======================================================

  const validateForm =
    () => {
      if (
        !String(
          form.name
        ).trim()
      ) {
        return (
          "Product name is required."
        );
      }

      if (
        !String(
          form.slug
        ).trim()
      ) {
        return (
          "Slug is required."
        );
      }

      if (
        !String(
          form.sku
        ).trim()
      ) {
        return (
          "SKU is required."
        );
      }

      if (
        form.price === "" ||
        Number.isNaN(
          Number(
            form.price
          )
        )
      ) {
        return (
          "Valid selling price is required."
        );
      }

      if (
        Number(
          form.price
        ) < 0
      ) {
        return (
          "Selling price cannot be negative."
        );
      }

      if (
        form.old_price !== "" &&
        Number.isNaN(
          Number(
            form.old_price
          )
        )
      ) {
        return (
          "Old price must be a valid number."
        );
      }

      if (
        form.old_price !== "" &&
        Number(
          form.old_price
        ) < 0
      ) {
        return (
          "Old price cannot be negative."
        );
      }

      if (
        form.old_price !== "" &&
        Number(
          form.old_price
        ) <
        Number(
          form.price
        )
      ) {
        return (
          "Old price cannot be lower than selling price."
        );
      }

      return "";
    };


  // =======================================================
  // Build Product Payload
  // =======================================================

  const buildProductObject =
    () => ({
      name:
        String(
          form.name
        ).trim(),

      slug:
        String(
          form.slug ||
          createSlug(
            form.name
          )
        ).trim(),

      sku:
        String(
          form.sku
        ).trim(),

      description:
        String(
          form.description ||
          ""
        ).trim(),

      price:
        String(
          form.price
        ),

      old_price:
        form.old_price === ""
          ? null
          : String(
              form.old_price
            ),

      meta_title:
        String(
          form.meta_title ||
          ""
        ).trim(),

      meta_description:
        String(
          form.meta_description ||
          ""
        ).trim(),

      is_active:
        Boolean(
          form.is_active
        ),

      is_featured:
        Boolean(
          form.is_featured
        ),

      is_trending:
        Boolean(
          form.is_trending
        ),

      is_best_seller:
        Boolean(
          form.is_best_seller
        ),

      is_new_arrival:
        Boolean(
          form.is_new_arrival
        ),

      is_offer:
        Boolean(
          form.is_offer
        ),

      is_clearance_sale:
        Boolean(
          form.is_clearance_sale
        ),

      brand:
        form.brand
          ? Number(
              form.brand
            )
          : null,

      department:
        form.department
          ? Number(
              form.department
            )
          : null,

      category:
        form.category
          ? Number(
              form.category
            )
          : null,

      subcategory:
        form.subcategory
          ? Number(
              form.subcategory
            )
          : null,
    });


  const buildProductPayload =
    () => {
      const payload =
        buildProductObject();

      if (
        !form.main_image
      ) {
        return payload;
      }

      const formData =
        new FormData();

      Object.entries(
        payload
      ).forEach(
        ([key, value]) => {
          if (
            value ===
              undefined ||
            value ===
              null
          ) {
            return;
          }

          if (
            typeof value ===
            "boolean"
          ) {
            formData.append(
              key,
              value
                ? "true"
                : "false"
            );

            return;
          }

          formData.append(
            key,
            String(
              value
            )
          );
        }
      );

      formData.append(
        "main_image",
        form.main_image
      );

      return formData;
    };


  // =======================================================
  // Save Product
  // =======================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setSuccessMessage("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      setSaving(true);

      try {
        const payload =
          buildProductPayload();

        let product;

        if (isEditMode) {
          product =
            await updateAdminProduct(
              id,
              payload
            );

          setSuccessMessage(
            "Product updated successfully."
          );
        } else {
          product =
            await createAdminProduct(
              payload
            );

          setSuccessMessage(
            "Product created successfully."
          );
        }

        const savedProductId =
          product?.id ||
          productId ||
          id;

        const savedMainImage =
          product?.main_image_url ||
          product?.main_image ||
          "";

        if (
          savedMainImage
        ) {
          setMainImagePreview(
            savedMainImage
          );

          setForm(
            (current) => ({
              ...current,

              main_image:
                null,

              main_image_url:
                savedMainImage,
            })
          );
        }

        if (savedProductId) {
          setProductId(
            savedProductId
          );

          await loadRelatedData(
            savedProductId
          );

          if (!isEditMode) {
            navigate(
              `/admin/products/${savedProductId}`,
              {
                replace:
                  true,
              }
            );
          }
        }
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setSaving(false);
      }
    };


  // =======================================================
  // Variant Handlers
  // =======================================================

  const handleVariantChange =
    (event) => {
      const {
        name,
        value,
        checked,
        type,
      } =
        event.target;

      setVariantForm(
        (current) => ({
          ...current,

          [name]:
            type ===
            "checkbox"
              ? checked
              : value,
        })
      );
    };


  const resetVariantForm =
    () => {
      setVariantForm({
        ...INITIAL_VARIANT_FORM,
      });

      setEditingVariantId(
        null
      );
    };


  const handleVariantEdit =
    (variant) => {
      setEditingVariantId(
        variant.id
      );

      setVariantForm({
        color:
          variant?.color ??
          "",

        color_code:
          variant?.color_code ??
          "",

        size:
          variant?.size ??
          "",

        stock:
          variant?.stock ??
          "",

        sku:
          variant?.sku ??
          "",

        is_active:
          variant?.is_active !==
          false,
      });
    };


  const handleVariantSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setSuccessMessage("");

      if (!productId) {
        setError(
          "Save the product before adding variants."
        );

        return;
      }

      if (
        !String(
          variantForm.color
        ).trim()
      ) {
        setError(
          "Variant color is required."
        );

        return;
      }

      if (
        !String(
          variantForm.size
        ).trim()
      ) {
        setError(
          "Variant size is required."
        );

        return;
      }

      if (
        variantForm.stock === "" ||
        Number.isNaN(
          Number(
            variantForm.stock
          )
        ) ||
        Number(
          variantForm.stock
        ) < 0
      ) {
        setError(
          "Variant stock must be zero or greater."
        );

        return;
      }

      setVariantSaving(true);

      const payload = {
        product:
          Number(
            productId
          ),

        color:
          String(
            variantForm.color
          ).trim(),

        color_code:
          String(
            variantForm.color_code ||
            ""
          ).trim(),

        size:
          String(
            variantForm.size
          ).trim(),

        stock:
          Number(
            variantForm.stock
          ),

        sku:
          String(
            variantForm.sku ||
            ""
          ).trim() ||
          null,

        is_active:
          Boolean(
            variantForm.is_active
          ),
      };

      try {
        if (
          editingVariantId
        ) {
          await updateAdminProductVariant(
            editingVariantId,
            payload
          );

          setSuccessMessage(
            "Variant updated successfully."
          );
        } else {
          await createAdminProductVariant(
            payload
          );

          setSuccessMessage(
            "Variant added successfully."
          );
        }

        resetVariantForm();

        await loadRelatedData(
          productId
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setVariantSaving(false);
      }
    };


  const handleVariantDelete =
    async (
      variantId
    ) => {
      const confirmed =
        window.confirm(
          "Delete this product variant?"
        );

      if (!confirmed) {
        return;
      }

      setVariantDeletingId(
        variantId
      );

      setError("");
      setSuccessMessage("");

      try {
        await deleteAdminProductVariant(
          variantId
        );

        setSuccessMessage(
          "Variant deleted successfully."
        );

        if (
          editingVariantId ===
          variantId
        ) {
          resetVariantForm();
        }

        await loadRelatedData(
          productId
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setVariantDeletingId(
          null
        );
      }
    };


  // =======================================================
  // Gallery Handlers
  // =======================================================

  const handleImageChange =
    (event) => {
      const {
        name,
        value,
        files,
      } =
        event.target;

      if (
        name ===
        "image"
      ) {
        setImageForm(
          (current) => ({
            ...current,

            image:
              files?.[0] ||
              null,
          })
        );

        return;
      }

      setImageForm(
        (current) => ({
          ...current,

          [name]:
            value,
        })
      );
    };


  const resetImageForm =
    () => {
      setImageForm({
        ...INITIAL_IMAGE_FORM,
      });

      setImageInputKey(
        (current) =>
          current + 1
      );
    };


  const handleImageUpload =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setSuccessMessage("");

      if (!productId) {
        setError(
          "Save the product before uploading images."
        );

        return;
      }

      if (
        !imageForm.image
      ) {
        setError(
          "Select an image to upload."
        );

        return;
      }

      setImageSaving(true);

      const formData =
        new FormData();

      formData.append(
        "product",
        String(
          productId
        )
      );

      formData.append(
        "image",
        imageForm.image
      );

      formData.append(
        "alt_text",
        String(
          imageForm.alt_text ||
          ""
        ).trim()
      );

      formData.append(
        "order",
        String(
          Number(
            imageForm.order ||
            0
          )
        )
      );

      try {
        await createAdminProductImage(
          formData
        );

        setSuccessMessage(
          "Gallery image uploaded successfully."
        );

        resetImageForm();

        await loadRelatedData(
          productId
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setImageSaving(false);
      }
    };


  const handleImageOrderChange =
    async (
      image,
      nextOrder
    ) => {
      if (
        nextOrder === ""
      ) {
        return;
      }

      try {
        await updateAdminProductImage(
          image.id,
          {
            alt_text:
              image.alt_text ||
              "",

            order:
              Number(
                nextOrder
              ),
          }
        );

        await loadRelatedData(
          productId
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      }
    };


  const handleImageDelete =
    async (
      imageId
    ) => {
      const confirmed =
        window.confirm(
          "Delete this product image?"
        );

      if (!confirmed) {
        return;
      }

      setImageDeletingId(
        imageId
      );

      setError("");
      setSuccessMessage("");

      try {
        await deleteAdminProductImage(
          imageId
        );

        setSuccessMessage(
          "Product image deleted successfully."
        );

        await loadRelatedData(
          productId
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setImageDeletingId(
          null
        );
      }
    };


  // =======================================================
  // Loading
  // =======================================================

  if (loading) {
    return (
      <main className="admin-dashboard-page">

        <section className="dashboard-panel">
          Loading product...
        </section>

      </main>
    );
  }


  // =======================================================
  // Render
  // =======================================================

  return (
    <main className="admin-dashboard-page">

      <section className="dashboard-header">

        <div>

          <p className="dashboard-eyebrow">
            Yuvon Admin
          </p>

          <h1>
            {
              isEditMode
                ? "Edit Product"
                : "Add Product"
            }
          </h1>

          <p className="dashboard-subtitle">
            Manage product details,
            primary image, pricing,
            variants, stock and gallery.
          </p>

        </div>


        <div className="dashboard-header-actions">

          <Link
            to="/admin/products"
            className="dashboard-button dashboard-button-secondary"
          >
            Back to Products
          </Link>

        </div>

      </section>


      {
        error && (
          <section className="dashboard-error">
            {error}
          </section>
        )
      }


      {
        successMessage && (
          <section
            className="dashboard-panel"
            style={{
              border:
                "1px solid #86efac",
            }}
          >
            {successMessage}
          </section>
        )
      }


      {/* =================================================
          PRODUCT FORM
      ================================================= */}

      <form
        onSubmit={
          handleSubmit
        }
      >

        {/* Basic Information */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <div>
                <h2>
                  Basic Information
                </h2>

                <p>
                  Main product details.
                </p>
              </div>

            </div>


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",

                gap:
                  "18px",
              }}
            >

              <div className="dashboard-filter-field">

                <label htmlFor="product-name">
                  Product Name *
                </label>

                <input
                  id="product-name"
                  name="name"
                  type="text"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="dashboard-filter-field">

                <label htmlFor="product-sku">
                  Product SKU *
                </label>

                <input
                  id="product-sku"
                  name="sku"
                  type="text"
                  value={
                    form.sku
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="dashboard-filter-field">

                <label htmlFor="product-slug">
                  Slug *
                </label>

                <input
                  id="product-slug"
                  name="slug"
                  type="text"
                  value={
                    form.slug
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

            </div>


            <div
              className="dashboard-filter-field"
              style={{
                marginTop:
                  "18px",
              }}
            >

              <label htmlFor="product-description">
                Description
              </label>

              <textarea
                id="product-description"
                name="description"
                rows="7"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </article>

        </section>


        {/* =================================================
            MAIN PRODUCT IMAGE
        ================================================= */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <div>

                <h2>
                  Main Product Image
                </h2>

                <p>
                  This is the primary image
                  shown on Shop, New Arrivals,
                  Offers and product cards.
                </p>

              </div>

            </div>


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "minmax(220px, 300px) minmax(280px, 1fr)",

                gap:
                  "24px",

                alignItems:
                  "start",
              }}
            >

              <div>

                {
                  mainImagePreview ? (
                    <img
                      src={
                        mainImagePreview
                      }
                      alt={
                        form.name ||
                        "Product"
                      }
                      style={{
                        width:
                          "100%",

                        maxWidth:
                          "280px",

                        height:
                          "320px",

                        objectFit:
                          "cover",

                        borderRadius:
                          "12px",

                        border:
                          "1px solid #e5e7eb",

                        background:
                          "#f9fafb",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width:
                          "100%",

                        maxWidth:
                          "280px",

                        height:
                          "320px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        border:
                          "1px dashed #d1d5db",

                        borderRadius:
                          "12px",

                        background:
                          "#f9fafb",

                        color:
                          "#9ca3af",
                      }}
                    >
                      No Main Image
                    </div>
                  )
                }

              </div>


              <div>

                <div className="dashboard-filter-field">

                  <label htmlFor="product-main-image">
                    {
                      form.main_image_url
                        ? "Replace Main Image"
                        : "Upload Main Image"
                    }
                  </label>

                  <input
                    id="product-main-image"
                    name="main_image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={
                      handleMainImageChange
                    }
                  />

                </div>


                {
                  form.main_image && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                      }}
                    >

                      <p>
                        <strong>
                          Selected:
                        </strong>{" "}

                        {
                          form.main_image.name
                        }
                      </p>


                      <button
                        type="button"
                        className="dashboard-button dashboard-button-secondary"
                        style={{
                          marginTop:
                            "10px",
                        }}
                        onClick={
                          clearSelectedMainImage
                        }
                      >
                        Cancel Selected Image
                      </button>

                    </div>
                  )
                }


                <p
                  style={{
                    marginTop:
                      "14px",

                    color:
                      "#6b7280",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.5,
                  }}
                >
                  Save / Update Product after
                  selecting the image. This image
                  is separate from gallery images.
                </p>

              </div>

            </div>

          </article>

        </section>


        {/* Classification */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <div>

                <h2>
                  Product Classification
                </h2>

                <p>
                  Brand, department,
                  category and subcategory.
                </p>

              </div>

            </div>


            {
              optionsLoading && (
                <p>
                  Loading product options...
                </p>
              )
            }


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",

                gap:
                  "18px",
              }}
            >

              <div className="dashboard-filter-field">

                <label>
                  Brand
                </label>

                <select
                  name="brand"
                  value={
                    form.brand
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    optionsLoading
                  }
                >

                  <option value="">
                    Select Brand
                  </option>

                  {
                    brands.map(
                      (brand) => (
                        <option
                          key={
                            brand.id
                          }
                          value={
                            brand.id
                          }
                        >
                          {
                            brand.name
                          }
                        </option>
                      )
                    )
                  }

                </select>

              </div>


              <div className="dashboard-filter-field">

                <label>
                  Department
                </label>

                <select
                  name="department"
                  value={
                    form.department
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    optionsLoading
                  }
                >

                  <option value="">
                    Select Department
                  </option>

                  {
                    departments.map(
                      (
                        department
                      ) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {
                            department.name
                          }
                        </option>
                      )
                    )
                  }

                </select>

              </div>


              <div className="dashboard-filter-field">

                <label>
                  Category
                </label>

                <select
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    optionsLoading
                  }
                >

                  <option value="">
                    Select Category
                  </option>

                  {
                    filteredCategories.map(
                      (
                        category
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )
                  }

                </select>

              </div>


              <div className="dashboard-filter-field">

                <label>
                  Subcategory
                </label>

                <select
                  name="subcategory"
                  value={
                    form.subcategory
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    optionsLoading
                  }
                >

                  <option value="">
                    Select Subcategory
                  </option>

                  {
                    filteredSubCategories.map(
                      (
                        subCategory
                      ) => (
                        <option
                          key={
                            subCategory.id
                          }
                          value={
                            subCategory.id
                          }
                        >
                          {
                            subCategory.name
                          }
                        </option>
                      )
                    )
                  }

                </select>

              </div>

            </div>

          </article>

        </section>


        {/* Pricing */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <h2>
                Pricing
              </h2>

            </div>


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",

                gap:
                  "18px",
              }}
            >

              <div className="dashboard-filter-field">

                <label>
                  Selling Price *
                </label>

                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.price
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="dashboard-filter-field">

                <label>
                  Old Price / MRP
                </label>

                <input
                  name="old_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.old_price
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

            </div>

          </article>

        </section>


        {/* SEO */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <h2>
                SEO
              </h2>

            </div>


            <div className="dashboard-filter-field">

              <label>
                Meta Title
              </label>

              <input
                name="meta_title"
                type="text"
                maxLength="200"
                value={
                  form.meta_title
                }
                onChange={
                  handleChange
                }
              />

            </div>


            <div
              className="dashboard-filter-field"
              style={{
                marginTop:
                  "18px",
              }}
            >

              <label>
                Meta Description
              </label>

              <textarea
                name="meta_description"
                rows="4"
                value={
                  form.meta_description
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </article>

        </section>


        {/* Visibility */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div className="dashboard-section-header">

              <h2>
                Store Visibility
              </h2>

            </div>


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",

                gap:
                  "14px",
              }}
            >

              {
                [
                  [
                    "is_active",
                    "Active",
                  ],

                  [
                    "is_new_arrival",
                    "New Arrival",
                  ],

                  [
                    "is_featured",
                    "Featured",
                  ],

                  [
                    "is_trending",
                    "Trending",
                  ],

                  [
                    "is_best_seller",
                    "Best Seller",
                  ],

                  [
                    "is_offer",
                    "Offer",
                  ],

                  [
                    "is_clearance_sale",
                    "Clearance Sale",
                  ],
                ].map(
                  ([
                    field,
                    label,
                  ]) => (
                    <label
                      key={
                        field
                      }
                    >

                      <input
                        type="checkbox"
                        name={
                          field
                        }
                        checked={
                          Boolean(
                            form[
                              field
                            ]
                          )
                        }
                        onChange={
                          handleChange
                        }
                      />{" "}

                      {label}

                    </label>
                  )
                )
              }

            </div>

          </article>

        </section>


        {/* Save Product */}

        <section className="dashboard-section">

          <article className="dashboard-panel">

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  "10px",

                flexWrap:
                  "wrap",
              }}
            >

              <Link
                to="/admin/products"
                className="dashboard-button dashboard-button-secondary"
              >
                Cancel
              </Link>


              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  saving ||
                  optionsLoading
                }
              >

                {
                  saving
                    ? "Saving..."
                    : isEditMode
                      ? "Update Product"
                      : "Create Product"
                }

              </button>

            </div>

          </article>

        </section>

      </form>


      {/* =================================================
          VARIANTS
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Product Variants
              </h2>

              <p>
                Manage color, size,
                stock and variant SKU.
              </p>

            </div>

          </div>


          {
            !productId ? (
              <p>
                Create the product first
                to add variants.
              </p>
            ) : (
              <>

                <form
                  onSubmit={
                    handleVariantSubmit
                  }
                >

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(160px, 1fr))",

                      gap:
                        "14px",
                    }}
                  >

                    <div className="dashboard-filter-field">

                      <label>
                        Color *
                      </label>

                      <input
                        name="color"
                        type="text"
                        value={
                          variantForm.color
                        }
                        onChange={
                          handleVariantChange
                        }
                        placeholder="Black"
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Color Code
                      </label>

                      <input
                        name="color_code"
                        type="text"
                        value={
                          variantForm.color_code
                        }
                        onChange={
                          handleVariantChange
                        }
                        placeholder="#000000"
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Size *
                      </label>

                      <input
                        name="size"
                        type="text"
                        value={
                          variantForm.size
                        }
                        onChange={
                          handleVariantChange
                        }
                        placeholder="M"
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Stock *
                      </label>

                      <input
                        name="stock"
                        type="number"
                        min="0"
                        value={
                          variantForm.stock
                        }
                        onChange={
                          handleVariantChange
                        }
                        placeholder="0"
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Variant SKU
                      </label>

                      <input
                        name="sku"
                        type="text"
                        value={
                          variantForm.sku
                        }
                        onChange={
                          handleVariantChange
                        }
                      />

                    </div>

                  </div>


                  <div
                    style={{
                      marginTop:
                        "14px",
                    }}
                  >

                    <label>

                      <input
                        type="checkbox"
                        name="is_active"
                        checked={
                          variantForm.is_active
                        }
                        onChange={
                          handleVariantChange
                        }
                      />{" "}

                      Active Variant

                    </label>

                  </div>


                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "10px",

                      marginTop:
                        "18px",

                      flexWrap:
                        "wrap",
                    }}
                  >

                    <button
                      type="submit"
                      className="dashboard-button dashboard-button-primary"
                      disabled={
                        variantSaving
                      }
                    >

                      {
                        variantSaving
                          ? "Saving..."
                          : editingVariantId
                            ? "Update Variant"
                            : "Add Variant"
                      }

                    </button>


                    {
                      editingVariantId && (
                        <button
                          type="button"
                          className="dashboard-button dashboard-button-secondary"
                          onClick={
                            resetVariantForm
                          }
                        >
                          Cancel Edit
                        </button>
                      )
                    }

                  </div>

                </form>


                <div
                  className="dashboard-table-wrap"
                  style={{
                    marginTop:
                      "24px",
                  }}
                >

                  <table className="dashboard-table">

                    <thead>

                      <tr>

                        <th>Color</th>
                        <th>Size</th>
                        <th>SKU</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>

                      </tr>

                    </thead>


                    <tbody>

                      {
                        variants.length ? (
                          variants.map(
                            (
                              variant
                            ) => (
                              <tr
                                key={
                                  variant.id
                                }
                              >

                                <td>
                                  {
                                    variant.color ||
                                    "-"
                                  }
                                </td>

                                <td>
                                  {
                                    variant.size ||
                                    "-"
                                  }
                                </td>

                                <td>
                                  {
                                    variant.sku ||
                                    "-"
                                  }
                                </td>

                                <td>
                                  {
                                    variant.stock ??
                                    0
                                  }
                                </td>

                                <td>
                                  {
                                    variant.is_active
                                      ? "Active"
                                      : "Inactive"
                                  }
                                </td>

                                <td>

                                  <div
                                    style={{
                                      display:
                                        "flex",

                                      gap:
                                        "8px",

                                      flexWrap:
                                        "wrap",
                                    }}
                                  >

                                    <button
                                      type="button"
                                      className="dashboard-button dashboard-button-secondary"
                                      onClick={
                                        () =>
                                          handleVariantEdit(
                                            variant
                                          )
                                      }
                                    >
                                      Edit
                                    </button>


                                    <button
                                      type="button"
                                      className="dashboard-button dashboard-button-secondary"
                                      disabled={
                                        variantDeletingId ===
                                        variant.id
                                      }
                                      onClick={
                                        () =>
                                          handleVariantDelete(
                                            variant.id
                                          )
                                      }
                                    >

                                      {
                                        variantDeletingId ===
                                        variant.id
                                          ? "Deleting..."
                                          : "Delete"
                                      }

                                    </button>

                                  </div>

                                </td>

                              </tr>
                            )
                          )
                        ) : (
                          <tr>

                            <td
                              colSpan="6"
                            >
                              No variants added yet.
                            </td>

                          </tr>
                        )
                      }

                    </tbody>

                  </table>

                </div>

              </>
            )
          }

        </article>

      </section>


      {/* =================================================
          GALLERY
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Product Gallery
              </h2>

              <p>
                Additional product images.
                Main image is managed separately above.
              </p>

            </div>

          </div>


          {
            !productId ? (
              <p>
                Create the product first
                to upload gallery images.
              </p>
            ) : (
              <>

                <form
                  onSubmit={
                    handleImageUpload
                  }
                >

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",

                      gap:
                        "14px",
                    }}
                  >

                    <div className="dashboard-filter-field">

                      <label>
                        Gallery Image *
                      </label>

                      <input
                        key={
                          imageInputKey
                        }
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={
                          handleImageChange
                        }
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Alt Text
                      </label>

                      <input
                        type="text"
                        name="alt_text"
                        value={
                          imageForm.alt_text
                        }
                        onChange={
                          handleImageChange
                        }
                      />

                    </div>


                    <div className="dashboard-filter-field">

                      <label>
                        Display Order
                      </label>

                      <input
                        type="number"
                        name="order"
                        min="0"
                        value={
                          imageForm.order
                        }
                        onChange={
                          handleImageChange
                        }
                      />

                    </div>

                  </div>


                  <div
                    style={{
                      marginTop:
                        "18px",
                    }}
                  >

                    <button
                      type="submit"
                      className="dashboard-button dashboard-button-primary"
                      disabled={
                        imageSaving
                      }
                    >

                      {
                        imageSaving
                          ? "Uploading..."
                          : "Upload Gallery Image"
                      }

                    </button>

                  </div>

                </form>


                {
                  relatedLoading && (
                    <p
                      style={{
                        marginTop:
                          "18px",
                      }}
                    >
                      Loading product media...
                    </p>
                  )
                }


                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",

                    gap:
                      "18px",

                    marginTop:
                      "24px",
                  }}
                >

                  {
                    images.map(
                      (image) => (
                        <div
                          key={
                            image.id
                          }
                          style={{
                            border:
                              "1px solid #e5e7eb",

                            borderRadius:
                              "10px",

                            overflow:
                              "hidden",

                            background:
                              "#fff",
                          }}
                        >

                          {
                            (
                              image.image_url ||
                              image.image
                            ) && (
                              <img
                                src={
                                  image.image_url ||
                                  image.image
                                }
                                alt={
                                  image.alt_text ||
                                  form.name
                                }
                                style={{
                                  width:
                                    "100%",

                                  height:
                                    "180px",

                                  objectFit:
                                    "cover",

                                  display:
                                    "block",
                                }}
                              />
                            )
                          }


                          <div
                            style={{
                              padding:
                                "12px",
                            }}
                          >

                            <p>

                              <strong>
                                {
                                  image.alt_text ||
                                  "Product Image"
                                }
                              </strong>

                            </p>


                            <div className="dashboard-filter-field">

                              <label>
                                Order
                              </label>

                              <input
                                type="number"
                                min="0"
                                defaultValue={
                                  image.order ??
                                  0
                                }
                                onBlur={
                                  (
                                    event
                                  ) =>
                                    handleImageOrderChange(
                                      image,
                                      event.target.value
                                    )
                                }
                              />

                            </div>


                            <button
                              type="button"
                              className="dashboard-button dashboard-button-secondary"
                              style={{
                                marginTop:
                                  "10px",
                              }}
                              disabled={
                                imageDeletingId ===
                                image.id
                              }
                              onClick={
                                () =>
                                  handleImageDelete(
                                    image.id
                                  )
                              }
                            >

                              {
                                imageDeletingId ===
                                image.id
                                  ? "Deleting..."
                                  : "Delete Image"
                              }

                            </button>

                          </div>

                        </div>
                      )
                    )
                  }


                  {
                    !images.length &&
                    !relatedLoading && (
                      <p>
                        No gallery images uploaded yet.
                      </p>
                    )
                  }

                </div>

              </>
            )
          }

        </article>

      </section>

    </main>
  );
};


export default AdminProductForm;