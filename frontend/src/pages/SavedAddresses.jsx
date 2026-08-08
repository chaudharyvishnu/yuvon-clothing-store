import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from "../services/api";

const EMPTY_ADDRESS_FORM = {
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
  is_default: false,
};

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Something went wrong. Please try again."
    );
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    if (Array.isArray(error.data.detail)) {
      return error.data.detail.join(" ");
    }

    return String(error.data.detail);
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(" ")}`;
      }

      if (
        messages &&
        typeof messages === "object"
      ) {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${String(messages)}`;
    })
    .join(" ");
}

function getFullAddress(address) {
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

function SavedAddresses() {
  const [addresses, setAddresses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingAddress, setEditingAddress] =
    useState(null);

  const [addressForm, setAddressForm] =
    useState(EMPTY_ADDRESS_FORM);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [deletingAddressId, setDeletingAddressId] =
    useState(null);

  const [formError, setFormError] =
    useState("");

  const [formMessage, setFormMessage] =
    useState("");

  const loadAddresses = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchAddresses();

      const addressList = Array.isArray(response)
        ? response
        : response.results ||
          response.addresses ||
          [];

      setAddresses(addressList);
    } catch (fetchError) {
      console.error(
        "Addresses load error:",
        fetchError
      );

      setError(
        formatApiError(fetchError)
      );

      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const sortedAddresses = useMemo(() => {
    return [...addresses].sort((a, b) => {
      if (a.is_default && !b.is_default) {
        return -1;
      }

      if (!a.is_default && b.is_default) {
        return 1;
      }

      return Number(b.id || 0) -
        Number(a.id || 0);
    });
  }, [addresses]);

  const openCreateForm = () => {
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setFormError("");
    setFormMessage("");
    setFormOpen(true);
  };

  const openEditForm = (address) => {
    setEditingAddress(address);

    setAddressForm({
      full_name:
        address.full_name || "",
      phone:
        address.phone || "",
      alternate_phone:
        address.alternate_phone || "",
      address_line_1:
        address.address_line_1 || "",
      address_line_2:
        address.address_line_2 || "",
      landmark:
        address.landmark || "",
      city:
        address.city || "",
      state:
        address.state || "",
      postal_code:
        address.postal_code || "",
      country:
        address.country || "India",
      address_type:
        address.address_type || "home",
      is_default:
        Boolean(address.is_default),
    });

    setFormError("");
    setFormMessage("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setFormError("");
    setFormMessage("");
  };

  const handleFormChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    let nextValue =
      type === "checkbox"
        ? checked
        : value;

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

    setAddressForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setFormError("");
    setFormMessage("");
  };

  const validateAddress = () => {
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
        (field) =>
          !String(
            addressForm[field] || ""
          ).trim()
      );

    if (missingField) {
      return "Please fill all required address fields.";
    }

    if (
      addressForm.phone.length !== 10
    ) {
      return "Please enter a valid 10-digit phone number.";
    }

    if (
      addressForm.alternate_phone &&
      addressForm.alternate_phone.length !== 10
    ) {
      return "Please enter a valid alternate phone number.";
    }

    if (
      addressForm.postal_code.length !== 6
    ) {
      return "Please enter a valid 6-digit pincode.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setFormMessage("");

    const validationError =
      validateAddress();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      full_name:
        addressForm.full_name.trim(),

      phone:
        addressForm.phone,

      alternate_phone:
        addressForm.alternate_phone,

      address_line_1:
        addressForm.address_line_1.trim(),

      address_line_2:
        addressForm.address_line_2.trim(),

      landmark:
        addressForm.landmark.trim(),

      city:
        addressForm.city.trim(),

      state:
        addressForm.state.trim(),

      postal_code:
        addressForm.postal_code,

      country:
        addressForm.country.trim() || "India",

      address_type:
        addressForm.address_type,

      is_default:
        addressForm.is_default,
    };

    try {
      setSavingAddress(true);

      let response;

      if (editingAddress) {
        response = await updateAddress(
          editingAddress.id,
          payload
        );
      } else {
        response = await createAddress(
          payload
        );
      }

      const savedAddress =
        response.address || response;

      setAddresses((current) => {
        let nextAddresses;

        if (editingAddress) {
          nextAddresses = current.map(
            (address) =>
              address.id ===
              editingAddress.id
                ? {
                    ...address,
                    ...savedAddress,
                  }
                : address
          );
        } else {
          nextAddresses = [
            savedAddress,
            ...current,
          ];
        }

        if (savedAddress.is_default) {
          return nextAddresses.map(
            (address) => ({
              ...address,
              is_default:
                address.id ===
                savedAddress.id,
            })
          );
        }

        return nextAddresses;
      });

      setFormMessage(
        response.message ||
          (editingAddress
            ? "Address updated successfully."
            : "Address added successfully.")
      );

      setTimeout(() => {
        closeForm();
      }, 700);
    } catch (saveError) {
      console.error(
        "Address save error:",
        saveError
      );

      setFormError(
        formatApiError(saveError)
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDelete = async (
    address
  ) => {
    const confirmed =
      window.confirm(
        "Delete this saved address?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAddressId(
        address.id
      );

      const response =
        await deleteAddress(
          address.id
        );

      setAddresses((current) =>
        current.filter(
          (item) =>
            item.id !== address.id
        )
      );

      alert(
        response.message ||
          "Address deleted successfully."
      );
    } catch (deleteError) {
      console.error(
        "Address delete error:",
        deleteError
      );

      alert(
        formatApiError(
          deleteError
        )
      );
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefault = async (
    address
  ) => {
    if (address.is_default) {
      return;
    }

    try {
      const response =
        await updateAddress(
          address.id,
          {
            is_default: true,
          }
        );

      const updatedAddress =
        response.address || response;

      setAddresses((current) =>
        current.map((item) => ({
          ...item,
          is_default:
            item.id === address.id,
          ...(item.id === address.id
            ? updatedAddress
            : {}),
        }))
      );
    } catch (defaultError) {
      console.error(
        "Set default address error:",
        defaultError
      );

      alert(
        formatApiError(
          defaultError
        )
      );
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              My Account
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
              Saved Addresses
            </h1>

            <p className="mt-2 text-gray-500">
              Manage your delivery addresses for faster checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="w-fit rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Add New Address
          </button>
        </div>

        {loading && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />

                <div className="mt-5 h-4 w-full animate-pulse rounded bg-gray-200" />

                <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-gray-200" />

                <div className="mt-6 h-10 w-full animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-red-600">
              Addresses load nahi ho paaye
            </h2>

            <p className="mt-3 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadAddresses}
              className="mt-6 rounded-full bg-black px-6 py-3 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          sortedAddresses.length === 0 && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="text-5xl">
                📍
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                No saved addresses
              </h2>

              <p className="mt-2 text-gray-500">
                Add your first delivery address for faster checkout.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white"
              >
                Add Address
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          sortedAddresses.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedAddresses.map(
                (address) => {
                  const deleting =
                    deletingAddressId ===
                    address.id;

                  return (
                    <article
                      key={address.id}
                      className={`relative rounded-3xl border bg-white p-6 shadow-sm ${
                        address.is_default
                          ? "border-blue-500"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                            {address.address_type ||
                              "home"}
                          </span>

                          {address.is_default && (
                            <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Default
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(address)
                          }
                          className="text-sm font-semibold text-blue-600"
                        >
                          Edit
                        </button>
                      </div>

                      <h2 className="mt-5 text-xl font-bold">
                        {address.full_name}
                      </h2>

                      <p className="mt-3 leading-7 text-gray-600">
                        {getFullAddress(
                          address
                        )}
                      </p>

                      <div className="mt-4 space-y-1 text-sm text-gray-600">
                        <p>
                          Phone: +91{" "}
                          {address.phone}
                        </p>

                        {address.alternate_phone && (
                          <p>
                            Alternate: +91{" "}
                            {
                              address.alternate_phone
                            }
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex flex-col gap-3 border-t pt-5">
                        {!address.is_default && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetDefault(
                                address
                              )
                            }
                            className="rounded-full border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-600"
                          >
                            Set as Default
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() =>
                            handleDelete(
                              address
                            )
                          }
                          className="rounded-full border border-red-500 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleting
                            ? "Deleting..."
                            : "Delete Address"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-[1000] flex justify-end bg-black/50"
          onClick={closeForm}
        >
          <div
            className="h-full w-full overflow-y-auto bg-gray-50 shadow-2xl sm:w-[520px]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Address Book
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {editingAddress
                    ? "Edit Address"
                    : "Add New Address"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="text-3xl font-light"
                aria-label="Close address form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5 sm:p-6"
            >
              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">
                  Contact Details
                </h3>

                <div className="mt-4 space-y-4">
                  <input
                    type="text"
                    name="full_name"
                    value={
                      addressForm.full_name
                    }
                    onChange={handleFormChange}
                    placeholder="Full Name *"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    name="phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={
                      addressForm.phone
                    }
                    onChange={handleFormChange}
                    placeholder="Phone Number *"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    name="alternate_phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={
                      addressForm.alternate_phone
                    }
                    onChange={handleFormChange}
                    placeholder="Alternate Phone"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">
                  Address Details
                </h3>

                <div className="mt-4 space-y-4">
                  <input
                    type="text"
                    name="address_line_1"
                    value={
                      addressForm.address_line_1
                    }
                    onChange={handleFormChange}
                    placeholder="House / Flat / Street *"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    name="address_line_2"
                    value={
                      addressForm.address_line_2
                    }
                    onChange={handleFormChange}
                    placeholder="Area / Locality"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    name="landmark"
                    value={
                      addressForm.landmark
                    }
                    onChange={handleFormChange}
                    placeholder="Landmark"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      name="city"
                      value={
                        addressForm.city
                      }
                      onChange={handleFormChange}
                      placeholder="City *"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                      type="text"
                      name="state"
                      value={
                        addressForm.state
                      }
                      onChange={handleFormChange}
                      placeholder="State *"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      name="postal_code"
                      inputMode="numeric"
                      maxLength={6}
                      value={
                        addressForm.postal_code
                      }
                      onChange={handleFormChange}
                      placeholder="Pincode *"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                      type="text"
                      name="country"
                      value={
                        addressForm.country
                      }
                      onChange={handleFormChange}
                      placeholder="Country"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">
                  Address Type
                </h3>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    {
                      value: "home",
                      label: "Home",
                    },
                    {
                      value: "work",
                      label: "Work",
                    },
                    {
                      value: "other",
                      label: "Other",
                    },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className={`cursor-pointer rounded-xl border p-3 text-center font-semibold ${
                        addressForm.address_type ===
                        type.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address_type"
                        value={type.value}
                        checked={
                          addressForm.address_type ===
                          type.value
                        }
                        onChange={handleFormChange}
                        className="hidden"
                      />

                      {type.label}
                    </label>
                  ))}
                </div>

                <label className="mt-5 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={
                      addressForm.is_default
                    }
                    onChange={handleFormChange}
                    className="h-5 w-5"
                  />

                  <span>
                    Make this my default address
                  </span>
                </label>
              </div>

              {formError && (
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {formError}
                </p>
              )}

              {formMessage && (
                <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  {formMessage}
                </p>
              )}

              <div className="sticky bottom-0 border-t bg-white p-4">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {savingAddress
                    ? "Saving Address..."
                    : editingAddress
                    ? "Update Address"
                    : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default SavedAddresses;