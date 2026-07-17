import { ChevronDown, X, Menu, Leaf, ShoppingBasket, Layers3 } from "lucide-react"; 
import { useState } from "react";
import { Link } from "react-router-dom"; 

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="m-0 p-0 relative">
      {/* Navbar Main Bar */}
      <div className="bg-green-600 px-4 py-1 flex justify-between items-center shadow-sm">
        
        {/* Categories Button */}
        <button
          onClick={() => setOpen(!open)}
          className="text-white text-xl font flex items-center gap-2"
        >
          <Menu className="w-5 h-5" />
          Categories
          <ChevronDown
            className={`w-4 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Offers Link */}
        <Link to="/offer" className="text-white text-xl font- cursor-pointer hover:text-orange-200">
          Offers
        </Link>
      </div>

      
      {open && (
        <div className="absolute top-full left-0 w-80 bg-white p-6 shadow-2xl z-50 rounded-b-2xl">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Categories</h2>
            <X
              className="cursor-pointer text-gray-500 hover:text-red-500"
              onClick={() => setOpen(false)}
            />
          </div>

          
          <div className="flex flex-col gap-2">
            
            {/* Organic */}
            <Link to="/organic" onClick={() => setOpen(false)} className="group">
              <div className="flex justify-between items-center py-4 hover:bg-gray-50 cursor-pointer px-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Leaf className="w-6 h-6 text-green-600" /> {/* Organic Icon */}
                  <span className="text-2xl text-gray-700 group-hover:text-green-600 transition-colors">Organic</span>
                </div>
                <ChevronDown className="text-gray-500 -rotate-90 w-4 h-4" />
              </div>
            </Link>

            {/* Grocery */}
            <Link to="/grocery" onClick={() => setOpen(false)} className="group">
              <div className="flex justify-between items-center py-4 hover:bg-gray-50 cursor-pointer px-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShoppingBasket className="w-6 h-6 text-green-600" /> {/* Grocery Icon */}
                  <span className="text-2xl text-gray-700 group-hover:text-green-600 transition-colors">Grocery</span>
                </div>
                <ChevronDown className="text-gray-500 -rotate-90 w-4 h-4" />
              </div>
            </Link>

            {/* All Product */}
            <Link to="/all-product" onClick={() => setOpen(false)} className="group">
              <div className="flex justify-between items-center py-4 hover:bg-gray-50 cursor-pointer px-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Layers3 className="w-6 h-6 text-green-600" /> 
                  <span className="text-2xl text-gray-700 group-hover:text-green-600 transition-colors">All Product</span>
                </div>
                <ChevronDown className="text-gray-500 -rotate-90 w-4 h-4" />
              </div>
            </Link>

          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;