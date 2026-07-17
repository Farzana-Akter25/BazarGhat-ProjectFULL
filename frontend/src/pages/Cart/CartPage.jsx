import React, { useContext } from 'react';
import { Minus, Plus, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';

const CartPage = () => {
  const { cartItems = [], updateQty, removeItem } = useContext(CartContext);
  const navigate = useNavigate();

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price * item.quantity),
    0
  );

  const deliveryFee = cartItems.length > 0 ? 50 : 0;

  const totalDiscount = cartItems.reduce((acc, item) => {
    if (item.oldPrice && item.oldPrice > item.price) {
      return acc + (item.oldPrice - item.price) * item.quantity;
    }
    return acc;
  }, 0);

  const grandTotal = subtotal + deliveryFee;

  return (
    
    <div className="min-h-screen bg-gray-50 py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-green-600 font-semibold mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-8 text-green-600">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-3xl border flex items-center gap-6">

                  {/* Image */}
                  <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-gray-500 text-sm">{item.weight}</p>

                    <div className="flex gap-2 mt-1">
                      <span className="text-orange-600 font-bold">
                        ৳{item.price}
                      </span>
                      {item.oldPrice && (
                        <span className="line-through text-gray-400 text-sm">
                          ৳{item.oldPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center border rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <Minus size={18} />
                    </button>

                    <span className="px-4 font-bold">{item.quantity}</span>

                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Price + Remove */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-lg font-bold">
                        ৳{item.price * item.quantity}
                      </span>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X size={22} />
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border">
                <p className="text-gray-400 text-lg font-bold">
                  Your cart is empty!
                </p>
                <Link to="/" className="text-orange-600 font-bold mt-4 inline-block">
                  Go back to shop
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            <div className="bg-white p-8 rounded-3xl border shadow-sm sticky top-28">

              <h2 className="text-xl font-bold mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    ৳{subtotal}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold">
                    ৳{deliveryFee}
                  </span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>You Saved</span>
                    <span>-৳{totalDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg border-t pt-4">
                  <span>Total</span>
                  <span className="text-orange-600">
                    ৳{grandTotal}
                  </span>
                </div>

              </div>

              <Link
                to={cartItems.length > 0 ? "/checkout" : "#"}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold ${
                  cartItems.length > 0
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Proceed to Checkout <ArrowRight size={18} />
              </Link>

              <Link
                to="/"
                className="w-full mt-3 flex items-center justify-center border border-green-700 text-green-700 py-4 rounded-xl font-semibold hover:bg-green-50"
              >
                Continue Shopping
              </Link>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CartPage;