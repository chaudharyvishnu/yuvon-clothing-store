import {
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  bulkUploadAdminProducts,
  bulkUploadAdminVariants,
  bulkUploadAdminProductImages,
} from "../../services/api";

import "../../styles/dashboard.css";


// =========================================================
// Constants
// =========================================================

const EMPTY_RESULT = {
  created: 0,
  updated: 0,
  skipped: 0,

  main_images: 0,
  gallery_images: 0,

  message: "",
  detail: "",

  errors: [],
};


const EXCEL_EXTENSIONS = [
  ".xlsx",
  ".xls",
];


const ZIP_EXTENSIONS = [
  ".zip",
];


// =========================================================
// Helpers
// =========================================================

function getErrorMessage(
  error
) {
  if (
    error?.data &&
    typeof error.data ===
      "object"
  ) {
    const messages =
      Object.entries(
        error.data
      ).flatMap(
        (
          [
            field,
            value,
          ]
        ) => {
          if (
            Array.isArray(
              value
            )
          ) {
            return value.map(
              (
                message
              ) => {
                if (
                  message &&
                  typeof message ===
                    "object"
                ) {
                  return (
                    `${field}: ${JSON.stringify(
                      message
                    )}`
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
              `${field}: ${JSON.stringify(
                value
              )}`,
            ];
          }


          return [];
        }
      );


    if (
      messages.length
    ) {
      return messages.join(
        " | "
      );
    }
  }


  return (
    error?.message ||
    "Upload failed."
  );
}


function normalizeResult(
  response
) {
  if (
    !response ||
    typeof response !==
      "object"
  ) {
    return {
      ...EMPTY_RESULT,
    };
  }


  return {
    ...EMPTY_RESULT,
    ...response,

    created:
      Number(
        response?.created ??
        0
      ),

    updated:
      Number(
        response?.updated ??
        0
      ),

    skipped:
      Number(
        response?.skipped ??
        0
      ),

    main_images:
      Number(
        response?.main_images ??
        0
      ),

    gallery_images:
      Number(
        response?.gallery_images ??
        0
      ),

    errors:
      Array.isArray(
        response?.errors
      )
        ? response.errors
        : [],
  };
}


function getFileExtension(
  fileName
) {
  const name =
    String(
      fileName ||
      ""
    )
      .trim()
      .toLowerCase();


  const lastDotIndex =
    name.lastIndexOf(
      "."
    );


  if (
    lastDotIndex === -1
  ) {
    return "";
  }


  return name.slice(
    lastDotIndex
  );
}


function isAllowedFile(
  file,
  extensions
) {
  if (
    !file
  ) {
    return false;
  }


  return extensions.includes(
    getFileExtension(
      file.name
    )
  );
}


function formatFileSize(
  bytes
) {
  const size =
    Number(
      bytes ||
      0
    );


  if (
    !size
  ) {
    return "0 KB";
  }


  const oneKB =
    1024;


  const oneMB =
    oneKB *
    1024;


  if (
    size >=
    oneMB
  ) {
    return (
      `${(
        size /
        oneMB
      ).toFixed(
        2
      )} MB`
    );
  }


  return (
    `${(
      size /
      oneKB
    ).toFixed(
      1
    )} KB`
  );
}


function FileInfo({
  file,
}) {
  if (
    !file
  ) {
    return null;
  }


  return (
    <div
      style={{
        marginTop:
          "10px",

        padding:
          "10px 12px",

        border:
          "1px solid #e5e7eb",

        borderRadius:
          "8px",

        background:
          "#f8fafc",
      }}
    >

      <strong>
        {
          file.name
        }
      </strong>


      <small
        style={{
          display:
            "block",

          marginTop:
            "4px",

          color:
            "#64748b",
        }}
      >
        {
          formatFileSize(
            file.size
          )
        }
      </small>

    </div>
  );
}


function UploadErrors({
  errors = [],
  title = "Skipped Details",
}) {
  if (
    !Array.isArray(
      errors
    ) ||
    !errors.length
  ) {
    return null;
  }


  return (
    <div
      style={{
        marginTop:
          "18px",

        padding:
          "14px",

        border:
          "1px solid #fecaca",

        borderRadius:
          "10px",

        background:
          "#fff7f7",
      }}
    >

      <strong>
        {title}
      </strong>


      <div
        style={{
          display:
            "grid",

          gap:
            "10px",

          marginTop:
            "12px",
        }}
      >

        {
          errors.map(
            (
              item,
              index
            ) => {
              const fileName =
                item?.file ||
                item?.filename ||
                item?.row
                  ? (
                      item?.file ||
                      item?.filename ||
                      `Row ${item?.row}`
                    )
                  : `Item ${index + 1}`;


              const errorText =
                item?.error ||
                item?.detail ||
                item?.message ||
                (
                  typeof item ===
                    "string"
                    ? item
                    : "Unknown upload error."
                );


              return (
                <div
                  key={
                    `${fileName}-${index}`
                  }
                  style={{
                    padding:
                      "10px 12px",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "8px",

                    background:
                      "#ffffff",
                  }}
                >

                  <div>
                    <strong>
                      {
                        fileName
                      }
                    </strong>
                  </div>


                  <div
                    style={{
                      marginTop:
                        "5px",

                      color:
                        "#b91c1c",

                      fontSize:
                        "14px",

                      lineHeight:
                        "1.5",

                      wordBreak:
                        "break-word",
                    }}
                  >
                    {
                      String(
                        errorText
                      )
                    }
                  </div>

                </div>
              );
            }
          )
        }

      </div>

    </div>
  );
}


// =========================================================
// Component
// =========================================================

const AdminBulkUpload = () => {
  // =======================================================
  // Product Excel
  // =======================================================

  const [
    productFile,
    setProductFile,
  ] = useState(null);


  const [
    productUploading,
    setProductUploading,
  ] = useState(false);


  const [
    productResult,
    setProductResult,
  ] = useState(null);


  const [
    productInputKey,
    setProductInputKey,
  ] = useState(0);


  // =======================================================
  // Variant Excel
  // =======================================================

  const [
    variantFile,
    setVariantFile,
  ] = useState(null);


  const [
    variantUploading,
    setVariantUploading,
  ] = useState(false);


  const [
    variantResult,
    setVariantResult,
  ] = useState(null);


  const [
    variantInputKey,
    setVariantInputKey,
  ] = useState(0);


  // =======================================================
  // Image ZIP
  // =======================================================

  const [
    imageZipFile,
    setImageZipFile,
  ] = useState(null);


  const [
    imageUploading,
    setImageUploading,
  ] = useState(false);


  const [
    imageResult,
    setImageResult,
  ] = useState(null);


  const [
    imageInputKey,
    setImageInputKey,
  ] = useState(0);


  // =======================================================
  // Messages
  // =======================================================

  const [
    error,
    setError,
  ] = useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  // =======================================================
  // Global Upload State
  // =======================================================

  const isUploading =
    useMemo(
      () =>
        productUploading ||
        variantUploading ||
        imageUploading,
      [
        productUploading,
        variantUploading,
        imageUploading,
      ]
    );


  // =======================================================
  // Common Message Reset
  // =======================================================

  const clearMessages =
    () => {
      setError("");
      setSuccessMessage("");
    };


  // =======================================================
  // Reset Product Upload
  // =======================================================

  const resetProductUpload =
    () => {
      setProductFile(
        null
      );


      setProductResult(
        null
      );


      setProductInputKey(
        (
          current
        ) =>
          current + 1
      );
    };


  // =======================================================
  // Reset Variant Upload
  // =======================================================

  const resetVariantUpload =
    () => {
      setVariantFile(
        null
      );


      setVariantResult(
        null
      );


      setVariantInputKey(
        (
          current
        ) =>
          current + 1
      );
    };


  // =======================================================
  // Reset Image Upload
  // =======================================================

  const resetImageUpload =
    () => {
      setImageZipFile(
        null
      );


      setImageResult(
        null
      );


      setImageInputKey(
        (
          current
        ) =>
          current + 1
      );
    };


  // =======================================================
  // Product File Change
  // =======================================================

  const handleProductFileChange =
    (
      event
    ) => {
      clearMessages();

      setProductResult(
        null
      );


      const file =
        event
          .target
          .files?.[0] ||
        null;


      if (
        !file
      ) {
        setProductFile(
          null
        );

        return;
      }


      if (
        !isAllowedFile(
          file,
          EXCEL_EXTENSIONS
        )
      ) {
        setProductFile(
          null
        );


        setProductInputKey(
          (
            current
          ) =>
            current + 1
        );


        setError(
          "Please select a valid .xlsx or .xls product file."
        );

        return;
      }


      setProductFile(
        file
      );
    };


  // =======================================================
  // Variant File Change
  // =======================================================

  const handleVariantFileChange =
    (
      event
    ) => {
      clearMessages();

      setVariantResult(
        null
      );


      const file =
        event
          .target
          .files?.[0] ||
        null;


      if (
        !file
      ) {
        setVariantFile(
          null
        );

        return;
      }


      if (
        !isAllowedFile(
          file,
          EXCEL_EXTENSIONS
        )
      ) {
        setVariantFile(
          null
        );


        setVariantInputKey(
          (
            current
          ) =>
            current + 1
        );


        setError(
          "Please select a valid .xlsx or .xls variant file."
        );

        return;
      }


      setVariantFile(
        file
      );
    };


  // =======================================================
  // ZIP File Change
  // =======================================================

  const handleImageZipChange =
    (
      event
    ) => {
      clearMessages();

      setImageResult(
        null
      );


      const file =
        event
          .target
          .files?.[0] ||
        null;


      if (
        !file
      ) {
        setImageZipFile(
          null
        );

        return;
      }


      if (
        !isAllowedFile(
          file,
          ZIP_EXTENSIONS
        )
      ) {
        setImageZipFile(
          null
        );


        setImageInputKey(
          (
            current
          ) =>
            current + 1
        );


        setError(
          "Please select a valid .zip image archive."
        );

        return;
      }


      setImageZipFile(
        file
      );
    };


  // =======================================================
  // Product Upload
  // =======================================================

  const handleProductUpload =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        isUploading
      ) {
        return;
      }


      clearMessages();

      setProductResult(
        null
      );


      if (
        !productFile
      ) {
        setError(
          "Please select a product Excel file."
        );

        return;
      }


      if (
        !isAllowedFile(
          productFile,
          EXCEL_EXTENSIONS
        )
      ) {
        setError(
          "Only .xlsx or .xls files are allowed for product upload."
        );

        return;
      }


      setProductUploading(
        true
      );


      try {
        const response =
          await bulkUploadAdminProducts(
            productFile
          );


        const result =
          normalizeResult(
            response
          );


        setProductResult(
          result
        );


        setSuccessMessage(
          response?.message ||
          response?.detail ||
          "Bulk product upload completed."
        );


        setProductFile(
          null
        );


        setProductInputKey(
          (
            current
          ) =>
            current + 1
        );
      } catch (
        uploadError
      ) {
        setError(
          getErrorMessage(
            uploadError
          )
        );
      } finally {
        setProductUploading(
          false
        );
      }
    };


  // =======================================================
  // Variant Upload
  // =======================================================

  const handleVariantUpload =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        isUploading
      ) {
        return;
      }


      clearMessages();

      setVariantResult(
        null
      );


      if (
        !variantFile
      ) {
        setError(
          "Please select a variant Excel file."
        );

        return;
      }


      if (
        !isAllowedFile(
          variantFile,
          EXCEL_EXTENSIONS
        )
      ) {
        setError(
          "Only .xlsx or .xls files are allowed for variant upload."
        );

        return;
      }


      setVariantUploading(
        true
      );


      try {
        const response =
          await bulkUploadAdminVariants(
            variantFile
          );


        const result =
          normalizeResult(
            response
          );


        setVariantResult(
          result
        );


        setSuccessMessage(
          response?.message ||
          response?.detail ||
          "Bulk variant upload completed."
        );


        setVariantFile(
          null
        );


        setVariantInputKey(
          (
            current
          ) =>
            current + 1
        );
      } catch (
        uploadError
      ) {
        setError(
          getErrorMessage(
            uploadError
          )
        );
      } finally {
        setVariantUploading(
          false
        );
      }
    };


  // =======================================================
  // Image ZIP Upload
  // =======================================================

  const handleImageUpload =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        isUploading
      ) {
        return;
      }


      clearMessages();

      setImageResult(
        null
      );


      if (
        !imageZipFile
      ) {
        setError(
          "Please select a product image ZIP file."
        );

        return;
      }


      if (
        !isAllowedFile(
          imageZipFile,
          ZIP_EXTENSIONS
        )
      ) {
        setError(
          "Only .zip files are allowed for bulk product images."
        );

        return;
      }


      setImageUploading(
        true
      );


      try {
        const response =
          await bulkUploadAdminProductImages(
            imageZipFile
          );


        const result =
          normalizeResult(
            response
          );


        setImageResult(
          result
        );


        setSuccessMessage(
          response?.message ||
          response?.detail ||
          "Bulk product image upload completed."
        );


        setImageZipFile(
          null
        );


        setImageInputKey(
          (
            current
          ) =>
            current + 1
        );
      } catch (
        uploadError
      ) {
        setError(
          getErrorMessage(
            uploadError
          )
        );
      } finally {
        setImageUploading(
          false
        );
      }
    };


  // =======================================================
  // Result Components
  // =======================================================

  const renderStandardResult =
    (
      result
    ) => {
      if (
        !result
      ) {
        return null;
      }


      return (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "16px",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "10px",

            background:
              "#f8fafc",
          }}
        >

          <strong>
            Upload Result
          </strong>


          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(130px, 1fr))",

              gap:
                "12px",

              marginTop:
                "12px",
            }}
          >

            <div>

              <small>
                Created
              </small>

              <div>
                <strong>
                  {
                    result.created
                  }
                </strong>
              </div>

            </div>


            <div>

              <small>
                Updated
              </small>

              <div>
                <strong>
                  {
                    result.updated
                  }
                </strong>
              </div>

            </div>


            <div>

              <small>
                Skipped
              </small>

              <div>
                <strong>
                  {
                    result.skipped
                  }
                </strong>
              </div>

            </div>

          </div>


          {
            (
              result?.message ||
              result?.detail
            ) && (
              <p
                style={{
                  marginTop:
                    "12px",
                }}
              >
                {
                  result.message ||
                  result.detail
                }
              </p>
            )
          }


          <UploadErrors
            errors={
              result.errors
            }
            title="Skipped Row Details"
          />

        </div>
      );
    };


  const renderImageResult =
    (
      result
    ) => {
      if (
        !result
      ) {
        return null;
      }


      return (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "16px",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "10px",

            background:
              "#f8fafc",
          }}
        >

          <strong>
            Image Upload Result
          </strong>


          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",

              gap:
                "12px",

              marginTop:
                "12px",
            }}
          >

            <div>

              <small>
                Main Images
              </small>

              <div>
                <strong>
                  {
                    result.main_images
                  }
                </strong>
              </div>

            </div>


            <div>

              <small>
                Gallery Images
              </small>

              <div>
                <strong>
                  {
                    result.gallery_images
                  }
                </strong>
              </div>

            </div>


            <div>

              <small>
                Skipped
              </small>

              <div>
                <strong>
                  {
                    result.skipped
                  }
                </strong>
              </div>

            </div>

          </div>


          {
            (
              result?.message ||
              result?.detail
            ) && (
              <p
                style={{
                  marginTop:
                    "12px",
                }}
              >
                {
                  result.message ||
                  result.detail
                }
              </p>
            )
          }


          <UploadErrors
            errors={
              result.errors
            }
            title="Skipped Image Details"
          />

        </div>
      );
    };


  // =======================================================
  // Render
  // =======================================================

  return (
    <main className="admin-dashboard-page">

      {/* =================================================
          Header
      ================================================= */}

      <section className="dashboard-header">

        <div>

          <p className="dashboard-eyebrow">
            Yuvon Admin
          </p>


          <h1>
            Bulk Product Upload
          </h1>


          <p className="dashboard-subtitle">
            Manage large product
            imports, variants and
            product images directly
            from the frontend admin.
          </p>

        </div>


        <div className="dashboard-header-actions">

          <Link
            to="/admin/products"
            className="dashboard-button dashboard-button-secondary"
          >
            Back to Products
          </Link>


          <Link
            to="/admin/products/new"
            className="dashboard-button dashboard-button-primary"
          >
            Add Single Product
          </Link>

        </div>

      </section>


      {/* =================================================
          Messages
      ================================================= */}

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

              marginBottom:
                "18px",
            }}
          >
            {
              successMessage
            }
          </section>
        )
      }


      {/* =================================================
          General Instructions
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Upload Order
              </h2>


              <p>
                For a completely new
                catalogue, use the
                uploads in this order.
              </p>

            </div>

          </div>


          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",

              gap:
                "14px",
            }}
          >

            <div
              style={{
                padding:
                  "14px",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  "10px",
              }}
            >
              <strong>
                Step 1
              </strong>

              <p>
                Upload products Excel.
              </p>
            </div>


            <div
              style={{
                padding:
                  "14px",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  "10px",
              }}
            >
              <strong>
                Step 2
              </strong>

              <p>
                Upload variants Excel.
              </p>
            </div>


            <div
              style={{
                padding:
                  "14px",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  "10px",
              }}
            >
              <strong>
                Step 3
              </strong>

              <p>
                Upload product images ZIP.
              </p>
            </div>

          </div>

        </article>

      </section>


      {/* =================================================
          Product Excel Upload
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                1. Bulk Products
              </h2>


              <p>
                Create new products or
                update existing products
                using the product SKU.
              </p>

            </div>

          </div>


          <div
            style={{
              padding:
                "14px",

              background:
                "#f8fafc",

              borderRadius:
                "10px",

              marginBottom:
                "18px",
            }}
          >

            <strong>
              Required columns
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              sku, name, brand,
              department, category,
              price
            </p>


            <strong
              style={{
                display:
                  "block",

                marginTop:
                  "14px",
              }}
            >
              Optional columns
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              subcategory, slug,
              description, old_price,
              is_active, is_featured,
              is_best_seller,
              is_trending,
              is_new_arrival,
              is_clearance_sale,
              is_offer,
              meta_title,
              meta_description
            </p>


            <p
              style={{
                marginTop:
                  "10px",
              }}
            >
              Existing product with the
              same SKU will be updated.
            </p>

          </div>


          <form
            onSubmit={
              handleProductUpload
            }
          >

            <div className="dashboard-filter-field">

              <label htmlFor="bulk-product-file">
                Product Excel File *
              </label>


              <input
                id="bulk-product-file"
                key={
                  productInputKey
                }
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  handleProductFileChange
                }
                disabled={
                  isUploading
                }
              />

            </div>


            <FileInfo
              file={
                productFile
              }
            />


            <div
              style={{
                display:
                  "flex",

                gap:
                  "10px",

                flexWrap:
                  "wrap",

                marginTop:
                  "18px",
              }}
            >

              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  isUploading ||
                  !productFile
                }
              >
                {
                  productUploading
                    ? "Uploading Products..."
                    : "Upload Products Excel"
                }
              </button>


              <button
                type="button"
                className="dashboard-button dashboard-button-secondary"
                onClick={
                  resetProductUpload
                }
                disabled={
                  isUploading ||
                  (
                    !productFile &&
                    !productResult
                  )
                }
              >
                Clear
              </button>

            </div>

          </form>


          {
            renderStandardResult(
              productResult
            )
          }

        </article>

      </section>


      {/* =================================================
          Variant Excel Upload
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                2. Bulk Variants
              </h2>


              <p>
                Add or update product
                colors, sizes, stock
                and variant SKUs.
              </p>

            </div>

          </div>


          <div
            style={{
              padding:
                "14px",

              background:
                "#f8fafc",

              borderRadius:
                "10px",

              marginBottom:
                "18px",
            }}
          >

            <strong>
              Required columns
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              product_sku,
              variant_sku,
              color,
              size,
              stock
            </p>


            <strong
              style={{
                display:
                  "block",

                marginTop:
                  "14px",
              }}
            >
              Optional columns
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              color_code,
              is_active
            </p>


            <p
              style={{
                marginTop:
                  "10px",
              }}
            >
              product_sku must already
              exist in the product
              catalogue before the
              variant file is uploaded.
            </p>

          </div>


          <form
            onSubmit={
              handleVariantUpload
            }
          >

            <div className="dashboard-filter-field">

              <label htmlFor="bulk-variant-file">
                Variant Excel File *
              </label>


              <input
                id="bulk-variant-file"
                key={
                  variantInputKey
                }
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  handleVariantFileChange
                }
                disabled={
                  isUploading
                }
              />

            </div>


            <FileInfo
              file={
                variantFile
              }
            />


            <div
              style={{
                display:
                  "flex",

                gap:
                  "10px",

                flexWrap:
                  "wrap",

                marginTop:
                  "18px",
              }}
            >

              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  isUploading ||
                  !variantFile
                }
              >
                {
                  variantUploading
                    ? "Uploading Variants..."
                    : "Upload Variants Excel"
                }
              </button>


              <button
                type="button"
                className="dashboard-button dashboard-button-secondary"
                onClick={
                  resetVariantUpload
                }
                disabled={
                  isUploading ||
                  (
                    !variantFile &&
                    !variantResult
                  )
                }
              >
                Clear
              </button>

            </div>

          </form>


          {
            renderStandardResult(
              variantResult
            )
          }

        </article>

      </section>


      {/* =================================================
          Images ZIP Upload
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div className="dashboard-section-header">

            <div>

              <h2>
                3. Bulk Product Images
              </h2>


              <p>
                Upload main images and
                gallery images for many
                products at once.
              </p>

            </div>

          </div>


          <div
            style={{
              padding:
                "14px",

              background:
                "#f8fafc",

              borderRadius:
                "10px",

              marginBottom:
                "18px",
            }}
          >

            <strong>
              Main Image
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              File name must exactly
              match the product SKU.
            </p>


            <code>
              YUV-TEST-001.jpg
            </code>


            <strong
              style={{
                display:
                  "block",

                marginTop:
                  "16px",
              }}
            >
              Gallery Images
            </strong>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              Add an underscore and
              numeric display order.
            </p>


            <code>
              YUV-TEST-001_1.jpg
            </code>

            <br />

            <code>
              YUV-TEST-001_2.jpg
            </code>

            <br />

            <code>
              YUV-TEST-001_3.webp
            </code>


            <p
              style={{
                marginTop:
                  "14px",
              }}
            >
              Supported image types:
              JPG, JPEG, PNG and WEBP.
            </p>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              Important: the SKU inside
              the filename must exactly
              match an existing product SKU.
            </p>


            <p
              style={{
                marginTop:
                  "8px",
              }}
            >
              Upload all images inside
              one ZIP file.
            </p>

          </div>


          <form
            onSubmit={
              handleImageUpload
            }
          >

            <div className="dashboard-filter-field">

              <label htmlFor="bulk-image-zip">
                Product Images ZIP *
              </label>


              <input
                id="bulk-image-zip"
                key={
                  imageInputKey
                }
                type="file"
                accept=".zip,application/zip"
                onChange={
                  handleImageZipChange
                }
                disabled={
                  isUploading
                }
              />

            </div>


            <FileInfo
              file={
                imageZipFile
              }
            />


            <div
              style={{
                display:
                  "flex",

                gap:
                  "10px",

                flexWrap:
                  "wrap",

                marginTop:
                  "18px",
              }}
            >

              <button
                type="submit"
                className="dashboard-button dashboard-button-primary"
                disabled={
                  isUploading ||
                  !imageZipFile
                }
              >
                {
                  imageUploading
                    ? "Uploading Images..."
                    : "Upload Images ZIP"
                }
              </button>


              <button
                type="button"
                className="dashboard-button dashboard-button-secondary"
                onClick={
                  resetImageUpload
                }
                disabled={
                  isUploading ||
                  (
                    !imageZipFile &&
                    !imageResult
                  )
                }
              >
                Clear
              </button>

            </div>

          </form>


          {
            renderImageResult(
              imageResult
            )
          }

        </article>

      </section>


      {/* =================================================
          Footer Navigation
      ================================================= */}

      <section className="dashboard-section">

        <article className="dashboard-panel">

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              flexWrap:
                "wrap",

              gap:
                "12px",
            }}
          >

            <div>

              <strong>
                Bulk upload complete?
              </strong>


              <p
                style={{
                  marginTop:
                    "4px",
                }}
              >
                Open Products to verify
                imported products,
                variants, stock and images.
              </p>

            </div>


            <Link
              to="/admin/products"
              className="dashboard-button dashboard-button-primary"
            >
              View Products
            </Link>

          </div>

        </article>

      </section>

    </main>
  );
};


export default AdminBulkUpload;