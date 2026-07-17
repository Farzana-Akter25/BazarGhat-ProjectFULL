import {
  Bell,
  History,
  Lock,
  LayoutGrid,
  Route,
  User,
} from "lucide-react";
import { HISTORY_STATS, rider } from "./data";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "assigned", label: "Assigned Orders", icon: Route },
  { key: "history", label: "Delivery History", icon: History },
  { key: "requests", label: "Delivery Requests", icon: Bell },
  { key: "profile", label: "My Profile", icon: User },
  { key: "password", label: "Reset Password", icon: Lock },
];

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const DeliverySidebar = ({ activeTab, onChange }) => {
  return (
    <aside className="flex h-full w-full flex-col bg-emerald-950 text-emerald-100 lg:w-64">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-emerald-500 text-sm font-bold text-white">
          {initials(rider.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{rider.name}</p>
          <span className="flex items-center gap-1.5 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {rider.status}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-emerald-600 font-semibold text-white shadow-sm"
                  : "font-medium text-emerald-200/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
        <div>
          <p className="text-base font-bold text-white">
            {HISTORY_STATS.totalDeliveries}
          </p>
          <p className="text-[10px] font-medium text-emerald-300/80">
            Delivered
          </p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-right">
          <p className="text-base font-bold text-white">
            {HISTORY_STATS.totalEarned} TK
          </p>
          <p className="text-[10px] font-medium text-emerald-300/80">
            Earned
          </p>
        </div>
      </div>
    </aside>
  );
};

export default DeliverySidebar;
