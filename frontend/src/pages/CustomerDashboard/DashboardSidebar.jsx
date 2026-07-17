import {
  ChevronRight,
  FileText,
  LayoutGrid,
  Lock,
  Package,
  RotateCcw,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "orders", label: "My Orders", icon: Package, badge: 2 },
  { key: "returns", label: "Returns", icon: RotateCcw, badge: 2 },
  { key: "profile", label: "Profile", icon: User },
  { key: "password", label: "Reset Password", icon: Lock },
];

const QUICK_ACTIONS = [{ key: "policy", label: "Return Policy", icon: FileText }];

const DashboardSidebar = ({ activeTab, onChange }) => {
  return (
    <aside className="h-fit space-y-4">
      <nav className="space-y-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`group flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-orange-500 bg-orange-50 font-semibold text-orange-700"
                  : "border-transparent font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <item.icon
                size={17}
                strokeWidth={isActive ? 2.25 : 2}
                className={isActive ? "text-orange-600" : "text-slate-400 group-hover:text-slate-500"}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                <ChevronRight
                  size={14}
                  className={`transition-opacity ${
                    isActive ? "opacity-100 text-orange-400" : "opacity-0 group-hover:opacity-60"
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Quick Actions
        </p>
        <div className="space-y-0.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onChange(action.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                activeTab === action.key
                  ? "bg-orange-50 font-semibold text-orange-700"
                  : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <action.icon
                size={16}
                className={activeTab === action.key ? "text-orange-600" : "text-slate-400"}
              />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
