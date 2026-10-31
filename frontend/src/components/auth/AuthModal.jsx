import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import Login from "../../pages/auth/Login/Login"; // sign in form, modal variant
import Register from "../../pages/auth/Registration/Registration"; // sign up form, modal variant


// Popup that shows the login or register form
const AuthModal = ({ mode, onClose, onModeChange }) => {
  // close on Escape and lock background scroll while open
  useEffect(() => {
    // Close when Escape is pressed
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Remember the page scroll setting, then stop the page scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      {/* popup card, clicks inside stay */}
      <div
        className="relative w-full max-w-xs rounded-2xl bg-white shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-orange-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* active form */}
        <div className="p-5">
          {mode === "register" ? (
            <Register
              asModal
              onClose={onClose}
              onSwitchToLogin={() => onModeChange("login")}
            />
          ) : (
            <Login
              asModal
              onClose={onClose}
              onSwitchToRegister={() => onModeChange("register")}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AuthModal;
