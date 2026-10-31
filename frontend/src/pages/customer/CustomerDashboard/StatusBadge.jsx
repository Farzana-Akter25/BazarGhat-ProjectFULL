// status label color map
const STATUS_STYLES = {
  Completed: "bg-green-50 text-green-700", // finished, green
  Delivered: "bg-green-50 text-green-700", // finished, green
  Resolved: "bg-green-50 text-green-700", // finished, green
  Approved: "bg-green-50 text-green-700", // finished, green
  Refunded: "bg-green-50 text-green-700", // refund completed, green
  "Picked Up": "bg-blue-50 text-blue-600", // in progress, blue
  "Out for Delivery": "bg-blue-50 text-blue-600", // in progress, blue
  "In Review": "bg-blue-50 text-blue-600", // in progress, blue
  "Under Review": "bg-blue-50 text-blue-600", // in progress, blue
  "Waiting for Response": "bg-amber-50 text-amber-600", // needs action, amber
  Closed: "bg-slate-100 text-slate-700", // neutral, grey
  Initiated: "bg-orange-50 text-orange-600", // starting state, orange
  Pending: "bg-orange-50 text-orange-600", // starting state, orange
  "Pending Review": "bg-orange-50 text-orange-600", // starting state, orange
  "Pending Approval": "bg-amber-50 text-amber-600", // waiting on an admin decision, amber
  Failed: "bg-red-50 text-red-600", // refund could not be completed, red
  Assigned: "bg-orange-50 text-orange-600", // starting state, orange
  Processing: "bg-orange-50 text-orange-600", // starting state, orange
  Confirmed: "bg-indigo-50 text-indigo-600", // confirmed state, indigo
  // asked for, waiting on an admin decision
  "Return Submitted": "bg-amber-50 text-amber-600", // awaiting a decision, amber
  "Refund Submitted": "bg-amber-50 text-amber-600", // awaiting a decision, amber
  // the return branch, once a return on a delivered order is approved
  "Return Approved": "bg-purple-50 text-purple-600", // return agreed, purple
  "Return Pickup Assigned": "bg-purple-50 text-purple-600", // rider on the way, purple
  Returned: "bg-slate-100 text-slate-700", // goods are back, neutral
  Paid: "bg-green-50 text-green-700", // payment completed, green
  Unpaid: "bg-orange-50 text-orange-600", // payment pending, orange
  "Refund Pending": "bg-amber-50 text-amber-600", // refund in progress, amber
  Cancelled: "bg-red-50 text-red-600", // failed/negative, red
  Rejected: "bg-red-50 text-red-600", // failed/negative, red
  "Customer Rejected at Doorstep": "bg-red-50 text-red-600", // failed/negative, red
};

// Coloured status pill
const StatusBadge = ({ status }) => (
  // pill badge, falls back to grey if status unknown
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
