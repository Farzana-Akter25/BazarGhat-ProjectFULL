import { CheckCircle2, TrendingUp, XCircle } from "lucide-react";
import { DELIVERY_HISTORY, HISTORY_STATS } from "./data";
import StatusBadge from "./StatusBadge";

const STAT_CARDS = [
  {
    key: "totalDeliveries",
    label: "Total Deliveries",
    icon: CheckCircle2,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
    tint: "bg-red-50 text-red-600",
  },
  {
    key: "totalEarned",
    label: "Total Earned",
    icon: TrendingUp,
    tint: "bg-amber-50 text-amber-600",
    suffix: "TK",
  },
];

const DeliveryHistoryTab = () => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Delivery History</h1>
        <p className="text-sm text-slate-400">
          Your past deliveries and performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.tint}`}>
              <c.icon size={16} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {HISTORY_STATS[c.key]}
                {c.suffix ? c.suffix : ""}
              </p>
              <p className="text-xs font-medium text-slate-400">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] tracking-wide text-slate-400 uppercase">
              <th className="px-5 py-3 font-semibold">Order</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Area</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DELIVERY_HISTORY.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3.5 font-semibold text-slate-800">
                  {row.id}
                </td>
                <td className="px-5 py-3.5 text-emerald-700 font-medium">
                  {row.customer}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{row.area}</td>
                <td className="px-5 py-3.5 text-slate-400">{row.date}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-800">
                  {row.amount}TK
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3.5 text-right font-semibold">
                  {row.earned > 0 ? (
                    <span className="text-emerald-600">+{row.earned}TK</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryHistoryTab;
