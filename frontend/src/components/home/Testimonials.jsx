const testimonials = [
  {
    id: 1,
    product: "Cotton Trousers",
    name: "Anshica, Delhi",
    review:
      "Fabric is so smooth and comfortable. Perfect for office and daily wear.",
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1",
  },
  {
    id: 2,
    product: "Compression Short",
    name: "Ritika, Mumbai",
    review:
      "Loved the fit and quality. I ordered another one immediately.",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
  },
  {
    id: 3,
    product: "Textured Shirt Top",
    name: "Manasvi, Gurugram",
    review:
      "Very light fabric and premium feel. Great for all day wear.",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
  },
  {
    id: 4,
    product: "Stretch Tailored Pant",
    name: "Priya, Noida",
    review:
      "Very comfortable and stylish. Looks professional and feels easy.",
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7",
  },
];

function Testimonials() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl font-serif font-bold mb-10">
          Loved. Trusted. Worn.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((item) => (
            <div key={item.id} className="border bg-white">
              <img
                src={item.image}
                alt={item.product}
                className="h-96 w-full object-cover"
              />

              <div className="p-6">
                <p className="text-red-400 text-xl mb-4">★★★★★</p>

                <h3 className="text-xl font-bold mb-3">
                  {item.product}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {item.review}
                </p>

                <p className="mt-5 font-semibold text-gray-700">
                  {item.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;