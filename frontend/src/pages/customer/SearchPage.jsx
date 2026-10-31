import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductPrice, { DiscountBadge } from "../../components/product/ProductPrice";
import ProductStock from "../../components/product/ProductStock"; // shared "N available" label
import { CartContext } from "../../context/CartContext";
import { SearchContext } from "../../context/SearchContext";
import { useGetProductsQuery } from "../../features/product/productApi";
import useAuth from "../../hooks/useAuth";
import { getCartRedirectForRole } from "../../utils/cartAccess";
import { matchesSearch } from "../../utils/productSearch"; // name/category/description/price matching

// Search results page
const SearchPage = () => {
  // Router, cart, search and login helpers
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { search } = useContext(SearchContext);
  const { user } = useAuth();
  const roleRedirect = getCartRedirectForRole(user?.role); // non-customer roles bounce to their own dashboard
  const { data: allProductsList = [] } = useGetProductsQuery({ per_page: 100 });

  const searchQuery = search || location.state?.query || ""; // query typed in navbar or passed via route
  // Search text in lowercase
  const query = searchQuery.toLowerCase();

  // products whose name/category/description or price match the query
  const filteredProducts = allProductsList?.filter((product) => matchesSearch(product, query)) || [];

  return (
    <div className="p-6 md:p-12 min-h-screen bg-gray-50 font-sans">
      {/* search results header */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-[#111827] uppercase tracking-tighter">
          SEARCH RESULTS
        </h2>
        {/* echoes back the search term */}
        <p className="text-sm text-gray-500 font-medium mt-1">
          Showing results for: <span className="text-orange-600 font-bold italic">"{searchQuery}"</span>
        </p>
      </div>

      {/* product results grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredProducts.map((product) => {
            const outOfStock = product.inStock === false || product.stock <= 0; // disables add to cart

            return (
              // product card
              <div key={product.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col h-full relative group">

                {/* Discount Badge, flash sale aware */}
                <DiscountBadge product={product} />

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
                  {/* product name, clamped to 2 lines */}
                  <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug hover:text-[#f57224] transition-colors">
                    {product.name}
                  </h3>

                  {/* unit/weight */}
                  <p className="text-[12px] text-gray-400 mt-1">
                    {product.weight || "1 Unit"}
                  </p>

                  {/* how many are actually available right now */}
                  <ProductStock product={product} className="mt-1" />

                  <div className="mt-auto pt-3">
                    {/* effective price + struck old price */}
                    <ProductPrice product={product} className="mb-3" />

                    {/* Green Styled Button */}
                    <button
                      disabled={outOfStock}
                      onClick={() => {
                        if (roleRedirect) {
                          navigate(roleRedirect);
                          return;
                        }
                        if (addToCart(product)) navigate("/cart");
                      }}
                      className={`w-full py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                        outOfStock
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-700 text-white hover:bg-green-800"
                      }`}
                    >
                      {outOfStock ? "OUT OF STOCK" : "ADD TO CART"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // no results state
        <div className="flex flex-col items-center justify-center py-32 text-gray-400 italic">
           <p className="text-xl font-bold">No products found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
