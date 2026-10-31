// order status colors — covers the full flow plus the two side states
const STYLES = {
  Pending: "bg-orange-50 text-orange-600", // starting state
  Processing: "bg-orange-50 text-orange-600", // starting state
  Assigned: "bg-orange-50 text-orange-600", // starting state
  Confirmed: "bg-indigo-50 text-indigo-600", // confirmed tone
  "Picked Up": "bg-blue-50 text-blue-600", // in-progress tone
  "Out for Delivery": "bg-blue-50 text-blue-600", // in-progress tone
  Delivered: "bg-green-50 text-green-700", // success tone
  Cancelled: "bg-red-50 text-red-600", // negative tone
  "Customer Rejected at Doorstep": "bg-red-50 text-red-600", // negative tone
  
  "Return Approved": "bg-purple-50 text-purple-600", // return tone
  "Return Pickup Assigned": "bg-purple-50 text-purple-600", // return tone
  Returned: "bg-slate-100 text-slate-700", // neutral, the branch has ended
};

// order status pill
const OrderStatusBadge = ({ status }) => (
  // colored status pill, falls back to slate if unmapped
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export default OrderStatusBadge; // badge used in the invoice modal
