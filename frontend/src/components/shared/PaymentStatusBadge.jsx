// payment status colors
const STYLES = {
  Paid: "bg-green-50 text-green-700", // success tone
  Pending: "bg-orange-50 text-orange-600", // waiting tone
  Unpaid: "bg-red-50 text-red-600", // negative tone
  Failed: "bg-red-50 text-red-600", // negative tone
  Cancelled: "bg-slate-100 text-slate-700", // neutral tone
  "Refund Pending": "bg-amber-50 text-amber-600", // refund in progress tone
  Refunded: "bg-green-50 text-green-700", // success tone
  // paid, but part of it has already gone back to the customer
  "Partially Refunded": "bg-purple-50 text-purple-600",
};

// payment status pill
const PaymentStatusBadge = ({ status }) => (
  // colored status pill, falls back to slate if unmapped
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

export default PaymentStatusBadge; // badge used in orders/invoice tables
