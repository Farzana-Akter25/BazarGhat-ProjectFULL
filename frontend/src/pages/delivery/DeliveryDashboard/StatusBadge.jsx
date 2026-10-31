// status color map
const STATUS_STYLES = {
  Assigned: "bg-blue-50 text-blue-700", // rider assigned
  "Picked Up": "bg-amber-50 text-amber-700", // package picked up
  "Out for Delivery": "bg-purple-50 text-purple-700", // en route
  Delivered: "bg-green-50 text-green-700", // success state
  "Return Picked Up": "bg-purple-50 text-purple-700", // collection run finished
  "Customer Rejected at Doorstep": "bg-red-50 text-red-700", // rejected state
  Failed: "bg-red-50 text-red-700", // delivery failed
  Pending: "bg-amber-50 text-amber-700", // awaiting review
  "In Review": "bg-amber-50 text-amber-700", // being reviewed
  "Under Review": "bg-blue-50 text-blue-700", // being reviewed
  "Waiting for Response": "bg-amber-50 text-amber-700", // needs customer input
  Closed: "bg-slate-100 text-slate-600", // closed/inactive state
  Resolved: "bg-green-50 text-green-700", // resolved state
  Approved: "bg-green-50 text-green-700", // approved state
  Rejected: "bg-red-50 text-red-700", // rejected state
  Active: "bg-green-50 text-green-700", // active account
  Inactive: "bg-slate-100 text-slate-600", // inactive account
  Blocked: "bg-red-50 text-red-700", // blocked account
};

// status pill
const StatusBadge = ({ status }) => (
  // colored pill, falls back to slate if status unknown
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
