import React from "react";
import { ShieldCheck, Truck, Wallet } from "lucide-react"; // payment method icons
import { Link } from "react-router-dom";

// Site footer with links and contact details
const Footer = () => {
  return (
    // page footer
    <footer className="bg-white pt-16 pb-8 px-4 md:px-16 border-t border-gray-100 font-sans text-gray-600">

      {/* footer columns grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

        {/* Column 1 */}
        <div>
          {/* brand logo + name */}
          <div className="flex items-center gap-2 mb-4">
            {/* logo badge */}
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-green-700 font-bold text-xl">BG</span>
            </div>
            <div>
              <h2 className="text-orange-500 font-bold text-xl">Bazar</h2>
              <h2 className="text-orange-500 font-bold text-xl">Ghat</h2>
            </div>
          </div>

          {/* tagline */}
          <p className="text-sm mb-6">
            BazarGhat is an e-commerce platform dedicated to providing safe and reliable food to every home.
          </p>

          {/* contact info */}
          <div className="space-y-3 text-sm">
            <p>📍 Dhaka, Bangladesh</p>
            <p>📞 01947938237</p>
            <p>✉ ritufarzana28@gmail.com</p>
          </div>
        </div>

        {/* Column 2 */}
        <div>
          {/* column heading */}
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Information</h4>
          {/* info links list */}
          <ul className="space-y-3 text-sm">
            <li><Link to="/about" className="hover:text-orange-500">About us</Link></li>
            <li><Link to="/contact" className="hover:text-orange-500">Contact us</Link></li>
            <li><Link to="/company" className="hover:text-orange-500">Company Info</Link></li>
            <li><Link to="/terms" className="hover:text-orange-500">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-orange-500">Privacy Policy</Link></li>
            <li><Link to="/careers" className="hover:text-orange-500">Careers</Link></li>
          </ul>
        </div>

        {/* Column 3 */}
        <div>
          {/* column heading */}
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Shop By</h4>
          {/* shop-by links list */}
          <ul className="space-y-3 text-sm">
            <li><Link to="/grocery" className="hover:text-orange-500">Organic & Grocery</Link></li>
          </ul>
        </div>

        {/* Column 4 */}
        <div>
          {/* column heading */}
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Support</h4>
          {/* support links list */}
          <ul className="space-y-3 text-sm">
            <li><Link to="/support" className="hover:text-orange-500">Support Center</Link></li>
            <li><Link to="/how-to-order" className="hover:text-orange-500">How to Order</Link></li>
            <li><Link to="/tracking" className="hover:text-orange-500">Order Tracking</Link></li>
            <li><Link to="/payment" className="hover:text-orange-500">Payment</Link></li>
            <li><Link to="/shipping" className="hover:text-orange-500">Shipping</Link></li>
            <li><Link to="/faq" className="hover:text-orange-500">FAQ</Link></li>
          </ul>
        </div>

        {/* Column 5 */}
        <div>
          {/* column heading */}
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Consumer Policy</h4>
          {/* policy links list */}
          <ul className="space-y-3 text-sm">
            <li><Link to="/return" className="hover:text-orange-500">Happy Return</Link></li>
            <li><Link to="/refund" className="hover:text-orange-500">Refund Policy</Link></li>
            <li><Link to="/exchange" className="hover:text-orange-500">Exchange</Link></li>
            <li><Link to="/cancel" className="hover:text-orange-500">Cancellation</Link></li>
            <li><Link to="/preorder" className="hover:text-orange-500">Pre-Order</Link></li>
            <li><Link to="/discount" className="hover:text-orange-500">Extra Discount</Link></li>
          </ul>
        </div>
      </div>

      {/* payment methods */}
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100">

        {/* Pay With — the ways this store actually accepts money */}
        <div>
          {/* section heading */}
          <h4 className="text-gray-800 font-semibold mb-4 text-lg">Pay With</h4>

          {/* card + mobile banking logos, all routed through SSLCommerz */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* visa card */}
            <span className="h-10 w-16 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
              <span className="text-[#1a1f71] font-extrabold italic text-sm tracking-tight">VISA</span>
            </span>
            {/* mastercard */}
            <span className="h-10 w-16 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
              <span className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-[#eb001b]"></span>
                <span className="w-4 h-4 rounded-full bg-[#f79e1b] -ml-1.5"></span>
              </span>
            </span>
            {/* bkash */}
            <span className="h-10 w-16 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
              <span className="text-[#e2136e] font-extrabold text-sm">bKash</span>
            </span>
            {/* nagad */}
            <span className="h-10 w-16 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
              <span className="text-[#f05a28] font-extrabold text-sm">নগদ</span>
            </span>
            {/* cash on delivery */}
            <span className="h-10 px-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-1.5">
              <Truck size={16} className="text-green-700" />
              <span className="text-gray-700 font-bold text-xs">Cash on Delivery</span>
            </span>
            {/* refund balance */}
            <span className="h-10 px-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-1.5">
              <Wallet size={16} className="text-orange-500" />
              <span className="text-gray-700 font-bold text-xs">Refund Wallet</span>
            </span>
          </div>

          {/* gateway note */}
          <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
            <ShieldCheck size={14} className="text-green-700" />
            Online payments secured by SSLCommerz
          </p>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-8 right-8 bg-orange-500 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600"
      >
        ↑
      </button>

    </footer>
  );
};

export default Footer;