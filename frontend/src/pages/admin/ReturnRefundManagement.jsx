import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileBarChart2,
  FileText,
  ListChecks,
  MessageSquareText,
  Package,
  Phone,
  Search as SearchIcon,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const REQUESTS = [
  {
    id: "RRN12485", orderId: "ORD12345", customer: "John Doe", customerCode: "CUST1002", phone: "+880 1712 000001",
    type: "Return", product: "Smart Watch X1", variant: "Black", qty: 1, price: 2499,
    reason: "Product not as described", note: "The watch face is a different color than shown online.",
    amount: 2499, payment: "Paid Online", shipping: 0, status: "Pending",
    date: "25 May 2024", time: "10:30 AM", orderDate: "23 May 2024, 09:10 AM",
  },
  {
    id: "RRN12484", orderId: "ORD12344", customer: "Sarah Smith", customerCode: "CUST1003", phone: "+880 1811 000002",
    type: "Refund", product: "Wireless Headphone", variant: "Red", qty: 1, price: 1799,
    reason: "Received wrong product", note: "Ordered red, received blue headphones instead.",
    amount: 1799, payment: "Paid COD", shipping: 0, status: "In Review",
    date: "25 May 2024", time: "09:45 AM", orderDate: "23 May 2024, 10:05 AM",
  },
  {
    id: "RRN12483", orderId: "ORD12340", customer: "Mike Johnson", customerCode: "CUST1004", phone: "+880 1911 000003",
    type: "Return", product: "Travel Backpack", variant: "Navy Blue", qty: 1, price: 1299,
    reason: "Quality issue", note: "Zipper broke on the first day of use.",
    amount: 1299, payment: "Paid Online", shipping: 0, status: "Approved",
    date: "24 May 2024", time: "08:20 PM", orderDate: "22 May 2024, 04:40 PM",
  },
  {
    id: "RRN12482", orderId: "ORD12339", customer: "Emily Davis", customerCode: "CUST1006", phone: "+880 1712 345678",
    type: "Refund", product: "Running Shoes", variant: "White", qty: 1, price: 2999,
    reason: "Changed my mind", note: "I ordered by mistake. Please refund my money.",
    amount: 2999, payment: "Online (Paid)", shipping: 0, status: "Pending",
    date: "24 May 2024", time: "06:15 PM", orderDate: "23 May 2024, 08:10 PM",
  },
  {
    id: "RRN12481", orderId: "ORD12337", customer: "Rasel Ahmed", customerCode: "CUST1007", phone: "+880 1611 000005",
    type: "Refund", product: "Bluetooth Speaker", variant: "Black", qty: 1, price: 1499,
    reason: "Not working properly", note: "Speaker disconnects randomly, tried resetting twice.",
    amount: 1499, payment: "Paid COD", shipping: 0, status: "Pending",
    date: "24 May 2024", time: "05:35 PM", orderDate: "22 May 2024, 01:15 PM",
  },
];

const TOTAL_ENTRIES = 248;
const TYPE_FILTERS = ["All Types", "Return", "Refund"];
const STATUS_FILTERS = ["All Status", "Pending", "In Review", "Approved", "Rejected"];

const OVERVIEW_SEGMENTS = [
  { label: "Pending", value: 72, color: "#f97316" },
  { label: "In Review", value: 58, color: "#3b82f6" },
  { label: "Approved", value: 84, color: "#10b981" },
  { label: "Rejected", value: 34, color: "#ef4444" },
];

const RETURN_VS_REFUND = [
  { label: "Return", value: 152, color: "#3b82f6" },
  { label: "Refund", value: 96, color: "#10b981" },
];

const QUICK_ACTIONS = [
  { label: "Return & Refund Policy", icon: ShieldCheck, bg: "bg-blue-50", fg: "text-blue-500" },
  { label: "Manage Reasons", icon: ListChecks, bg: "bg-orange-50", fg: "text-orange-500" },
  { label: "Refund Settings", icon: Settings2, bg: "bg-purple-50", fg: "text-purple-500" },
  { label: "Generate Refund Report", icon: FileBarChart2, bg: "bg-emerald-50", fg: "text-emerald-500" },
];

const money = (n) => `৳${n.toLocaleString()}.00`;

const Donut = ({ segments, total, centerLabel }) => {
  const totalValue = total ?? segments.reduce((s, seg) => s + seg.value, 0);
  const stops = segments
    .reduce((acc, seg) => {
      const prevEnd = acc.length ? acc[acc.length - 1].end : 0;
      const end = prevEnd + (seg.value / totalValue) * 360;
      acc.push({ color: seg.color, start: prevEnd, end });
      return acc;
    }, [])
    .map((seg) => `${seg.color} ${seg.start}deg ${seg.end}deg`)
    .join(", ");

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      >
        <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <p className="text-lg font-black text-slate-800">{totalValue}</p>
          <p className="text-[10px] text-slate-400">{centerLabel}</p>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="font-medium text-slate-600">{seg.label}</span>
            <span className="font-semibold text-slate-800">
              {seg.value} ({((seg.value / totalValue) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReturnRefundManagement = () => {
  const [type, setType] = useState("All Types");
  const [status, setStatus] = useState("All Status");
  const [dateRange, setDateRange] = useState("2024-05-01 - 2024-05-31");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [action, setAction] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const counts = useMemo(
    () => ({
      total: TOTAL_ENTRIES,
      pending: 72,
      inReview: 58,
      approved: 84,
      rejected: 34,
    }),
    [],
  );

  const filtered = useMemo(
    () =>
      REQUESTS.filter((r) => {
        const matchesQuery =
          !query ||
          r.id.toLowerCase().includes(query.toLowerCase()) ||
          r.orderId.toLowerCase().includes(query.toLowerCase()) ||
          r.customer.toLowerCase().includes(query.toLowerCase());
        const matchesType = type === "All Types" || r.type === type;
        const matchesStatus = status === "All Status" || r.status === status;
        return matchesQuery && matchesType && matchesStatus;
      }),
    [query, type, status],
  );

  const STAT_CARDS = [
    { key: "total", label: "Total Requests", subtitle: "All Return & Refund Requests", value: counts.total, icon: FileText, bg: "bg-blue-500", accent: "text-blue-600", cta: "View All" },
    { key: "pending", label: "Pending", subtitle: "Awaiting Review", value: counts.pending, icon: Clock, bg: "bg-orange-500", accent: "text-orange-600", cta: "View" },
    { key: "inReview", label: "In Review", subtitle: "Under Review", value: counts.inReview, icon: MessageSquareText, bg: "bg-purple-500", accent: "text-purple-600", cta: "View" },
    { key: "approved", label: "Approved", subtitle: "Return/Refund Approved", value: counts.approved, icon: CheckCircle2, bg: "bg-emerald-500", accent: "text-emerald-600", cta: "View" },
    { key: "rejected", label: "Rejected", subtitle: "Return/Refund Rejected", value: counts.rejected, icon: XCircle, bg: "bg-red-500", accent: "text-red-600", cta: "View" },
  ];

  const selected = REQUESTS.find((r) => r.id === selectedId) || null;

  const openDetails = (req) => {
    setSelectedId(req.id);
    setAction("");
    setAdminNote("");
    setActionMenuOpen(false);
  };

  const closeDetails = () => {
    setSelectedId(null);
    setActionMenuOpen(false);
  };

  return (
    <AdminLayout title="Return & Refund Management" subtitle="Review, approve and track return & refund requests">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-700">{s.label}</p>
              <p className="text-[11px] text-slate-400">{s.subtitle}</p>
              <button className={`mt-3 flex items-center gap-1 text-xs font-semibold ${s.accent} hover:underline`}>
                {s.cta} <Icon size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-600 outline-none focus:border-emerald-400 sm:w-60"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by Order ID, Request ID, Customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <SlidersHorizontal size={15} />
              Filter
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>
      </div>

      <Card className="mt-6" title="Return & Refund Requests">
        <div className="overflow-x-auto">
          <table className="w-full min-w-240 text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Request ID</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Request Date</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className={r.id === selectedId ? "bg-blue-50/50" : ""}>
                  <td className="py-3 font-semibold text-slate-700">{r.id}</td>
                  <td className="py-3 font-semibold text-blue-500">{r.orderId}</td>
                  <td className="py-3">
                    <p className="font-medium text-slate-700">{r.customer}</p>
                    <p className="text-xs text-slate-400">{r.customerCode}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        r.type === "Return" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <Package size={14} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{r.product}</p>
                        <p className="text-xs text-slate-400">{r.variant}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600">{r.reason}</td>
                  <td className="py-3">
                    <p className="font-bold text-slate-800">{money(r.amount)}</p>
                    <p className="text-xs text-slate-400">{r.payment}</p>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 text-slate-500">
                    <p>{r.date}</p>
                    <p className="text-xs text-slate-400">{r.time}</p>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => openDetails(r)}
                      className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                    >
                      <Eye size={13} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No requests match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
          <p className="text-xs text-slate-400">
            Showing 1 to {filtered.length} of {TOTAL_ENTRIES} entries
          </p>
          <div className="flex items-center gap-1">
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-100">‹</button>
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  p === 1 ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-slate-300">…</span>
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">25</button>
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-100">›</button>
          </div>
          <select className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 outline-none">
            <option>10 / page</option>
            <option>25 / page</option>
            <option>50 / page</option>
          </select>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Request Overview">
          <Donut segments={OVERVIEW_SEGMENTS} total={counts.total} centerLabel="Total" />
        </Card>

        <Card title="Return vs Refund">
          <Donut segments={RETURN_VS_REFUND} total={counts.total} centerLabel="Total" />
        </Card>

        <Card title="Refund Summary">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Refund Amount</p>
              <p className="text-xl font-black text-slate-900">{money(185450)}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">This Month</p>
              <p className="font-bold text-emerald-600">{money(85450)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Last Month</p>
              <p className="font-bold text-slate-700">{money(100000)}</p>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="space-y-2">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${qa.bg} ${qa.fg}`}>
                    <Icon size={15} />
                  </span>
                  {qa.label}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {selected && (
        <>
          <div
            onClick={closeDetails}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
          />
          <aside className="scrollbar-overlay fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-800">Request Details</h3>
              <button onClick={closeDetails} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black text-slate-900">{selected.id}</p>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Request &amp; Order Information
                </p>
                <div className="grid grid-cols-2 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Order ID</p>
                    <p className="font-semibold text-blue-500">{selected.orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Order Date</p>
                    <p className="font-medium text-slate-700">{selected.orderDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Customer</p>
                    <p className="font-medium text-slate-700">
                      {selected.customer} <span className="text-slate-400">({selected.customerCode})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="flex items-center gap-1 font-medium text-slate-700">
                      <Phone size={12} className="text-slate-400" />
                      {selected.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Type</p>
                    <p className="font-medium text-slate-700">{selected.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Payment Method</p>
                    <p className="font-medium text-slate-700">{selected.payment}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Request Date</p>
                    <p className="font-medium text-slate-700">
                      {selected.date}, {selected.time}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Product Information</p>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Package size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{selected.product}</p>
                    <p className="text-xs text-slate-400">{selected.variant}</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {money(selected.price)} <span className="font-normal text-slate-400">Qty: {selected.qty}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Reason</p>
                <p className="text-sm font-semibold text-slate-700">{selected.reason}</p>
                <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  <span className="font-medium text-slate-600">Customer Note: </span>
                  {selected.note}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Refund Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Refund Amount</p>
                    <p className="font-semibold text-slate-700">{money(selected.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Shipping Charge</p>
                    <p className="font-semibold text-slate-700">{money(selected.shipping)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-700">Total Refund Amount</p>
                  <p className="text-base font-black text-emerald-700">
                    {money(selected.amount + selected.shipping)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="mb-3 text-sm font-bold text-slate-800">Admin Action</p>

                <label className="mb-1 block text-xs font-semibold text-slate-500">Action *</label>
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-400"
                  >
                    <span className={action ? "font-medium text-slate-700" : "text-slate-400"}>
                      {action || "Select Action"}
                    </span>
                    <ChevronDown size={15} className="text-slate-400" />
                  </button>
                  {actionMenuOpen && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                      <button
                        onClick={() => {
                          setAction("Approve Refund");
                          setActionMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check size={15} />
                        Approve Refund
                      </button>
                      <button
                        onClick={() => {
                          setAction("Reject Refund");
                          setActionMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                      >
                        <X size={15} />
                        Reject Refund
                      </button>
                    </div>
                  )}
                </div>

                <label className="mb-1 mt-4 block text-xs font-semibold text-slate-500">Admin Note</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Write admin note here..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">{adminNote.length}/500</p>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={closeDetails}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!action}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </AdminLayout>
  );
};

export default ReturnRefundManagement;
