import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const StatCard = ({ icon: Icon, iconBg, label, value, trend, trendUp }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
      {Icon && (
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          <Icon size={18} className="text-white" />
        </div>
      )}
    </div>
    {trend && (
      <p
        className={`mt-3 flex items-center gap-1 text-xs font-semibold ${
          trendUp ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </p>
    )}
  </div>
);

export const BorderStatCard = ({ icon: Icon, tone, label, value }) => {
  const tones = {
    red: "border-red-200 bg-red-50/40 text-red-500",
    orange: "border-orange-200 bg-orange-50/40 text-orange-500",
    emerald: "border-emerald-200 bg-emerald-50/40 text-emerald-500",
    blue: "border-blue-200 bg-blue-50/40 text-blue-500",
  };
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          <p className="text-xs font-medium text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

const STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-600",
  Delivered: "bg-emerald-50 text-emerald-600",
  Active: "bg-emerald-50 text-emerald-600",
  "In Stock": "bg-emerald-50 text-emerald-600",
  Resolved: "bg-emerald-50 text-emerald-600",
  Approved: "bg-emerald-50 text-emerald-600",
  "On The Way": "bg-blue-50 text-blue-600",
  "In Transit": "bg-blue-50 text-blue-600",
  "In Review": "bg-blue-50 text-blue-600",
  Pending: "bg-orange-50 text-orange-600",
  Processing: "bg-orange-50 text-orange-600",
  Confirmed: "bg-indigo-50 text-indigo-600",
  "Low Stock": "bg-orange-50 text-orange-600",
  Cancelled: "bg-red-50 text-red-600",
  Blocked: "bg-red-50 text-red-600",
  Rejected: "bg-red-50 text-red-600",
  "Out of Stock": "bg-red-50 text-red-600",
};

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export const Card = ({ title, action, children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between">
        {title && <h3 className="text-base font-bold text-slate-800">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);
