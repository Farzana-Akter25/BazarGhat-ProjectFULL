import { User, X } from "lucide-react";
import { StatusBadge } from "./AdminUI";
import { toAdminStatus } from "../../utils/orderStatus";
import { formatDate } from "../../utils/formatDate";
import { TH } from "../shared/DataTable"; // shared table header cell style

// Popup that lists one customer's orders and return/refund requests
const CustomerOrderHistoryModal = ({ customer, orders, returns = [], onClose }) => (
  // modal overlay
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    {/* modal card */}
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      {/* modal header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          {/* customer avatar icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <User size={18} />
          </div>
          <div>
            {/* customer name */}
            <h2 className="text-lg font-black text-slate-900">{customer.name}</h2>
            {/* phone + order count */}
            <p className="text-xs text-slate-900">
              {customer.phone} &middot; {orders.length} order{orders.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {/* close button */}
        <button onClick={onClose} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-5">
        {/* orders table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            {/* table column headers */}
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Order ID</th>
                <th className={TH}>Date</th>
                <th className={TH}>Items</th>
                <th className={TH}>Status</th>
                <th className={TH}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* order rows */}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  {/* order id, blue link style */}
                  <td className="px-3 py-3 break-words font-semibold text-blue-500">{o.id}</td>
                  {/* order date */}
                  <td className="px-3 py-3 break-words text-slate-700">{formatDate(o.date)}</td>
                  {/* item count */}
                  <td className="px-3 py-3 break-words text-slate-700">{o.items} items</td>
                  {/* status badge + cancel reason */}
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={toAdminStatus(o.status)} />
                    {/* who cancelled, only shown if cancelled */}
                    {toAdminStatus(o.status) === "Cancelled" && o.cancelledBy && (
                      <p className="mt-1 text-[11px] text-slate-600">
                        By {o.cancelledBy === "admin" ? "Admin" : "Customer"}
                      </p>
                    )}
                  </td>
                  {/* amount + payment method */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-bold text-slate-800">{o.amount}</p>
                    {o.paymentMethod && <p className="text-xs text-slate-600">{o.paymentMethod}</p>}
                  </td>
                </tr>
              ))}
              {/* empty state */}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-600">
                    No orders found for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* returns & refunds table, only if any exist */}
        {returns.length > 0 && (
          <div className="mt-6">
            {/* section heading */}
            <h3 className="mb-3 text-sm font-bold text-slate-800">Return &amp; Refund Requests</h3>
            <div className="rounded-xl border border-slate-200">
              <table className="w-full table-auto text-left text-sm">
                {/* table column headers */}
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                    <th className={TH}>Request ID</th>
                    <th className={TH}>Order ID</th>
                    <th className={TH}>Date</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Product</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* return rows */}
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      {/* return request id */}
                      <td className="px-3 py-3 break-words font-semibold text-slate-700">{r.id}</td>
                      {/* linked order id */}
                      <td className="px-3 py-3 break-words font-semibold text-blue-500">{r.orderId}</td>
                      {/* request date + time */}
                      <td className="px-3 py-3 break-words text-slate-700">
                        <p>{formatDate(r.date)}</p>
                        {r.time && <p className="text-xs text-slate-600">{r.time}</p>}
                      </td>
                      {/* return vs refund type pill */}
                      <td className="px-3 py-3 break-words">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.type === "Return" ? "bg-blue-50 text-blue-900" : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {r.type}
                        </span>
                      </td>
                      {/* product name + variant */}
                      <td className="px-3 py-3 break-words text-slate-600">
                        <p className="font-medium text-slate-700">{r.product}</p>
                        {r.variant && <p className="text-xs text-slate-600">{r.variant}</p>}
                      </td>
                      {/* status badge */}
                      <td className="px-3 py-3 break-words">
                        <StatusBadge status={r.status} />
                      </td>
                      {/* refund amount */}
                      <td className="px-3 py-3 break-words font-bold text-slate-800">{r.amount}TK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default CustomerOrderHistoryModal;
