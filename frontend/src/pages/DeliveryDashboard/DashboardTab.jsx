import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Package,
  Star,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";
import { EARNINGS, PERFORMANCE, rider, TODAY_ORDERS, TODAY_SUMMARY } from "./data";
import StatusBadge from "./StatusBadge";

const SUMMARY_CARDS = [
  { key: "assigned", label: "Assigned", icon: Package, tint: "bg-blue-50 text-blue-600" },
  { key: "onTheWay", label: "On The Way", icon: Truck, tint: "bg-purple-50 text-purple-600" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  { key: "failed", label: "Failed", icon: XCircle, tint: "bg-red-50 text-red-600" },
];

const PERFORMANCE_METRICS = [
  { label: "On-time delivery", value: PERFORMANCE.onTimeDelivery },
  { label: "Customer feedback", value: PERFORMANCE.customerFeedback },
  { label: "Package safety", value: PERFORMANCE.packageSafety },
];

const firstName = rider.name.split(" ")[0];
const earningsProgress = Math.round(
  (EARNINGS.successfulDeliveries / EARNINGS.weeklyTarget) * 100,
);

const DashboardTab = ({ onViewAllOrders }) => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">
          Good Morning, {firstName}! 👋
        </h1>
        <p className="text-sm text-slate-400">
          Here is your delivery summary for today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_CARDS.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">{c.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${c.tint}`}>
                <c.icon size={15} strokeWidth={2.25} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {TODAY_SUMMARY[c.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <AlertCircle size={17} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Report Product Issue
            </p>
            <p className="text-xs text-slate-500">
              Found a problem during delivery? Report it immediately so admin
              can review.
            </p>
          </div>
        </div>
        <button className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
          <Camera size={15} /> Report Issue Now
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Today&apos;s Orders
            </h3>
            <button
              onClick={onViewAllOrders}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {TODAY_ORDERS.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {order.customer}
                  </p>
                  <p className="text-xs text-slate-400">
                    {order.area} · {order.amount} BDT
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-700 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-emerald-200 uppercase">
              This Week&apos;s Earnings
            </p>
            <p className="mt-1 text-2xl font-bold">
              {EARNINGS.weekTotal} <span className="text-sm font-medium">BDT</span>
            </p>
            <p className="text-xs text-emerald-200">
              From {EARNINGS.successfulDeliveries} successful deliveries
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: `${earningsProgress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-emerald-200/80">
              Weekly target: {EARNINGS.weeklyTarget} deliveries
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Performance</h3>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < Math.round(PERFORMANCE.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }
                />
              ))}
              <span className="ml-1 text-sm font-bold text-slate-800">
                {PERFORMANCE.rating}
              </span>
            </div>
            <p className="mb-3 text-[11px] text-slate-400">
              Based on customer ratings
            </p>
            <div className="space-y-2.5">
              {PERFORMANCE_METRICS.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500"
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
