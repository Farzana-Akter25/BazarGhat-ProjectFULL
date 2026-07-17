import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";

const LogoutPage = () => {
  const navigate = useNavigate();

  // ✅ Logout Function
  const handleLogout = () => {
    // localStorage/session clear
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // চাইলে সব clear করতে পারো:
    // localStorage.clear();

    // redirect to login or home
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-4 rounded-full">
            <LogOut className="text-red-500 w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-2">Logout</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to logout?
        </p>

        {/* Buttons */}
        <div className="flex gap-3">

          {/* Cancel */}
          <button
            onClick={() => navigate(-1)}
            className="w-1/2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>

          {/* Confirm Logout */}
          <button
            onClick={handleLogout}
            className="w-1/2 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium"
          >
            Logout
          </button>

        </div>
      </div>
    </div>
  );
};

export default LogoutPage;