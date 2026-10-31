import { CheckCircle2, TrendingUp, XCircle } from "lucide-react";
import { useGetDeliveryHistoryQuery } from "../../../features/delivery/deliveryApi";
import { toDeliveryStatus } from "../../../utils/orderStatus";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../../utils/formatDate";
import { TH } from "../../../components/shared/DataTable"; // shared table header cell style

// history summary stat cards
const STAT_CARDS = [
  {
    key: "totalDeliveries",
    label: "Total Deliveries",
    icon: CheckCircle2,
    tint: "bg-green-50 text-green-700",
  },
  {
    key: "failed",
    label: "Rejected",
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

// Finished deliveries list with totals
const DeliveryHistoryTab = () => {
  // Load the history
  const { data, isLoading, isError } = useGetDeliveryHistoryQuery();

  if (isLoading) {
    // loading state
    return <p className="text-sm text-slate-600">Loading delivery history...</p>;
  }

  if (isError || !data) {
    // error state
    return <p className="text-sm text-red-500">Failed to load delivery history.</p>;
  }

  // History rows and totals
  const { history, stats } = data;

  return (
    // page wrapper
    <div className="space-y-5">
      {/* page header */}
      <div>
        {/* page title */}
        <h1 className="text-lg font-bold text-slate-800">Delivery History</h1>
        {/* page subtitle */}
        <p className="text-sm text-slate-600">
          Your past deliveries and performance
        </p>
      </div>

      {/* stat summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((c) => (
          // single stat card
          <div
            key={c.key}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {/* tinted icon badge */}
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.tint}`}>
              <c.icon size={16} strokeWidth={2.25} />
            </div>
            <div>
              {/* stat value */}
              <p className="text-lg font-bold text-slate-900">
                {stats[c.key]}
                {c.suffix ? c.suffix : ""}
              </p>
              {/* stat label */}
              <p className="text-xs font-medium text-slate-600">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* history table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-auto text-left text-sm">
          {/* table column headers */}
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wide text-black uppercase">
              <th className={TH}>Order</th>
              <th className={TH}>Customer</th>
              <th className={TH}>Area</th>
              <th className={TH}>Date</th>
              <th className={TH}>Amount</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* history row */}
            {history.map((row) => (
              <tr key={row.assignmentId} className="hover:bg-slate-50">
                {/* order id */}
                <td className="px-3 py-3.5 break-words font-semibold text-slate-800">
                  {row.id}
                </td>
                {/* customer name */}
                <td className="px-3 py-3.5 break-words text-green-700 font-medium">
                  {row.customer}
                </td>
                {/* delivery area */}
                <td className="px-3 py-3.5 break-words text-slate-700">{row.area}</td>
                {/* delivery date */}
                <td className="px-3 py-3.5 break-words text-slate-600">{formatDate(row.date)}</td>
                {/* order amount */}
                <td className="px-3 py-3.5 break-words font-semibold text-slate-800">
                  {row.amount}TK
                </td>
                {/* status pill */}
                <td className="px-3 py-3.5 break-words">
                  <StatusBadge status={toDeliveryStatus(row.status)} />
                </td>
                {/* earned amount, dash if none */}
                <td className="px-3 py-3.5 break-words text-right font-semibold">
                  {row.earned > 0 ? (
                    <span className="text-green-700">+{row.earned}TK</span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              // empty state row
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-600">
                  No delivery history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryHistoryTab;
