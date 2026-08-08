function PrivacyPolicy() {
  return (
    <section className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-center mb-16">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-700 text-lg leading-relaxed">
          <p>
            This Privacy Policy describes how Yuvon Design Hub collects, uses,
            and protects your personal information when you visit our website or
            make a purchase from us.
          </p>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Personal information we collect
            </h2>
            <p>
              When you visit our website, we may collect information such as your
              device details, browser type, IP address, pages visited, and how
              you interact with our website.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Order information
            </h2>
            <p>
              When you place an order, we collect your name, phone number, email
              address, billing address, shipping address, and payment-related
              details required to complete your purchase.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-3">
              How we use your information
            </h2>
            <p>
              We use your information to process orders, arrange shipping,
              provide order updates, improve our services, prevent fraud, and
              communicate with you about your purchase.
            </p>
          </div>

          <ul className="list-disc pl-6 space-y-2">
            <li>To process and deliver your orders.</li>
            <li>To provide customer support.</li>
            <li>To send order updates and important notifications.</li>
            <li>To improve our website and shopping experience.</li>
            <li>To prevent fraud and secure our platform.</li>
          </ul>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Data retention
            </h2>
            <p>
              We keep your order information for our records unless you request
              deletion, subject to legal and business requirements.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Your rights
            </h2>
            <p>
              You may request access, correction, update, or deletion of your
              personal information by contacting us.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Changes
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our business, legal requirements, or website practices.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-3">
              Contact us
            </h2>
            <p>
              For more information about our privacy practices, contact us at{" "}
              <a
                href="mailto:yuvonneterprises@gmail.com"
                className="text-blue-600 font-semibold"
              >
                yuvonneterprises@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PrivacyPolicy;