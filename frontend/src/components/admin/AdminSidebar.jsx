import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquareWarning,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", to: "/admindashboard", icon: LayoutDashboard },
      { label: "Sales Analytics", to: "/admin/sales-analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Order Management", to: "/admin/orders", icon: ClipboardList },
      { label: "Product Management", to: "/admin/products", icon: Package },
      { label: "Inventory", to: "/admin/inventory", icon: Boxes },
      { label: "Delivery Management", to: "/admin/delivery", icon: Truck },
      { label: "Delivery Assignment", to: "/admin/delivery-assignment", icon: MapPinned },
    ],
  },
  {
    label: "Customers & Finance",
    items: [
      { label: "Customer Management", to: "/admin/customers", icon: Users },
      { label: "Invoice Management", to: "/admin/invoices", icon: FileText },
      { label: "Return & Refund Management", to: "/admin/returns-refunds", icon: RotateCcw },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Complaint Management", to: "/admin/complaints", icon: MessageSquareWarning },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#0f2b22] lg:flex">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff7a00] text-white shadow-sm">
          <ShoppingCart size={18} />
        </div>
        <div>
          <h1 className="text-base font-black leading-tight text-white">
            Admin Panel
          </h1>
          <p className="text-[11px] text-emerald-200/50">
            BazarGhat Management
          </p>
        </div>
      </div>

      <nav className="scrollbar-overlay flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-emerald-200/40">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? "border-[#ff7a00] bg-white/10 text-white shadow-inner"
                          : "border-transparent text-emerald-100/60 hover:bg-white/5 hover:text-white"
                      }`
                    }
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

      <div className="border-t border-white/10 p-4">
        <button
          onClick={() => navigate("/login")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-100/60 transition hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
