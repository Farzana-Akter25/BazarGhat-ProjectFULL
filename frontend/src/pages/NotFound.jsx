import { ArrowLeft, Compass, Hammer, Home, LifeBuoy, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";


// Pages that are planned but not built yet, with their titles
const PLANNED_PAGES = {
  "/about": "About Us",
  "/contact": "Contact Us",
  "/company": "Company Info",
  "/terms": "Terms & Conditions",
  "/privacy": "Privacy Policy",
  "/careers": "Careers",
  "/support": "Support Center",
  "/how-to-order": "How to Order",
  "/tracking": "Order Tracking",
  "/payment": "Payment",
  "/shipping": "Shipping",
  "/faq": "FAQ",
  "/return": "Happy Return",
  "/refund": "Refund Policy",
  "/exchange": "Exchange",
  "/cancel": "Cancellation",
  "/preorder": "Pre-Order",
  "/discount": "Extra Discount",
};

// shortcuts offered on both variants of the page
const SUGGESTIONS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/all-product", label: "All Products", icon: Compass },
  { to: "/offer", label: "Offers", icon: Search },
  { to: "/track-order", label: "Track Order", icon: LifeBuoy },
];

// Page shown for unknown routes (or pages not built yet)
const NotFound = () => {
  // Router helpers
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // trailing slashes shouldn't stop a planned page from being recognised
  const normalized = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  // Title of the planned page, if this is one
  const plannedTitle = PLANNED_PAGES[normalized];

  return (
    // full page wrapper
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f4f6fa] px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10">
        {/* icon badge — hammer for planned pages, compass for a genuine wrong turn */}
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            plannedTitle ? "bg-orange-50 text-orange-500" : "bg-slate-100 text-slate-400"
          }`}
        >
          {plannedTitle ? <Hammer size={28} /> : <Compass size={28} />}
        </span>

        {/* headline */}
        <h1 className="mt-6 text-2xl font-extrabold text-gray-800 sm:text-3xl">
          {plannedTitle ? `${plannedTitle} is coming soon` : "Page not found"}
        </h1>

        {/* explanation */}
        <p className="mt-2 text-sm text-gray-500">
          {plannedTitle
            ? "This page is still being built. Everything else on BazarGhat is ready to use — try one of these instead."
            : "We couldn't find anything at this address. It may have been moved or the link may be mistyped."}
        </p>

        {/* the path that was requested */}
        <p className="mt-4 inline-block rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-400">
          {pathname}
        </p>

        {/* shortcut links */}
        <div className="mt-7 grid grid-cols-2 gap-3">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              <s.icon size={15} />
              {s.label}
            </Link>
          ))}
        </div>

        {/* back to previous page */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition-colors hover:text-green-700"
        >
          <ArrowLeft size={15} />
          Go back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
