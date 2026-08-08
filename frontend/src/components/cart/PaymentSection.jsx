function PaymentSection({
  paymentMethod,
  handleShippingChange,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-bold text-lg">
        Payment Method
      </h3>

      {/* Cash on Delivery */}
      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition hover:border-black">
        <input
          type="radio"
          name="payment_method"
          value="cod"
          checked={paymentMethod === "cod"}
          onChange={handleShippingChange}
        />

        <div className="flex-1">
          <p className="font-semibold">
            Cash on Delivery
          </p>

          <p className="text-sm text-gray-500">
            Pay when your order arrives.
          </p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Available
        </span>
      </label>

      {/* Razorpay */}
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition hover:border-black">
        <input
          type="radio"
          name="payment_method"
          value="razorpay"
          checked={paymentMethod === "razorpay"}
          onChange={handleShippingChange}
        />

        <div className="flex-1">
          <p className="font-semibold">
            Pay Online
          </p>

          <p className="text-sm text-gray-500">
            UPI • Credit Card • Debit Card • Net Banking • Wallet
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Razorpay
        </span>
      </label>

      {paymentMethod === "razorpay" && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-700">
            Secure Online Payment
          </p>

          <p className="mt-2 text-sm text-gray-600">
            After clicking <b>Place Order</b>, a secure Razorpay payment window
            will open where you can pay using:
          </p>

          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
            <li>UPI</li>
            <li>Credit Card</li>
            <li>Debit Card</li>
            <li>Net Banking</li>
            <li>Wallets</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default PaymentSection;