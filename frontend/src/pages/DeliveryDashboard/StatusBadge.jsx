const STATUS_STYLES = {
  Assigned: "bg-blue-50 text-blue-700",
  "On The Way": "bg-purple-50 text-purple-700",
  "Picked Up": "bg-amber-50 text-amber-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Failed: "bg-red-50 text-red-700",
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
