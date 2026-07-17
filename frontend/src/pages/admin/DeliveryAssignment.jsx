import { CheckCircle2, Clock, Eye, MoreVertical, Plus, Search as SearchIcon, Users2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const DELIVERY_MEN = ["All Delivery Men", "Sabbir Hossain", "Tanvir Hasan", "Riyad Hossain"];
const STATUSES = ["All Status", "In Progress", "Completed", "Pending"];

const ASSIGNMENTS = [
  { orderId: "ORD-1001", customer: "Rasel Ahmed", customerPhone: "01712-345678", rider: "Sabbir Hossain", riderPhone: "01911-222333", area: "Dhanmondi, Dhaka", time: "25 May 2024, 10:30 AM", status: "In Progress" },
  { orderId: "ORD-1002", customer: "Nusrat Jahan", customerPhone: "01823-456789", rider: "Tanvir Hasan", riderPhone: "01922-333444", area: "Uttara, Dhaka", time: "25 May 2024, 11:15 AM", status: "Completed" },
  { orderId: "ORD-1003", customer: "Fahim Rahman", customerPhone: "01678-345678", rider: "Sabbir Hossain", riderPhone: "01911-222333", area: "Mirpur, Dhaka", time: "25 May 2024, 12:00 PM", status: "Pending" },
  { orderId: "ORD-1004", customer: "Mim Akter", customerPhone: "01789-456123", rider: "Riyad Hossain", riderPhone: "01888-444555", area: "Motijheel, Dhaka", time: "25 May 2024, 01:30 PM", status: "In Progress" },
  { orderId: "ORD-1005", customer: "Hasan Mahmud", customerPhone: "01567-890123", rider: "Tanvir Hasan", riderPhone: "01922-333444", area: "Gulshan, Dhaka", time: "25 May 2024, 02:45 PM", status: "Completed" },
];

const TOTAL_ENTRIES = 28;

const RiderAvatar = ({ name }) => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
    {name
      .split(" ")
      .map((n) => n[0])
      .join("")}
  </div>
);

const DeliveryAssignment = () => {
  const [date, setDate] = useState("2024-05-25");
  const [rider, setRider] = useState("All Delivery Men");
  const [status, setStatus] = useState("All Status");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      total: TOTAL_ENTRIES,
      completed: ASSIGNMENTS.filter((a) => a.status === "Completed").length + 13,
      inProgress: ASSIGNMENTS.filter((a) => a.status === "In Progress").length + 5,
      pending: ASSIGNMENTS.filter((a) => a.status === "Pending").length + 2,
    }),
    [],
  );

  const filtered = useMemo(
    () =>
      ASSIGNMENTS.filter((a) => {
        const matchesQuery =
          !query ||
          a.orderId.toLowerCase().includes(query.toLowerCase()) ||
          a.customer.toLowerCase().includes(query.toLowerCase());
        const matchesRider = rider === "All Delivery Men" || a.rider === rider;
        const matchesStatus = status === "All Status" || a.status === status;
        return matchesQuery && matchesRider && matchesStatus;
      }),
    [query, rider, status],
  );

  return (
    <AdminLayout title="Delivery Assignment" subtitle="Assign orders to delivery personnel">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Delivery Man</label>
            <select
              value={rider}
              onChange={(e) => setRider(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {DELIVERY_MEN.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
              <Plus size={16} />
              New Assignment
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users2} iconBg="bg-blue-500" label="Total Assignments" value={counts.total} />
        <StatCard icon={CheckCircle2} iconBg="bg-emerald-500" label="Completed" value={counts.completed} />
        <StatCard icon={Clock} iconBg="bg-orange-500" label="In Progress" value={counts.inProgress} />
        <StatCard icon={XCircle} iconBg="bg-red-500" label="Pending" value={counts.pending} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-slate-800">Assignments List</h3>
          <div className="relative w-full sm:w-72">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by order ID, customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">#</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Delivery Man</th>
                <th className="pb-3 font-semibold">Area</th>
                <th className="pb-3 font-semibold">Assign Time</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a, idx) => (
                <tr key={a.orderId}>
                  <td className="py-3 text-slate-400">{idx + 1}</td>
                  <td className="py-3 font-semibold text-blue-500">{a.orderId}</td>
                  <td className="py-3">
                    <p className="font-medium text-slate-700">{a.customer}</p>
                    <p className="text-xs text-slate-400">{a.customerPhone}</p>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <RiderAvatar name={a.rider} />
                      <div>
                        <p className="font-medium text-slate-700">{a.rider}</p>
                        <p className="text-xs text-slate-400">{a.riderPhone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500">{a.area}</td>
                  <td className="py-3 text-slate-500">{a.time}</td>
                  <td className="py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                        <Eye size={13} />
                        View
                      </button>
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No assignments match your filters.
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
            {[1, 2, 3].map((p) => (
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
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-100">›</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DeliveryAssignment;
