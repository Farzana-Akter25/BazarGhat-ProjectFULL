import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import TrackOrder from "../../pages/customer/TrackOrder"; // order tracking, modal variant


// Popup with the order tracking form
const TrackOrderModal = ({ onClose }) => {
  // close on Escape and lock background scroll while open
  useEffect(() => {
    // Close when Escape is pressed
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Stop the page scrolling while the popup is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    // dimmed backdrop, click outside closes
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      {/* popup card, clicks inside stay */}
      <div
        className="relative my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-orange-500"
        >
          <X className="h-4 w-4" />
        </button>

        {/* tracking content, scrolls on its own when the list is long */}
        <div className="max-h-[80vh] overflow-y-auto p-4 pt-9">
          <TrackOrder asModal onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TrackOrderModal;
