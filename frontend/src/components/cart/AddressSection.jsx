function AddressSection({
  savedAddresses,
  selectedAddressId,
  setSelectedAddressId,
  addressMode,
  setAddressMode,
  addressesLoading,
  addressesError,
  shippingForm,
  handleShippingChange,
  saveNewAddress,
  setSaveNewAddress,
  makeDefaultAddress,
  setMakeDefaultAddress,
  setCheckoutError,
  getAddressText,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">
            Delivery Address
          </h3>

          <p className="text-sm text-gray-500">
            Select a saved address or add a new one.
          </p>
        </div>

        {savedAddresses.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setAddressMode(
                addressMode === "saved"
                  ? "new"
                  : "saved"
              );
              setCheckoutError("");
            }}
            className="text-sm font-semibold text-blue-600"
          >
            {addressMode === "saved"
              ? "+ New Address"
              : "Use Saved"}
          </button>
        )}
      </div>

      {addressesLoading && (
        <div className="mt-4">
          Loading addresses...
        </div>
      )}

      {addressesError && (
        <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
          {addressesError}
        </p>
      )}

      {!addressesLoading &&
        addressMode === "saved" &&
        savedAddresses.length > 0 && (
          <div className="mt-4 space-y-3">
            {savedAddresses.map((address) => (
              <label
                key={address.id}
                className={`block cursor-pointer rounded-xl border p-4 ${
                  String(selectedAddressId) ===
                  String(address.id)
                    ? "border-blue-600 bg-blue-50"
                    : ""
                }`}
              >
                <div className="flex gap-3">
                  <input
                    type="radio"
                    checked={
                      String(selectedAddressId) ===
                      String(address.id)
                    }
                    onChange={() => {
                      setSelectedAddressId(
                        address.id
                      );
                      setCheckoutError("");
                    }}
                  />

                  <div>
                    <p className="font-bold">
                      {address.full_name}
                    </p>

                    <p className="text-sm text-gray-600">
                      {getAddressText(address)}
                    </p>

                    <p className="text-sm">
                      +91 {address.phone}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

      {!addressesLoading &&
        addressMode === "new" && (
          <div className="mt-4 space-y-3">
            <input
              name="full_name"
              value={shippingForm.full_name}
              onChange={handleShippingChange}
              placeholder="Full Name *"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="phone"
              value={shippingForm.phone}
              onChange={handleShippingChange}
              placeholder="Phone Number *"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="alternate_phone"
              value={
                shippingForm.alternate_phone
              }
              onChange={handleShippingChange}
              placeholder="Alternate Phone"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="address_line_1"
              value={
                shippingForm.address_line_1
              }
              onChange={handleShippingChange}
              placeholder="House / Flat / Street *"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="address_line_2"
              value={
                shippingForm.address_line_2
              }
              onChange={handleShippingChange}
              placeholder="Area / Locality"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="landmark"
              value={shippingForm.landmark}
              onChange={handleShippingChange}
              placeholder="Landmark"
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="city"
                value={shippingForm.city}
                onChange={handleShippingChange}
                placeholder="City *"
                className="rounded-xl border px-4 py-3"
              />

              <input
                name="state"
                value={shippingForm.state}
                onChange={handleShippingChange}
                placeholder="State *"
                className="rounded-xl border px-4 py-3"
              />
            </div>

            <input
              name="postal_code"
              value={shippingForm.postal_code}
              onChange={handleShippingChange}
              placeholder="Pincode *"
              className="w-full rounded-xl border px-4 py-3"
            />

            <select
              name="address_type"
              value={
                shippingForm.address_type
              }
              onChange={handleShippingChange}
              className="w-full rounded-xl border px-4 py-3"
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

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={saveNewAddress}
                onChange={(e) =>
                  setSaveNewAddress(
                    e.target.checked
                  )
                }
              />

              Save this address
            </label>

            {saveNewAddress && (
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    makeDefaultAddress
                  }
                  onChange={(e) =>
                    setMakeDefaultAddress(
                      e.target.checked
                    )
                  }
                />

                Make Default Address
              </label>
            )}
          </div>
        )}
    </div>
  );
}

export default AddressSection;