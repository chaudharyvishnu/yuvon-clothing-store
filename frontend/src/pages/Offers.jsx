const offerTabs = [
  "ALL",
  "Buy 2 Trousers. Save ₹99 Extra",
  "Any 2 Textured Tops = ₹99 Off",
  "Pocket Tights Combo ₹1599",
  "Shorts Combo @₹1399",
  "Stripe Tights Combo ₹1599",
  "Upto 40% off - New Arrivals",
  "Live Clearance Sale",
];

const offerProducts = [
  {
    id: 1,
    name: "Cotton Pintuck Wide Flared Trousers",
    price: 1199,
    oldPrice: 1999,
    rating: 4.85,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1",
  },
  {
    id: 2,
    name: "Women Textured Summer Top",
    price: 999,
    oldPrice: 1699,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7",
  },
  {
    id: 3,
    name: "Pocket Tights Combo",
    price: 1599,
    oldPrice: 2499,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
  },
  {
    id: 4,
    name: "Classic Casual Trouser",
    price: 1299,
    oldPrice: 2199,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
  },
];

function Offers() {
  return (
    <section className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-10">
          YUVON OFFERS OF THE SEASON
        </h1>

        <div className="flex gap-3 overflow-x-auto border-b-4 border-gray-700 pb-3 mb-12">
          {offerTabs.map((tab, index) => (
            <button
              key={tab}
              className={`whitespace-nowrap border px-5 py-3 font-semibold ${
                index === 0 ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-blue-100 rounded-2xl p-8 mb-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="inline-block bg-white px-4 py-2 rounded-full text-sm mb-5">
              Exclusive Season Deals
            </p>

            <h2 className="text-4xl font-bold mb-4">
              Flat discounts on selected styles
            </h2>

            <p className="text-gray-700 mb-6">
              Grab limited-time offers on trousers, tops, co-ord sets and more.
            </p>

            <button className="bg-black text-white px-8 py-4 rounded-lg font-bold">
              SHOP OFFERS
            </button>
          </div>

          <img
            src="https://images.unsplash.com/photo-1496747611176-843222e1e57c"
            alt="Offer banner"
            className="h-96 w-full object-cover rounded-2xl"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offerProducts.map((product) => (
            <div key={product.id} className="group cursor-pointer">
              <div className="relative overflow-hidden bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-80 w-full object-cover group-hover:scale-105 transition duration-500"
                />

                <span className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 text-sm">
                  SAVE 40%
                </span>
              </div>

              <div className="pt-4">
                <div className="flex justify-between">
                  <h3 className="font-medium text-lg">{product.name}</h3>
                  <span>★ {product.rating}</span>
                </div>

                <div className="flex gap-3 mt-2">
                  <span className="text-gray-400 line-through">
                    Rs. {product.oldPrice}
                  </span>
                  <span className="text-red-500 font-semibold">
                    Rs. {product.price}
                  </span>
                </div>

                <div className="flex gap-1 mt-3">
                  <span className="w-4 h-4 bg-black rounded-full"></span>
                  <span className="w-4 h-4 bg-gray-400 rounded-full"></span>
                  <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                  <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                  <span className="text-sm text-gray-500 ml-2">+ 12</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-10 text-center mt-20">
          <div>
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-3xl font-semibold">
              Cash on Delivery Available
            </h3>
          </div>

          <div>
            <div className="text-6xl mb-4">%</div>
            <h3 className="text-3xl font-semibold">Exclusive Discounts</h3>
          </div>

          <div>
            <div className="text-6xl mb-4">↩</div>
            <h3 className="text-3xl font-semibold">
              7-Day Easy Returns & Exchanges
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Offers;