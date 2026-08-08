function Support() {
  return (
    <section className="bg-gray-100 min-h-screen py-14">
      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-3xl shadow-lg p-10">

          <h1 className="text-5xl font-bold mb-10">
            Let's Connect
          </h1>

          <div className="space-y-8">

            <div>
              <h3 className="font-bold text-xl mb-2">
                Registered Office
              </h3>

              <p className="text-gray-600">
                Plot No. 268
              </p>

              <p className="text-gray-600">
                Udyog Vihar Phase 4
              </p>

              <p className="text-gray-600">
                Gurugram, Haryana
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2">
                Support Hours
              </h3>

              <p className="text-gray-600">
                Monday - Saturday
              </p>

              <p className="text-gray-600">
                10:00 AM - 6:00 PM
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2">
                Email Support
              </h3>

              <p>support@yuvondesignhub.com</p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-3">
                Instant Chat
              </h3>

              <button className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full">
                Chat on WhatsApp
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5">

              <h3 className="font-bold text-red-600 mb-2">
                Security First
              </h3>

              <p className="text-gray-700">
                Yuvon never asks for OTP, card details or payments over calls.
                Ignore anyone asking for such information.
              </p>

            </div>

          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg mt-10 p-10">

          <h2 className="text-3xl font-bold mb-6">
            Send us a Message
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <input
              type="text"
              placeholder="Name"
              className="border rounded-lg px-4 py-3"
            />

            <input
              type="email"
              placeholder="Email"
              className="border rounded-lg px-4 py-3"
            />

          </div>

          <textarea
            rows="7"
            placeholder="Comment"
            className="border rounded-lg px-4 py-3 w-full mt-5"
          ></textarea>

          <button className="w-full bg-black text-white py-4 rounded-lg mt-5">
            SEND MESSAGE
          </button>

        </div>

      </div>
    </section>
  );
}

export default Support;