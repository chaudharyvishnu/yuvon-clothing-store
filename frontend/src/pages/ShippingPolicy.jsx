function ShippingPolicy() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-6">

        <h1 className="text-5xl font-serif text-center mb-16">
          Shipping Policy
        </h1>

        <div className="space-y-10 text-gray-700 leading-8">

          <div>
            <p>
              We offer fast and reliable shipping across India. Orders are
              carefully packed and dispatched through our trusted courier
              partners.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              When will my order arrive?
            </h2>

            <p>
              Orders are usually processed within <b>24-48 hours</b> after
              successful payment confirmation.
            </p>

            <ul className="list-disc ml-6 mt-4 space-y-2">
              <li>Metro Cities: 2–4 Business Days</li>
              <li>Other Cities: 3–7 Business Days</li>
              <li>Remote Areas: 5–9 Business Days</li>
            </ul>

            <p className="mt-4">
              Delivery times may vary during festivals, sales, or unforeseen
              courier delays.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              Shipping Charges
            </h2>

            <ul className="list-disc ml-6 space-y-2">
              <li>Free Shipping on prepaid orders above ₹999.</li>
              <li>Orders below ₹999 may include a nominal shipping fee.</li>
              <li>Cash on Delivery charges may apply.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              Order Tracking
            </h2>

            <p>
              Once your order is shipped, a tracking number will be shared
              through SMS and Email so you can track your shipment anytime.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              International Shipping
            </h2>

            <p>
              Currently, Yuvon Design Hub ships only within India. International
              shipping services will be introduced soon.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              Delayed Delivery
            </h2>

            <p>
              While we strive to deliver every order on time, unexpected
              situations like weather conditions, strikes, or courier issues may
              cause delays. We appreciate your patience in such cases.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              Contact Us
            </h2>

            <p>
              If you have any questions regarding shipping, feel free to contact
              us.
            </p>

            <p className="mt-2">
              📧 <b>yuvonneterprises@gmail.com</b>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

export default ShippingPolicy;