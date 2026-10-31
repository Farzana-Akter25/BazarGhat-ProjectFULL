import { CheckCircle2, Package, Truck, Wallet } from "lucide-react"; // icons for each stat card

// Row of stat cards on the customer dashboard
const DashboardStats = ({ stats }) => {
  // stat card definitions, values come from props
  const cards = [
    {
      icon: Package,
      iconBg: "bg-orange-500",
      value: stats.totalOrders,
      label: "Total Orders",
    },
    {
      icon: Truck,
      iconBg: "bg-blue-500",
      value: stats.inTransit,
      label: "In Transit",
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-green-700",
      value: stats.delivered,
      label: "Delivered",
    },
    {
      icon: Wallet,
      iconBg: "bg-violet-500",
      value: `${stats.totalSpent}TK`,
      // Cash on delivery is only handed over at the door, so this is what the customer's live
      // orders come to rather than what has already been paid.
      label: "Order Value",
    },
  ];

  return (
    // stat cards row
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        // stat card
        <div
          key={c.label}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              {/* stat label */}
              <p className="text-xs font-medium text-slate-600">{c.label}</p>
              {/* stat value */}
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{c.value}</p>
            </div>
            {/* colored icon badge */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${c.iconBg}`}
            >
              <c.icon size={18} className="text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
