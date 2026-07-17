import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-white pt-16 pb-8 px-4 md:px-16 border-t border-gray-100 font-sans text-gray-600">
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        
        {/* Column 1 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-green-500 font-bold text-xl">BG</span>
            </div>
            <div>
              <h2 className="text-orange-500 font-bold text-xl">Bazar</h2>
              <h2 className="text-orange-500 font-bold text-xl">Ghat</h2>
            </div>
          </div>

          <p className="text-sm mb-6">
            BazarGhat is an e-commerce platform dedicated to providing safe and reliable food to every home.
          </p>

          <div className="space-y-3 text-sm">
            <p>📍 Dhaka, Bangladesh</p>
            <p>📞 01947938237</p>
            <p>✉ ritufarzana28@gmail.com</p>
          </div>
        </div>

        {/* Column 2 */}
        <div>
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Information</h4>
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
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Shop By</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/grocery" className="hover:text-orange-500">Organic & Grocery</Link></li>
          </ul>
        </div>

        {/* Column 4 */}
        <div>
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Support</h4>
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
          <h4 className="text-gray-800 font-semibold mb-6 text-lg">Consumer Policy</h4>
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