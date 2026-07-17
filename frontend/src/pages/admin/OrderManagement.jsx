import { CheckCircle2, ClipboardList, Download, Eye, Printer, SlidersHorizontal, Truck, Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const INITIAL_ORDERS = [
  { id: "ORD-2026-001", customer: "Rakib Hasan", phone: "01712345678", date: "2026-04-12", items: 3, amount: "1050TK", status: "Delivered" },
  { id: "ORD-2026-002", customer: "Mohedi Islam", phone: "01823456789", date: "2026-04-11", items: 2, amount: "750TK", status: "In Transit" },
  { id: "ORD-2026-003", customer: "Tasnia Ahmed", phone: "01934567890", date: "2026-04-10", items: 5, amount: "1200TK", status: "Processing" },
  { id: "ORD-2026-004", customer: "Fahim Rahman", phone: "01645678901", date: "2026-04-09", items: 2, amount: "850TK", status: "Delivered" },
  { id: "ORD-2026-005", customer: "Sadia Khatun", phone: "01756789012", date: "2026-04-08", items: 4, amount: "650TK", status: "Delivered" },
  { id: "ORD-2026-006", customer: "Karim Uddin", phone: "01867890123", date: "2026-04-08", items: 1, amount: "400TK", status: "Cancelled" },
  { id: "ORD-2026-007", customer: "Nusrat Jahan", phone: "01978901234", date: "2026-04-07", items: 6, amount: "1500TK", status: "Delivered" },
  { id: "ORD-2026-008", customer: "Habib Khan", phone: "01389012345", date: "2026-04-07", items: 3, amount: "920TK", status: "Processing" },
];

const STATUS_FILTERS = ["All Status", "Delivered", "In Transit", "Processing", "Confirmed", "Cancelled"];

const OrderManagement = () => {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");

  const counts = useMemo(
    () => ({
      total: orders.length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      processing: orders.filter((o) => o.status === "Processing").length,
      inTransit: orders.filter((o) => o.status === "In Transit").length,
    }),
    [orders],
  );

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const matchesQuery =
          !query ||
          o.id.toLowerCase().includes(query.toLowerCase()) ||
          o.customer.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || o.status === status;
        return matchesQuery && matchesStatus;
      }),
    [orders, query, status],
  );

  const confirmOrder = (id) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "Confirmed" } : o)));
  };

  return (
    <AdminLayout title="Order Management" subtitle="View and manage all customer orders">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} iconBg="bg-slate-700" label="Total Orders" value={counts.total} />
        <StatCard icon={Truck} iconBg="bg-emerald-500" label="Delivered" value={counts.delivered} />
        <StatCard icon={ClipboardList} iconBg="bg-orange-500" label="Processing" value={counts.processing} />
        <StatCard icon={Truck} iconBg="bg-blue-500" label="In Transit" value={counts.inTransit} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by Order ID or Customer Name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <SlidersHorizontal size={15} />
            More Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Phone</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Items</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 font-semibold text-blue-500">{o.id}</td>
                  <td className="py-3 font-medium text-orange-500">{o.customer}</td>
                  <td className="py-3 text-slate-500">{o.phone}</td>
                  <td className="py-3 text-slate-500">{o.date}</td>
                  <td className="py-3 text-slate-500">{o.items} items</td>
                  <td className="py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-3 font-bold text-slate-800">{o.amount}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {o.status === "Processing" && (
                        <button
                          onClick={() => confirmOrder(o.id)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                          title="Confirm Order"
                        >
                          <CheckCircle2 size={14} />
                          Confirm
                        </button>
                      )}
                      <button className="rounded-lg bg-orange-50 p-1.5 text-orange-500 hover:bg-orange-100" title="View">
                        <Eye size={14} />
                      </button>
                      <button className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100" title="Print">
                        <Printer size={14} />
                      </button>
                      <button className="rounded-lg bg-emerald-50 p-1.5 text-emerald-500 hover:bg-emerald-100" title="Download">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No orders match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
};

export default OrderManagement;
