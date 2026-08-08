function OrderNoteSection({
  customerNote,
  handleShippingChange,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-bold">
        Order Note
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        Add any special instructions for your order.
      </p>

      <textarea
        name="customer_note"
        value={customerNote}
        onChange={handleShippingChange}
        placeholder="Order note (optional)"
        rows={4}
        className="mt-3 w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
      />

      <p className="mt-2 text-xs text-gray-400">
        Example: Deliver after 6 PM, don't ring the bell,
        gift wrap, etc.
      </p>
    </div>
  );
}

export default OrderNoteSection;    