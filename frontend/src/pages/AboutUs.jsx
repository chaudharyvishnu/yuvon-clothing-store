function AboutUs() {
  return (
    <section className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl md:text-6xl font-serif font-bold mb-8">
          Welcome to Yuvon!
        </h1>

        <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
          <p>
            At Yuvon Design Hub, we believe fashion should feel as good as it
            looks. We create premium clothing for people who want comfort,
            confidence, and effortless style in their everyday life.
          </p>

          <p>
            Our focus is simple: design outfits that deliver quality, comfort,
            and modern style without asking you to compromise. From casual
            wear to daily essentials, every piece is created to support your
            routine.
          </p>

          <p>
            Yuvon is built for modern fashion lovers who want clothes that are
            stylish, comfortable, and easy to wear throughout the day.
          </p>
        </div>

        <div className="border-t mt-10 pt-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">
            Why Choose Yuvon?
          </h2>

          <div className="space-y-8 text-gray-700 text-lg leading-relaxed">
            <div>
              <h3 className="font-bold text-xl mb-2">Quality</h3>
              <p>
                We use premium fabrics and thoughtful finishing so every product
                feels comfortable, durable, and stylish.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2">Comfort</h3>
              <p>
                Our clothing is designed for daily wear, giving you freedom of
                movement and all-day comfort.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2">Modern Style</h3>
              <p>
                We blend current fashion trends with practical designs, so you
                can look polished without extra effort.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2">Customer Satisfaction</h3>
              <p>
                Our customers are at the center of everything we do. From
                product quality to support, we aim to deliver a smooth shopping
                experience.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-10 pt-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Join the Yuvon Community
          </h2>

          <p className="text-gray-700 text-lg leading-relaxed">
            By choosing Yuvon, you are joining a growing community of people who
            believe in dressing smartly, feeling confident, and living with
            comfort every day.
          </p>

          <p className="text-gray-700 text-lg leading-relaxed mt-5">
            Thank you for making Yuvon a part of your lifestyle. We are excited
            to grow with you.
          </p>
        </div>

        <div className="mt-12 bg-gray-50 border rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-4">Submit your Query</h2>

          <p className="text-gray-600 mb-6">
            For any support queries, please fill the following form.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              className="border px-4 py-4 outline-none"
            />

            <input
              type="email"
              placeholder="Email"
              className="border px-4 py-4 outline-none"
            />
          </div>

          <input
            type="text"
            placeholder="Phone number"
            className="border px-4 py-4 outline-none w-full mt-4"
          />

          <textarea
            placeholder="Comment"
            className="border px-4 py-4 outline-none w-full mt-4 h-56 resize-none"
          />

          <button
            onClick={() => alert("Your query has been submitted.")}
            className="w-full bg-black text-white py-4 mt-4 font-bold tracking-wide hover:bg-blue-600 transition"
          >
            SEND MESSAGE
          </button>
        </div>
      </div>
    </section>
  );
}

export default AboutUs; 