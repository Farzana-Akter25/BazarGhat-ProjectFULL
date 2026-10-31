import { SlidersHorizontal } from "lucide-react"; // filter icon
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../../context/CartContext";
import ProductPrice, { DiscountBadge } from "../../../components/product/ProductPrice";
import ProductStock from "../../../components/product/ProductStock"; // shared "N available" label
import { useGetProductsQuery } from "../../../features/product/productApi";
import useAuth from "../../../hooks/useAuth";
import { getCartRedirectForRole } from "../../../utils/cartAccess";

// price filter dropdown options -> query params
const PRICE_RANGES = {
  "All Prices": {},
  "Under 100TK": { max_price: 99 },
  "100TK - 300TK": { min_price: 100, max_price: 300 },
  "Above 300TK": { min_price: 301 },
};

// All products page with price filter
const Allproduct = () => {
  const { addToCart } = useContext(CartContext); // add product to cart
  // Router and login helpers
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleRedirect = getCartRedirectForRole(user?.role); // non-customer roles get redirected instead
  const [priceRange, setPriceRange] = useState("All Prices"); // selected price filter

  // query params: all categories + selected price range
  const queryParams = useMemo(
    () => ({ per_page: 100, ...PRICE_RANGES[priceRange] }),
    [priceRange],
  );
  const { data: filteredProducts = [], isLoading } = useGetProductsQuery(queryParams);

  return (
    <div className="bg-[#eff0f5] min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-end shadow-sm">
        {/* price filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-500" />
          {/* price range dropdown */}
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
        {/* section heading + count */}
        <h2 className="text-[#212121] text-2xl font-bold mb-4">
          All Products ({filteredProducts.length})
        </h2>

        {isLoading ? (
          // loading state
          <div className="bg-white p-10 text-center rounded-lg shadow-sm">
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          // empty state
          <div className="bg-white p-10 text-center rounded-lg shadow-sm">
            <p className="text-gray-500">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 bg-[#eff0f5]">
            {/* product cards list */}
            {filteredProducts.map((product) => {
              const outOfStock = product.inStock === false || product.stock <= 0; // disable button when true

              return (
                // single product card
                <div
                  key={product.id}
                  className="bg-white flex flex-col border border-gray-100 hover:shadow-lg transition-all overflow-hidden group"
                >
                  <div className="p-3 flex flex-col grow">
                    <div className="relative">
                      {/* discount badge, flash sale aware */}
                      <DiscountBadge product={product} />
                      {/* product image */}
                      <div className="w-full aspect-square mb-2 overflow-hidden">
                        <img
                          src={product.img}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // fallback image if product photo fails to load
                            e.target.onerror = null;
                            e.target.src =
                              "https://placehold.co/150x150?text=Product";
                          }}
                        />
                      </div>
                    </div>

                    {/* product name */}
                    <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug">
                      {product.name}
                    </h3>
                    {/* weight/unit label */}
                    <p className="text-[10px] text-gray-400 mb-2">
                      {product.weight || "1 Unit"}
                    </p>

                    {/* how many are actually available right now */}
                    <ProductStock product={product} className="mb-2" />

                    {/* effective price + struck old price */}
                    <ProductPrice product={product} className="mt-auto" />
                  </div>

                  {/* add to cart button */}
                  <button
                    disabled={outOfStock}
                    onClick={() => {
                      if (roleRedirect) {
                        // non-customer role, send elsewhere instead of cart
                        navigate(roleRedirect);
                        return;
                      }
                      if (addToCart(product)) navigate("/cart");
                    }}
                    className={`w-full py-2 text-[12px] font-bold transition-colors uppercase tracking-tight ${
                      outOfStock
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[#00aa4b] text-white hover:bg-[#008f3f]"
                    }`}
                  >
                    {outOfStock ? "Out of Stock" : "Add To Cart"}
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

export default Allproduct;
