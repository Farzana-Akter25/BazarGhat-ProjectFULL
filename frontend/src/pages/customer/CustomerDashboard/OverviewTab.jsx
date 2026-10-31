import { CheckCircle2, Clock, Gift, TrendingUp, Truck } from "lucide-react"; // icons for activity rows + summary cards
import RefundBalanceCard from "../../../components/customer/RefundBalanceCard"; // refund balance + history
import { toCustomerStatus } from "../../../utils/orderStatus";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../../utils/formatDate";
import { shortId } from "../../../utils/shortId";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell

// recent activity table columns
const RECENT_COLUMNS = [
  { label: "Order ID" },
  { label: "Items" },
  { label: "Date" },
  { label: "Status" },
  { label: "Total", align: "right" },
];

// order status -> icon + badge color for the activity row
const ACTIVITY_ICON = {
  Delivered: { icon: CheckCircle2, bg: "bg-green-50 text-green-700" },
  "Out for Delivery": { icon: Truck, bg: "bg-blue-50 text-blue-600" },
  "Picked Up": { icon: Truck, bg: "bg-indigo-50 text-indigo-600" },
  Assigned: { icon: Clock, bg: "bg-blue-50 text-blue-600" },
  Processing: { icon: Clock, bg: "bg-amber-50 text-amber-600" },
  Confirmed: { icon: Clock, bg: "bg-blue-50 text-blue-600" },
  Pending: { icon: Clock, bg: "bg-amber-50 text-amber-600" },
  Cancelled: { icon: Clock, bg: "bg-red-50 text-red-600" },
  "Customer Rejected at Doorstep": {
    icon: Clock,
    bg: "bg-red-50 text-red-600",
  },
};

// total item quantity across an order's line items
const itemCount = (order) => order.items.reduce((sum, i) => sum + i.qty, 0);

// Overview tab: this month's numbers and recent orders
const OverviewTab = ({ orders = [], onViewAllOrders }) => {
  const recent = orders.slice(0, 3); // most recent 3 orders for activity list

  // Today's date, for the "this month" numbers
  const now = new Date();
  // orders placed this calendar month, excluding cancelled
  const thisMonthOrders = orders.filter((o) => {
    // Order date
    const d = new Date(o.date);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      o.status !== "Cancelled"
    );
  });
  const thisMonthTotal = thisMonthOrders.reduce((sum, o) => sum + o.total, 0); // this month's spend
  const savedMoney = orders.reduce((sum, o) => sum + (o.discount || 0), 0); // lifetime discount total

  return (
    <div className="space-y-6">
      {/* month summary + savings + refund balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* this month spend card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* orange trending icon badge */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <TrendingUp size={18} strokeWidth={2.25} />
          </div>
          {/* card label */}
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            This Month
          </p>
          {/* spend total */}
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {thisMonthTotal}TK
          </p>
          {/* order count note — these are the orders this spend came from, whatever stage they
              have reached; "completed" would contradict the Delivered card next to it. */}
          <p className="text-xs font-medium text-slate-600">
            {thisMonthOrders.length} order{thisMonthOrders.length === 1 ? "" : "s"} placed
          </p>
        </div>
        {/* saved money card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* green gift icon badge */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <Gift size={18} strokeWidth={2.25} />
          </div>
          {/* card label */}
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Saved Money
          </p>
          {/* total saved */}
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {savedMoney}TK
          </p>
          {/* source note — an order's discount is what a coupon took off (cash or the waived delivery fee);
              a flash sale price is already inside the subtotal, so it never reaches this figure. */}
          <p className="text-xs font-medium text-slate-600">
            From coupons
          </p>
        </div>
        {/* refund balance from cancelled orders */}
        <RefundBalanceCard />
      </div>

      {/* recent activity card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {/* card title + view all link */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            Recent Activity
          </h3>
          {/* view all orders link */}
          <button
            onClick={onViewAllOrders}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
          >
            View All →
          </button>
        </div>

        {/* recent orders table */}
        <DataTable
          columns={RECENT_COLUMNS}
          isEmpty={recent.length === 0}
          emptyText="No orders yet."
        >
          {recent.map((order) => {
            const { icon: Icon, bg } =
              ACTIVITY_ICON[order.status] || ACTIVITY_ICON.Processing; // icon + color for this order's status
            return (
              // activity row
              <tr key={order.orderId} className="hover:bg-slate-50">
                {/* order id cell, with the status icon badge */}
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}
                    >
                      <Icon size={15} strokeWidth={2.25} />
                    </span>
                    <span
                      className="font-semibold whitespace-nowrap text-slate-800"
                      title={order.id}
                    >
                      {shortId(order.id)}
                    </span>
                  </div>
                </td>
                {/* item count cell */}
                <td className={`${TD} text-slate-700`}>
                  {itemCount(order)} items
                </td>
                {/* order date cell */}
                <td className={`${TD} text-slate-700`}>
                  {formatDate(order.date)}
                </td>
                {/* status badge cell */}
                <td className={TD}>
                  <StatusBadge status={toCustomerStatus(order.status)} />
                </td>
                {/* order total cell */}
                <td className={`${TD} text-right font-bold text-slate-800`}>
                  {order.total}TK
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
};

export default OverviewTab;
