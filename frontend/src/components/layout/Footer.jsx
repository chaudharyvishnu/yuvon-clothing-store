import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12">
        {/* Customer Service */}
        <div>
          <h3 className="text-sm tracking-[3px] font-semibold uppercase mb-6">
            Customer Service
          </h3>

          <ul className="space-y-3 text-gray-600">
            <li>
              <Link to="/track-order" className="hover:text-blue-600">
                Track Order
              </Link>
            </li>

            <li>
              <Link to="/return-exchange" className="hover:text-blue-600">
                Return / Exchange
              </Link>
            </li>

            <li>
              <Link to="/support" className="hover:text-blue-600">
                Contact Us
              </Link>
            </li>

            <li>
              <Link to="/shop" className="hover:text-blue-600">
                Search
              </Link>
            </li>

            <li>
              <Link to="/support" className="hover:text-blue-600">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h3 className="text-sm tracking-[3px] font-semibold uppercase mb-6">
            Policies & More
          </h3>

          <ul className="space-y-3 text-gray-600">
            <li>
              <Link to="/about-us" className="hover:text-blue-600">
                About Us
              </Link>
            </li>

            <li>
              <Link to="/privacy-policy" className="hover:text-blue-600">
                Privacy Policy
              </Link>
            </li>

            <li>
              <Link to="/terms-conditions" className="hover:text-blue-600">
                Terms & Conditions
              </Link>
            </li>

            <li>
              <Link to="/shipping-policy" className="hover:text-blue-600">
                Shipping Policy
              </Link>
            </li>

            <li>
              <Link to="/return-refund-policy" className="hover:text-blue-600">
                Return & Refund Policy
              </Link>
            </li>

            <li>
              <Link to="/join-yuvon" className="hover:text-blue-600">
                Careers
              </Link>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h2 className="text-3xl font-extrabold text-blue-600 mb-6">
            Yuvon Design Hub
          </h2>

          <p className="text-lg font-medium text-gray-700 mb-4">
            Yuvon Enterprises
          </p>

          <p className="text-gray-600 leading-8 mb-6">
            Plot No. 268,
            <br />
            Udyog Vihar, Phase 4,
            <br />
            Gurugram, Haryana - 122015
          </p>

          <p className="text-gray-700 mb-8">
            Write us at{" "}
            <a
              href="mailto:yuvonneterprises@gmail.com"
              className="text-blue-600 font-semibold hover:underline"
            >
              yuvonneterprises@gmail.com
            </a>
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-5 text-2xl">
            <a href="#" className="hover:text-blue-600 transition">
              ⓕ
            </a>

            <a href="#" className="hover:text-black transition">
              𝕏
            </a>

            <a href="#" className="hover:text-pink-600 transition">
              ◎
            </a>

            <a href="#" className="hover:text-red-600 transition">
              ▶
            </a>

            <a href="#" className="hover:text-red-500 transition">
              ⓟ
            </a>

            <a href="#" className="hover:text-blue-700 transition font-bold">
              in
            </a>
          </div>
        </div>
      </div>

      <div className="border-t py-5 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Yuvon Enterprises. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;