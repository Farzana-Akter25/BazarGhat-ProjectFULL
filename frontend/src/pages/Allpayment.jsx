import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Wallet, 
  ChevronLeft 
} from "lucide-react";
import { CartContext } from "../context/CartContext"; 

const Allpayment = () => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const navigate = useNavigate();
  

  const { cartItems } = useContext(CartContext);
  // Realtime Calculation
  const subtotalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryCharge = cartItems.length > 0 ? 50 : 0;
  const totalAmount = subtotalAmount + deliveryCharge;

  // Payment Selection Logic
  const paymentMethods = [
    {
      id: "bkash",
      label: "bKash",
      subLabel: "Instant Mobile Payment",
      icon: <div className="font-bold text-pink-600 text-sm">bKash</div>,
    },
    {
      id: "nagad",
      label: "Nagad",
      subLabel: "Secure Digital Wallet",
      icon: <div className="font-bold text-orange-600 text-sm">Nagad</div>,
    },
    {
      id: "card",
      label: "Cards",
      subLabel: "Visa, Mastercard, Amex",
      icon: <CreditCard size={20} className="text-indigo-600" />,
    },
    {
      id: "cod",
      label: "Cash on Delivery",
      subLabel: "Pay when you receive",
      icon: <Truck size={20} className="text-emerald-600" />,
    },
  ];

  // ✅ Updated Navigation Logic
  const handleConfirmOrder = () => {
    if (!selectedMethod) {
      alert("Please select a payment method first!");
      return;
    }

    
    if (selectedMethod === "bkash") {
      navigate("/checkout/bkash");
    } else if (selectedMethod === "nagad") {
      navigate("/checkout/nagad"); 
    } else if (selectedMethod === "card") {
      navigate("/checkout/bank");  
    } else if (selectedMethod === "cod") {
      navigate("/congratulation");
    }
  };

  return (
    <div className="bg-[#F1F5F9] min-h-screen p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">

        {/* LEFT SECTION: Payment Methods */}
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Method</h1>
              <p className="text-slate-500 text-sm">Select how you'd like to pay</p>
            </div>
          </div>
          
          <div className="grid gap-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`group flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 
                  ${selectedMethod === method.id 
                    ? `border-orange-500 bg-white shadow-md scale-[1.01]` 
                    : "border-transparent bg-white hover:border-slate-200 shadow-sm"
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                  ${selectedMethod === method.id ? `bg-orange-50` : "bg-slate-50"}`}>
                  {method.icon}
                </div>

                <div className="ml-4 flex-1">
                  <h3 className="font-bold text-slate-800 text-base leading-tight">{method.label}</h3>
                  <p className="text-xs text-slate-400">{method.subLabel}</p>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${selectedMethod === method.id 
                    ? `border-orange-500 bg-orange-500 text-white` 
                    : "border-slate-200"}`}>
                  {selectedMethod === method.id && <CheckCircle2 size={12} strokeWidth={3} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SECTION: Summary Card */}
        <div className="w-full lg:w-[350px]">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 sticky top-10 mt-12 lg:mt-16">
            <div className="flex items-center gap-2 mb-6 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
              <Wallet size={14} />
              Order Summary
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-sm">Subtotal ({cartItems.length} items)</span>
                <span className="font-semibold">৳{subtotalAmount}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-sm">Delivery Fee</span>
                <span className="font-semibold">৳{deliveryCharge}</span>
              </div>
              
              <div className="border-t border-slate-100 my-4 pt-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Total Payable</p>
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tighter">৳{totalAmount}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={!selectedMethod || cartItems.length === 0}
              className={`w-full mt-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95
                ${selectedMethod && cartItems.length > 0
                  ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            >
              Confirm Order <ArrowRight size={18} />
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-300 text-[10px] uppercase tracking-widest font-bold">
              <ShieldCheck size={14} />
              Secure SSL Payment
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Allpayment;