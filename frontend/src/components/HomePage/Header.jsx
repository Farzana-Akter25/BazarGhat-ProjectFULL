import { MapPin, Search, ShoppingCart, User } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CartContext } from "../../context/CartContext";
import { SearchContext } from "../../context/SearchContext";
import { allProductsList } from "../../pages/Centraldata";

const Header = () => {
  const { cartItems } = useContext(CartContext);
  const { search, setSearch } = useContext(SearchContext);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchExecution = (selectedText = search) => {
    if (selectedText.trim() !== "") {
      navigate("/search", { state: { query: selectedText } });
      setSearch("");
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearchExecution();
  };

  const query = search?.toLowerCase().trim() || "";

  const filteredProducts = query
    ? allProductsList?.filter(
        (product) =>
          product?.name?.toLowerCase().includes(query) ||
          product?.category?.toLowerCase().includes(query),
      )
    : [];

  return (
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <header className="bg-white py-4 px-6 md:px-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <ShoppingCart className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-orange-600">
            Bazar<span className="text-green-700">Ghat</span>
          </h1>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 mx-10 relative">
          <input
            type="text"
            placeholder="Search in..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-gray-100 py-2.5 px-5 rounded-full outline-none focus:ring-2 focus:ring-orange-300"
          />

          <Search
            className="absolute right-4 top-3 text-gray-400 w-5 h-5 cursor-pointer hover:text-orange-500"
            onClick={() => handleSearchExecution()}
          />

          {showDropdown && query && (
            <div className="absolute top-12 left-0 w-full bg-white shadow-lg rounded-lg z-50 max-h-72 overflow-y-auto border">
              {filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 8).map((product) => (
                  <div
                    key={product.id}
                    className="p-3.5 hover:bg-orange-50 cursor-pointer border-b last:border-0"
                    onClick={() => handleSearchExecution(product.name)}
                  >
                    <p className="text-sm font-semibold">{product.name}</p>
                  </div>
                ))
              ) : (
                <div className="p-3 text-gray-500 text-sm text-center">
                  No product found
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE ICONS (UPDATED SECTION) */}
        <div className="flex items-center gap-6">
          {/* Track Order */}
          <Link to="/track-order" className="flex flex-col items-center group">
            <MapPin className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Track</span>
          </Link>

          {/* Account */}
          <Link
            to="/customer-dashboard"
            className="flex flex-col items-center group"
          >
            <User className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Account</span>
          </Link>

          {/* Sign In */}
          <Link to="/login" className="flex flex-col items-center group">
            <User className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Sign In</span>
          </Link>

          {/* Sign Up */}
          <Link to="/register" className="flex flex-col items-center group">
            <User className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Sign Up</span>
          </Link>

          {/* Cart */}
          <Link to="/cart">
            <div className="flex flex-col items-center relative group">
              <ShoppingCart className="w-5 h-5 group-hover:text-orange-500" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
              <span className="text-[11px]">Cart</span>
            </div>
          </Link>
        </div>
      </header>
    </div>
  );
};

export default Header;
