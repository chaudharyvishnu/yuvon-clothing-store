import { useNavigate } from "react-router-dom";

const clearanceProducts = [
  {
    id: 9,
    name: "All Day Cotton Pant",
    price: 699,
    oldPrice: 2299,
    save: "SAVE 70%",
    rating: 4.88,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1",
  },
  {
    id: 10,
    name: "AeroGlide Jogger",
    price: 599,
    oldPrice: 1819,
    save: "SAVE 67%",
    rating: 4.71,
    image: "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2",
  },
  {
    id: 11,
    name: "Track Essential Shorts",
    price: 399,
    oldPrice: 1259,
    save: "SAVE 68%",
    rating: 4.87,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
  },
  {
    id: 12,
    name: "Pleated Wide Leg Trouser",
    price: 499,
    oldPrice: 1598,
    save: "SAVE 69%",
    rating: 4.85,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
  },
];

function ClearanceSale() {
  const navigate = useNavigate();

  return (
    <section className="bg-white min-h-screen">

      {/* Moving Marquee */}
      <div className="bg-black overflow-hidden py-5">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">

          <div className="flex items-center gap-20 text-white text-3xl font-semibold pr-20">
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
          </div>

          <div className="flex items-center gap-20 text-white text-3xl font-semibold">
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
            <span>⚡ Yuvon Clearance Sale is LIVE</span>
            <span>Yuvon Clearance Sale is LIVE</span>
          </div>

        </div>
      </div>

      {/* Heading */}
      <div className="max-w-7xl mx-auto px-6 py-12">

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold">
            Flash Clearance Sale - Upto 80% OFF
          </h1>

          <p className="text-gray-600 text-xl mt-5">
            Huge savings on your Yuvon favorites — While Stocks Last!
          </p>
        </div>

        {/* Products */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {clearanceProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden bg-gray-100 rounded">

                <img
                  src={product.image}
                  alt={product.name}
                  className="h-[520px] w-full object-cover group-hover:scale-105 transition duration-500"
                />

                <div className="absolute top-5 left-5 space-y-2">
                  <span className="block bg-red-400 text-white text-sm px-4 py-2">
                    {product.save}
                  </span>

                  <span className="block bg-red-600 text-white text-sm px-4 py-2">
                    CLEARANCE SALE
                  </span>
                </div>
              </div>

              <div className="pt-4">

                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium group-hover:text-blue-600">
                    {product.name}
                  </h3>

                  <p className="text-sm">★ {product.rating}</p>
                </div>

                <div className="flex gap-3 mt-2">
                  <span className="text-gray-400 line-through">
                    Rs. {product.oldPrice}
                  </span>

                  <span className="text-red-600 font-semibold">
                    Rs. {product.price}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <span className="w-4 h-4 rounded-full bg-black"></span>
                  <span className="w-4 h-4 rounded-full bg-red-900"></span>
                  <span className="w-4 h-4 rounded-full bg-blue-800"></span>
                  <span className="w-4 h-4 rounded-full bg-gray-400"></span>
                  <span className="text-sm text-gray-500 ml-2">+12</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/product/${product.id}`);
                  }}
                  className="w-full mt-5 bg-black text-white py-3 rounded-lg hover:bg-blue-600 transition"
                >
                  View Product
                </button>

              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}

export default ClearanceSale;