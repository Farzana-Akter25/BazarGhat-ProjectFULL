import { ArrowDownRight, ArrowUpRight } from "lucide-react"; // trend arrow icons

// stat card with icon + trend
export const StatCard = ({ icon: Icon, iconBg, label, value, trend, trendUp }) => (
  // stat card wrapper
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    {/* label/value + icon row */}
    <div className="flex items-center justify-between gap-3">
      <div>
        {/* stat label row writing */}
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {/* stat value design */}
        <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
      {Icon && (
        // start icon box design
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        > {/* level insert logu color */}
          <Icon size={18} className="text-black" />
        </div>
      )}
    </div>
    {/* trend indicator */}
    {trend && (
      <p
        className={`mt-3 flex items-center gap-1 text-xs font-semibold ${
          trendUp ? "text-green-700" : "text-red-500" // green for up, red for down
        }`}
      >
        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </p>
    )}
  </div>
);

// bordered stat card with tone color
export const BorderStatCard = ({ icon: Icon, tone, label, value }) => {
  // tone color classes lookup
  const tones = {
    red: "border-red-200 bg-red-50/40 text-red-500",
    orange: "border-orange-200 bg-orange-50/40 text-orange-500",
    emerald: "border-green-200 bg-green-50/40 text-green-700",
    blue: "border-blue-200 bg-blue-50/40 text-blue-500",
  };
  return (
    // toned card wrapper
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          // toned icon box
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={18} />
          </div>
        )}
        <div>
          {/* stat value */}
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          {/* stat label */}
          <p className="text-xs font-medium text-slate-00">{label}</p>
        </div>
      </div>
    </div>
  );
};

// status label color map
const STATUS_STYLES = {
  Completed: "bg-green-50 text-green-700",
  Delivered: "bg-green-50 text-green-700", 
  Active: "bg-green-50 text-green-700", 
  "In Stock": "bg-green-50 text-green-700", 
  Resolved: "bg-green-50 text-green-700", // success tone
  Refunded: "bg-green-50 text-green-700", // refund settled tone
  Approved: "bg-green-50 text-green-700", // success tone
  "Picked Up": "bg-blue-50 text-blue-600", // in-progress tone
  "Out for Delivery": "bg-blue-50 text-blue-600", // in-progress tone
  "In Review": "bg-blue-50 text-blue-600", // in-progress tone
  "Under Review": "bg-blue-50 text-blue-600", // in-progress tone
  "Waiting for Response": "bg-amber-50 text-amber-600", // waiting tone
  Closed: "bg-slate-100 text-slate-700", // neutral tone
  Initiated: "bg-orange-50 text-orange-600", // pending tone
  Pending: "bg-orange-50 text-orange-600", // pending tone
  Assigned: "bg-orange-50 text-orange-600", // pending tone
  Processing: "bg-orange-50 text-orange-600", // pending tone
  Confirmed: "bg-indigo-50 text-indigo-600", // confirmed tone
  Replacement: "bg-indigo-50 text-indigo-600", // confirmed tone
  // the return branch: goods agreed back, on their way back, back
  "Return Approved": "bg-purple-50 text-purple-600", // return tone
  "Return Pickup Assigned": "bg-purple-50 text-purple-600", // return tone
  "Return Picked Up": "bg-purple-50 text-purple-600", // return tone
  Returned: "bg-slate-100 text-slate-700", // neutral, the branch has ended
  Refund: "bg-purple-50 text-purple-600", // refund tone
  "Low Stock": "bg-orange-50 text-orange-600", // warning tone
  Cancelled: "bg-red-50 text-red-600", // negative tone
  Blocked: "bg-red-50 text-red-600", // negative tone
  Rejected: "bg-red-50 text-red-600", // negative tone
  Failed: "bg-red-50 text-red-600", // negative tone
  "Customer Rejected at Doorstep": "bg-red-50 text-red-600", // negative tone
  "Out of Stock": "bg-red-50 text-red-600", // negative tone
};

// pill badge for order/status labels.
export const StatusBadge = ({ status, label, wrap = false }) => (
  // colored status pill, falls back to slate if unmapped
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
      wrap ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"
    } ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}
  >
    {label ?? status}
  </span>
);

// grey placeholder block shown while data is still loading, so a panel reads as "loading" instead of as "nothing here".
export const Skeleton = ({ className = "" }) => (
  <span className={`block animate-pulse rounded-md bg-slate-100 ${className}`} />
);

// generic card wrapper
export const Card = ({ title, action, children, className = "" }) => (
  // card wrapper, extra classes appended
  <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
    {/* card header: title + action */}
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between">
        {title && <h3 className="text-base font-bold text-slate-800">{title}</h3>}
        {action}
      </div>
    )}
    {/* card body content */}
    {children}
  </div>
);
