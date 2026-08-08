function DeliveryCheck({
  pincode,
  setPincode,
  deliveryMessage,
  setDeliveryMessage,
  handleDeliveryCheck,
}) {
  const handlePincodeChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setPincode(value);
    setDeliveryMessage("");
  };

  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-bold">
        Delivery Check
      </h3>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={handlePincodeChange}
          placeholder="Enter 6-digit pincode"
          aria-label="Enter delivery pincode"
          className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={handleDeliveryCheck}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Check
        </button>
      </div>

      {deliveryMessage && (
        <p className="mt-3 text-sm text-gray-600">
          {deliveryMessage}
        </p>
      )}
    </div>
  );
}

export default DeliveryCheck;