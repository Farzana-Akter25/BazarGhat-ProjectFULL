import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
// ✅ পাথটি আপনার ফোল্ডার অনুযায়ী চেক করুন। 
// সাধারণত src/pages থেকে src/context এ যেতে হলে "../context/..." ই যথেষ্ট।
import { CartContext } from "../context/CartContext"; 
import { allProductsList } from "./Centraldata";

const SearchPage = () => {
  const location = useLocation();
  const { addToCart } = useContext(CartContext);

  // Header থেকে পাঠানো state থেকে ডাটা নেওয়া হচ্ছে
  const searchQuery = location.state?.query || "";

  const filteredProducts = allProductsList?.filter((product) =>
    product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-6 md:p-12 min-h-screen bg-gray-50 font-sans">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-[#111827] uppercase tracking-tighter">
          SEARCH RESULTS
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Showing results for: <span className="text-orange-600 font-bold italic">"{searchQuery}"</span>
        </p>
      </div>
      
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredProducts.map((product) => {
            // ডিসকাউন্ট পার্সেন্টেজ ক্যালকুলেশন
            const discount = product.oldPrice 
              ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
              : 0;

            return (
              <div key={product.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col h-full relative group">
                
                {/* Discount Badge */}
                {discount > 0 && (
                  <div className="absolute top-2 left-2 bg-[#FF4D4D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                    -{discount}%
                  </div>
                )}

                {/* Product Image */}
                <div className="aspect-square bg-white flex items-center justify-center p-4">
                  <img 
                    src={product.img} 
                    alt={product.name} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col flex-grow text-left">
                  <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug hover:text-[#f57224] transition-colors">
                    {product.name}
                  </h3>
                  
                  <p className="text-[12px] text-gray-400 mt-1">
                    {product.weight || "1 Unit"}
                  </p>

                  <div className="mt-auto pt-3">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-bold text-[#F24E1E]">৳{product.price}</span>
                      {product.oldPrice && (
                        <span className="text-xs text-gray-300 line-through font-medium">
                          ৳{product.oldPrice}
                        </span>
                      )}
                    </div>

                    {/* Green Styled Button */}
                    <button 
                      onClick={() => addToCart(product)} 
                      className="w-full bg-green-600 text-white py-2 rounded text-[11px] font-bold uppercase tracking-wider hover:bg-green-700 transition-all"
                    >
                      ADD TO CART
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400 italic">
           <p className="text-xl font-bold">No products found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;