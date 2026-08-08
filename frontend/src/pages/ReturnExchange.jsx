function ReturnExchange() {
  return (
    <section className="bg-white min-h-screen py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        
        <div className="hidden lg:flex items-end justify-center gap-4">
          <div className="text-8xl">🛍️</div>
          <div className="text-9xl">👗</div>
          <div className="text-8xl">🛒</div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8 md:p-12 max-w-xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-center mb-3">
            Return/Exchange Your Product
          </h1>

          <p className="text-center text-gray-500 mb-10">
            Let’s find your order
          </p>

          <div className="space-y-5">
            <input
              type="text"
              placeholder="Order Number"
              className="w-full border rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600"
            />

            <input
              type="text"
              placeholder="Phone or Email"
              className="w-full border rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600"
            />

            <button
              onClick={() => alert("Demo: Return/Exchange request step opened")}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700"
            >
              Next
            </button>
          </div>

          <p className="text-center text-gray-600 mt-8">
            Please read our refund policy before you submit the request.{" "}
            <a href="#" className="underline text-black">
              Click Here
            </a>
          </p>

          <p className="text-center text-xs text-gray-400 mt-8">
            Powered by Yuvon Returns
          </p>
        </div>
      </div>
    </section>
  );
}

export default ReturnExchange;