import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const heroImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
];

function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const leftImage = heroImages[index];
  const rightImage = heroImages[(index + 1) % heroImages.length];

  return (
    <section className="bg-gray-100 min-h-[80vh] flex items-center">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">

        {/* Left Content */}
        <div>
          <p className="text-blue-600 font-semibold mb-3">
            New Collection 2026
          </p>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Discover Your <br /> Own Style
          </h1>

          <p className="text-gray-600 text-lg mb-8">
            Shop premium fashion, streetwear, and everyday outfits designed
            for modern confidence.
          </p>

          <Link
            to="/shop#shop-collection"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Shop Now
          </Link>
        </div>

        {/* Right Images */}
        <div className="grid grid-cols-2 gap-4">

          <img
            key={leftImage}
            src={leftImage}
            alt="Fashion"
            className="rounded-3xl h-96 w-full object-cover transition-all duration-700 hover:scale-105"
          />

          <img
            key={rightImage}
            src={rightImage}
            alt="Fashion"
            className="rounded-3xl h-96 w-full object-cover mt-12 transition-all duration-700 hover:scale-105"
          />

        </div>

      </div>
    </section>
  );
}

export default Hero;