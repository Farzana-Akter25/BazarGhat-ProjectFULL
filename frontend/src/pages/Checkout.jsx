import React, { useContext } from 'react';
import { 
  MapPin, 
  ShoppingCart, 
  User, 
  ShoppingBag, 
  CheckCircle,
  ArrowLeft   
} from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext'; 

const Checkout = () => {
  const { cartItems } = useContext(CartContext); 
  const navigate = useNavigate();

  // Price Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = cartItems.length > 0 ? 50 : 0;
  const total = subtotal + deliveryFee;

  const handleConfirmOrder = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    navigate('/allpayment', { 
      state: { 
        total,
        cartItems 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      
      
        {/* ✅ Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-8 italic">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white p-6 rounded-xl border">
              <h2 className="flex items-center gap-2 font-bold mb-4">
                <User className="text-orange-500" /> Contact Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input placeholder="Full Name" className="p-3 bg-gray-100 rounded-lg outline-none" />
                <input placeholder="Phone Number" className="p-3 bg-gray-100 rounded-lg outline-none" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h2 className="flex items-center gap-2 font-bold mb-4">
                <MapPin className="text-orange-500" /> Delivery Address
              </h2>
              <textarea placeholder="Enter full address..." className="w-full p-3 bg-gray-100 rounded-lg h-28 outline-none resize-none"></textarea>
            </div>

          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border h-fit sticky top-28 shadow-lg">
              <h2 className="flex items-center gap-2 font-bold mb-4">
                <ShoppingBag className="text-orange-500" /> Order Summary
              </h2>
              
              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-orange-600">৳{total}</span>
                </div>
              </div>

              <button 
                onClick={handleConfirmOrder}
                disabled={cartItems.length === 0}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 
                  ${cartItems.length > 0 ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-400"}`}
              >
                <CheckCircle size={20} />
                Process to Pay
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;