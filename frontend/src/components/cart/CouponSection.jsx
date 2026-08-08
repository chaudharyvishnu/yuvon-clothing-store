function CouponSection({
  couponCode,
  setCouponCode,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-bold">
        Coupon
      </h3>

      <div className="mt-3 flex gap-3">
        <input
          type="text"
          value={couponCode}
          onChange={(event) =>
            setCouponCode(
              event.target.value.toUpperCase()
            )
          }
          placeholder="Enter coupon code"
          className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />

        <button
          type="button"
          className="rounded-xl bg-black px-5 text-white transition hover:bg-gray-800"
        >
          Apply
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Enter your coupon code to get available
        discounts.
      </p>
    </div>
  );
}

export default CouponSection;