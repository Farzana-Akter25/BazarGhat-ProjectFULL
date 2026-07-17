import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  MapPin,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ASSIGNED_ORDERS } from "./data";
import ReportIssueTab from "./ReportIssueTab";
import StatusBadge from "./StatusBadge";

const FILTERS = ["All", "Assigned", "On The Way", "Picked Up", "Delivered", "Failed"];

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const AssignedOrdersTab = () => {
  const [orders, setOrders] = useState(ASSIGNED_ORDERS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [reportingOrderId, setReportingOrderId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesFilter = filter === "All" || o.status === filter;
      const matchesQuery =
        !q ||
        o.customer.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [orders, query, filter]);

  const updateStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const reportingOrder = orders.find((o) => o.id === reportingOrderId);

  if (reportingOrder) {
    return (
      <ReportIssueTab
        order={reportingOrder}
        onBack={() => setReportingOrderId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Assigned Orders</h1>
        <p className="text-sm text-slate-400">
          {orders.length} orders assigned by admin
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or order ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                  {initials(order.customer)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {order.customer}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {order.id} · {order.date}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} /> {order.address}
                  </p>
                  {order.note && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <AlertTriangle size={12} /> {order.note}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-bold text-slate-900">
                  {order.amount} BDT
                </p>
                <p className="text-xs text-slate-400">{order.items} items</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {order.status === "Assigned" && (
                  <>
                    <button
                      onClick={() => updateStatus(order.id, "On The Way")}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, "Failed")}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <X size={13} /> Reject
                    </button>
                  </>
                )}
                <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  <User size={13} /> Customer
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  <Eye size={13} /> Invoice
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  <Download size={13} /> Download
                </button>
                {(order.status === "On The Way" || order.status === "Delivered") && (
                  <button
                    onClick={() => setReportingOrderId(order.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                  >
                    <AlertTriangle size={13} /> Report Issue
                  </button>
                )}
              </div>
              <a
                href={`tel:${order.phone}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
              >
                <Phone size={13} /> {order.phone}
              </a>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
            No orders match your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedOrdersTab;
