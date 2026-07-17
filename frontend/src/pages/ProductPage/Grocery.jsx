import { Home, SlidersHorizontal } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";

import { groceryProducts } from "../Centraldata";

const Grocery = () => {
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [priceRange, setPriceRange] = useState("All Prices");

  const filteredProducts = groceryProducts.filter((item) => {
    if (priceRange === "Under 100TK") return item.price < 100;
    if (priceRange === "100TK - 300TK")
      return item.price >= 100 && item.price <= 300;
    if (priceRange === "Above 300TK") return item.price > 300;
    return true;
  });

  return (
    <div className="bg-[#eff0f5] min-h-screen pb-12">
      {/*navigation bar*/}
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link
            to="/home"
            className="hover:text-[#f57224] flex items-center gap-1"
          >
            <Home size={16} /> Home
          </Link>
          <span>/</span>
          <span className="text-gray-400 font-medium">Grocery Products</span>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-500" />
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm bg-white focus:outline-none focus:border-[#f57224]"
          >
            <option value="All Prices">All Prices</option>
            <option value="Under 100TK">Under ৳100</option>
            <option value="100TK - 300TK">৳100 - ৳300</option>
            <option value="Above 300TK">Above ৳300</option>
          </select>
        </div>
      </div>

      {/* product grid */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <h2 className="text-[#212121] text-2xl font-bold mb-4">
          Grocery Products ({filteredProducts.length})
        </h2>

        {filteredProducts.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-lg shadow-sm">
            <p className="text-gray-500">
              No products found in this price range.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 bg-[#eff0f5]">
            {filteredProducts.map((product) => {
              const discountPercentage = product.oldPrice
                ? Math.round(
                    ((product.oldPrice - product.price) / product.oldPrice) *
                      100,
                  )
                : 0;

              return (
                <div
                  key={product.id}
                  className="bg-white flex flex-col border border-gray-100 hover:shadow-lg transition-all overflow-hidden group"
                >
                  <div className="p-3 flex flex-col flex-grow">
                    <div className="relative">
                      {discountPercentage > 0 && (
                        <span className="absolute top-2 left-2 inline-flex items-center justify-center rounded-lg bg-[#ff2d37] px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm z-10">
                          -{discountPercentage}%
                        </span>
                      )}
                      <div className="w-full aspect-square mb-2 overflow-hidden">
                        <img
                          src={product.img}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://placehold.co/150x150?text=Product";
                          }}
                        />
                      </div>
                    </div>

                    <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 mb-2">
                      {product.weight || "1 Unit"}
                    </p>

                    <div className="mt-auto">
                      <div className="text-[#f57224] font-bold text-lg leading-none">
                        ৳{product.price}
                      </div>
                      {product.oldPrice && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-400 line-through text-[11px]">
                            ৳{product.oldPrice}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(product);
                      navigate("/cart");
                    }}
                    className="w-full bg-[#00aa4b] text-white py-2 text-[12px] font-bold transition-colors uppercase tracking-tight hover:bg-[#008f3f]"
                  >
                    Add To Cart
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Grocery;
