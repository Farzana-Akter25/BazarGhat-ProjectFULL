const STATUS_STYLES = {
  Delivered: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  "In Transit": { badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  Processing: { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  "Pending Review": { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

const DEFAULT_STYLE = { badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };

const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
