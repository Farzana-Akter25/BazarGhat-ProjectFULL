import {
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPinned,
  MessageSquareWarning,
  Package,
  RefreshCcw,
  TicketPercent,
  Truck,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logoutSuccess, useLogoutMutation } from "../../features/auth/authSlice";
import { apiSlice } from "../../features/api/apiSlice";

// Sidebar menu: groups of links, some with nested child links
const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", to: "/admindashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Order Management", to: "/admin/orders", icon: ClipboardList },
      // Products, coupons and flash sales all describe what's on sale, so they sit together under one expandable Product Management entry.
      {
        label: "Product Management",
        icon: Package,
        children: [
          { label: "Products", to: "/admin/products", icon: Package },
          { label: "Coupons", to: "/admin/coupons", icon: TicketPercent },
          { label: "Flash Sales", to: "/admin/flash-sales", icon: Zap },
        ],
      },
      { label: "Inventory", to: "/admin/inventory", icon: Boxes },
      // Everything about the people who carry orders — the riders themselves, their assignments and their join requests — lives under one entry.
      {
        label: "Courier Management",
        icon: Truck,
        children: [
          { label: "Delivery Person", to: "/admin/delivery", icon: UserRound },
          { label: "Delivery Assignment", to: "/admin/delivery-assignment", icon: MapPinned },
          { label: "Delivery Man Request", to: "/admin/delivery-requests", icon: Bell },
        ],
      },
    ],
  },
  {
    label: "Customers & Finance",
    items: [
      { label: "Customer Management", to: "/admin/customers", icon: Users },
      { label: "Invoice Management", to: "/admin/invoices", icon: FileText },
      { label: "Return & Refund Management", to: "/admin/returns-refunds", icon: RefreshCcw },
    ],
  },
  {
    label: "Support",
    items: [
      // The two complaint sides are handled separately, so each one gets its own page under a single Complaint Management entry.
      {
        label: "Complaint Management",
        icon: MessageSquareWarning,
        children: [
          { label: "Customer Complaints", to: "/admin/complaints/customer", icon: Users },
          { label: "Delivery Man Complaints", to: "/admin/complaints/delivery-man", icon: UserRound },
        ],
      },
      { label: "Reset Password", to: "/admin/reset-password", icon: Lock },
    ],
  },
];

// shared link styling so nested items look the same as top-level ones
const linkClasses = (isActive, indented) =>
  `flex items-center gap-3 rounded-xl py-1.5 text-sm transition-colors ${
    indented ? "pl-9 pr-3" : "px-3"
  } ${
    isActive
      ? "bg-green-700 font-semibold text-white shadow-sm"
      : "font-medium text-white hover:bg-orange-500/10 hover:text-orange-400"
  }`;

// expandable parent entry (e.g. Product Management) plus its nested links
const NavGroupItem = ({ item }) => {
  // Current page path; a group is highlighted when one of its children is open
  const { pathname } = useLocation();
  const hasActiveChild = item.children.some((child) => pathname.startsWith(child.to));
  // Whether the user expanded this group
  const [isExpanded, setIsExpanded] = useState(hasActiveChild);
  const isOpen = isExpanded || hasActiveChild; // stays open while one of its pages is active
  const Icon = item.icon;
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <div>
      {/* parent row toggles the nested links */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isOpen)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition-colors ${
          hasActiveChild
            ? "font-semibold text-white"
            : "font-medium text-white hover:bg-orange-500/10 hover:text-orange-400"
        }`}
      >
        <Icon size={16} />
        <span className="flex-1 text-left">{item.label}</span>
        <Chevron size={14} />
      </button>
      {/* nested links, only rendered while the group is open */}
      {isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => linkClasses(isActive, true)}
              >
                <ChildIcon size={16} />
                {child.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Admin panel sidebar with menu links and a sign-out button
const AdminSidebar = ({ isOpen = true }) => { // isOpen: false hides the whole sidebar
  // Router, Redux and the logout API call
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();

  // the admin session and redirect to login — same flow the site header uses, so signing out here actually ends the session instead of only changing the route
  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // ignore — clear local session regardless
    }
    dispatch(logoutSuccess());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login");
  };

  if (!isOpen) return null; // hidden by the panel toggle

  return (
    // 81.full admin panel sidebar 82.admin panel border 93.sidebar group 90.full nav 105 Rounded buttom 121.buttom sidebar
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-64 flex-col bg-green-900 lg:flex">
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-3">
        <div>
          <h1 className="text-base font-black leading-tight text-white">
            Admin Panel
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-white">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                // entries with children render as an expandable group instead of a link
                if (item.children) {
                  return <NavGroupItem key={item.label} item={item} />;
                }
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => linkClasses(isActive, false)}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
