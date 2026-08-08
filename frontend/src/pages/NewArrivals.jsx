import { useNavigate } from "react-router-dom";

const newArrivalProducts = [
  {
    id: 5,
    name: "Women’s Soft Yellow Pure Linen Top",
    price: 3599,
    oldPrice: 4999,
    save: "SAVE 28%",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7",
  },
  {
    id: 6,
    name: "Women’s Navy Textured Co-ord Set",
    price: 2099,
    oldPrice: 2899,
    save: "SAVE 27%",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
  },
  {
    id: 7,
    name: "Minimal Abstract Print Formal Work Top",
    price: 1399,
    oldPrice: 1899,
    save: "SAVE 26%",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
  },
  {
    id: 8,
    name: "Women Mandarin Collar Top",
    price: 999,
    oldPrice: 1899,
    save: "SAVE 47%",
    rating: 4.84,
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b",
  },
];

function NewArrivals() {
  const navigate = useNavigate();

  return (
    <section className="bg-white min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-sm text-gray-500 mb-6">
          HOME / SHOP / <span className="text-black">NEW ARRIVALS</span>
        </div>

        <div className="flex justify-between items-center mb-8">
          <button className="font-semibold">⚙ Hide filters</button>

          <div className="flex gap-6 items-center">
            <p>
              Sort by <span className="font-semibold">Featured</span> ˅
            </p>
            <p className="text-gray-500">1-16 of 21 products</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <aside className="hidden lg:block">
            <div className="space-y-8 text-gray-700">
              <div>
                <p>□ In stock (18)</p>
                <p className="mt-3">□ Out of stock (9)</p>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">PRICE</h3>
                <p className="text-sm mb-3">
                  The highest price is Rs. 3,599.00
                </p>
                <input type="range" className="w-full" />
                <div className="flex gap-3 mt-3">
                  <input className="border p-2 w-24" value="₹ 0.00" readOnly />
                  <input
                    className="border p-2 w-28"
                    value="₹ 3599.00"
                    readOnly
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">SIZE</h3>
                {["2XL [46]", "3XL [36-38]", "4XL [50]", "5XL [52]"].map(
                  (size) => (
                    <p key={size} className="mb-3">
                      □ {size}
                    </p>
                  )
                )}
                <button className="underline">SHOW MORE</button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">COLORS</h3>
                <p>□ Aqua Mist</p>
                <p className="mt-3">□ Blue</p>
                <p className="mt-3">□ Black</p>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-4">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {newArrivalProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative bg-gray-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-[420px] w-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    <span className="absolute top-5 left-5 bg-red-400 text-white text-sm px-4 py-2">
                      {product.save}
                    </span>

                    <span className="absolute top-16 left-5 bg-white text-black text-sm px-4 py-2">
                      NEW IN
                    </span>
                  </div>

                  <div className="pt-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-medium text-lg leading-snug group-hover:text-blue-600">
                        {product.name}
                      </h3>
                      <p className="text-sm">★ {product.rating}</p>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <span className="text-gray-400 line-through">
                        Rs. {product.oldPrice}
                      </span>
                      <span className="text-red-500 font-semibold">
                        Rs. {product.price}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/product/${product.id}`);
                      }}
                      className="mt-4 w-full bg-black text-white py-3 rounded-lg hover:bg-blue-600 transition"
                    >
                      View Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NewArrivals;