import {
  Bell,
  History,
  Home,
  KeyRound,
  LayoutGrid,
  MessageSquareWarning,
  Route,
  User,
} from "lucide-react"; // sidebar nav icons
import { Link } from "react-router-dom"; // storefront link
import { useGetDeliveryDashboardQuery } from "../../../features/delivery/deliveryApi";

// sidebar nav items
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "assigned", label: "Assigned Orders", icon: Route },
  { key: "history", label: "Delivery History", icon: History },
  { key: "requests", label: "Delivery Requests", icon: Bell },
  { key: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { key: "profile", label: "My Profile", icon: User },
  { key: "password", label: "Reset Password", icon: KeyRound },
];

// builds initials from a full name, e.g. "John Doe" -> "JD"
const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const DeliverySidebar = ({ activeTab, onChange, isOpen = true }) => { // isOpen: false hides the whole sidebar
  const { data } = useGetDeliveryDashboardQuery(); // rider profile + stats
  const rider = data?.rider; // rider profile info
  const performance = data?.performance; // delivery performance stats
  const earnings = data?.earnings; // earnings summary

  if (!isOpen) return null; // hidden by the panel toggle

  return (
    <aside className="flex h-full w-full flex-col bg-green-900 text-green-100 lg:fixed lg:left-0 lg:top-0 lg:z-10 lg:h-screen lg:w-64">
      {/* rider profile header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {rider?.avatar ? (
          // rider photo
          <img
            src={rider.avatar}
            alt="Profile"
            className="h-10 w-10 shrink-0 rounded-xl object-cover"
          />
        ) : (
          // fallback initials avatar
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-green-700 text-sm font-bold text-white">
            {rider ? initials(rider.name) : "..."}
          </div>
        )}
        <div className="min-w-0">
          {/* rider name */}
          <p className="truncate text-sm font-bold text-white">
            {rider?.name ?? "Loading..."}
          </p>
          {/* online status dot + label */}
          <span className="flex items-center gap-1.5 text-xs text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
            {rider?.status ?? ""}
          </span>
        </div>
      </div>

      {/* nav items list */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* nav item, green when active */}
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key; // is this the current tab
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-green-700 font-semibold text-white shadow-sm"
                  : "font-medium text-white hover:bg-orange-500/10 hover:text-orange-400"
              }`}
            >
              {/* nav icon */}
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* back to the storefront — this panel replaces the site header */}
      <div className="px-3 pb-2">
        <Link
          to="/"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-500/10 hover:text-orange-400"
        >
          <Home size={17} strokeWidth={2} />
          Home
        </Link>
      </div>

      {/* performance summary footer */}
      <div className="mx-3 mb-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
        {/* deliveries completed */}
        <div>
          <p className="text-base font-bold text-white">
            {performance?.totalDeliveries ?? "—"}
          </p>
          <p className="text-[10px] font-medium text-green-100">
            Delivered
          </p>
        </div>
        {/* divider */}
        <div className="h-8 w-px bg-white/10" />
        {/* weekly earnings */}
        <div className="text-right">
          <p className="text-base font-bold text-white">
            {earnings?.weekTotal ?? "—"} TK
          </p>
          <p className="text-[10px] font-medium text-green-100">
            This Week
          </p>
        </div>
      </div>
    </aside>
  );
};

export default DeliverySidebar;
