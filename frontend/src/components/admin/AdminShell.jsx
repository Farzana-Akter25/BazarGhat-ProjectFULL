import {
  Box,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/admindashboard", icon: LayoutDashboard },
  { label: "Orders", to: "/adminorders", icon: ClipboardList },
  { label: "Products", to: "/adminproducts", icon: Box },
  { label: "Delivery", to: "/admindelivery", icon: Truck },
  { label: "Customers", to: "/admincustomers", icon: Users },
  { label: "Invoice", to: "/admininvoice", icon: MapPin },
];

const topActions = [
  { label: "Track", symbol: "⌖" },
  { label: "Account", symbol: "◌" },
  { label: "Logout", symbol: "↩" },
  { label: "Wishlist", symbol: "♡" },
  { label: "Cart", symbol: "🛒", badge: 4 },
];

const AdminShell = ({
  title,
  subtitle,
  children,
  activePath = "/admindashboard",
}) => {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff7a00] text-white shadow-sm">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#ff7a00]">BazarGhat</h1>
                <p className="text-[11px] text-slate-400">Admin Panel</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.to;

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${active ? "bg-emerald-500 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} />
                      {item.label}
                    </span>
                    <ChevronRight
                      size={16}
                      className={active ? "opacity-100" : "opacity-40"}
                    />
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
                System Status
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-500">
                All services running
              </p>
            </div>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-500">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-4 px-4 py-3 lg:px-6">
              <Link
                to="/admindashboard"
                className="flex shrink-0 items-center gap-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff7a00] text-white shadow-sm lg:hidden">
                  <ShoppingCart size={18} />
                </div>
                <span className="text-2xl font-black text-[#ff7a00]">
                  BazarGhat
                </span>
              </Link>

              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search in..."
                  className="w-full rounded-full border border-slate-200 bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </div>

              <div className="hidden items-center gap-6 lg:flex">
                {topActions.map((item) => (
                  <button
                    key={item.label}
                    className="relative flex flex-col items-center text-[11px] text-slate-600"
                  >
                    <span className="text-slate-400">{item.symbol}</span>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff7a00] px-1 text-[9px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-6">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
                  {title}
                </h2>
                <p className="text-sm text-slate-400">{subtitle}</p>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
