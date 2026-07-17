import { CheckCircle2, Package, Truck, Wallet } from "lucide-react";

const DashboardStats = ({ stats }) => {
  const cards = [
    {
      icon: Package,
      tint: "bg-orange-50 text-orange-600",
      accent: "bg-orange-500",
      badge: "+12%",
      badgeColor: "bg-orange-50 text-orange-600",
      value: stats.totalOrders,
      label: "Total Orders",
    },
    {
      icon: Truck,
      tint: "bg-blue-50 text-blue-600",
      accent: "bg-blue-500",
      badge: "Active",
      badgeColor: "bg-blue-50 text-blue-600",
      value: stats.inTransit,
      label: "In Transit",
    },
    {
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-600",
      accent: "bg-emerald-500",
      badge: "Done",
      badgeColor: "bg-emerald-50 text-emerald-600",
      value: stats.delivered,
      label: "Delivered",
    },
    {
      icon: Wallet,
      tint: "bg-violet-50 text-violet-600",
      accent: "bg-violet-500",
      badge: "Total",
      badgeColor: "bg-violet-50 text-violet-600",
      value: `${stats.totalSpent}TK`,
      label: "Total Spent",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}
            >
              <c.icon size={20} strokeWidth={2.25} />
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${c.badgeColor}`}
            >
              {c.badge}
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{c.value}</p>
          <p className="text-sm font-medium text-slate-400">{c.label}</p>
          <div className="mt-3 h-1 w-full rounded-full bg-slate-100">
            <div className={`h-1 w-3/5 rounded-full ${c.accent}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
