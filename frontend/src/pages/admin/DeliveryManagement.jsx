import { Ban, CheckCircle2, Mail, MapPin, Phone, Search as SearchIcon, ShieldOff, Star, Truck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const STAFF = [
  { id: "DEL-001", name: "Karim Mia", email: "karim@bazarghat.com", phone: "01711-111111", area: "Uttara, Dhaka", deliveries: 1250, rating: 4.7, onTime: 96.5, status: "Active" },
  { id: "DEL-002", name: "Rahim Sheikh", email: "rahim@bazarghat.com", phone: "01722-222222", area: "Mohakhali, Dhaka", deliveries: 980, rating: 4.5, onTime: 94.2, status: "Active" },
  { id: "DEL-003", name: "Salman Khan", email: "salman@bazarghat.com", phone: "01733-333333", area: "Banani, Dhaka", deliveries: 750, rating: 4.2, onTime: 91.8, status: "Blocked" },
  { id: "DEL-004", name: "Hafiz Rahman", email: "hafiz@bazarghat.com", phone: "01744-444444", area: "Mirpur, Dhaka", deliveries: 650, rating: 4.8, onTime: 97.1, status: "Active" },
];

const FILTERS = ["All", "Active", "Blocked"];

const DeliveryManagement = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(STAFF);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const counts = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.status === "Active").length,
      blocked: staff.filter((s) => s.status === "Blocked").length,
    }),
    [staff],
  );

  const filtered = useMemo(
    () =>
      staff.filter((s) => {
        const matchesQuery =
          !query ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase()) ||
          s.phone.includes(query) ||
          s.area.toLowerCase().includes(query.toLowerCase()) ||
          s.id.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "All" || s.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [staff, query, filter],
  );

  const toggleBlock = (id) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === "Active" ? "Blocked" : "Active" } : s)),
    );
  };

  return (
    <AdminLayout
      title="Delivery Personnel Management"
      subtitle="View, manage, and block/unblock delivery personnel"
      backTo={{ to: "/admindashboard", onClick: () => navigate("/admindashboard") }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Delivery Staff</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">{counts.total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Truck size={18} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Active Personnel</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">{counts.active}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
              <UserCheck size={18} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Blocked Personnel</p>
              <p className="mt-1 text-2xl font-extrabold text-red-500">{counts.blocked}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-500">
              <ShieldOff size={18} />
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by name, email, phone, area, or ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  filter === f ? "bg-emerald-600 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Personnel</th>
                <th className="pb-3 font-semibold">Contact</th>
                <th className="pb-3 font-semibold">Area</th>
                <th className="pb-3 font-semibold">Performance</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="py-3">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.id}</p>
                  </td>
                  <td className="py-3">
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Mail size={12} /> {s.email}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Phone size={12} /> {s.phone}
                    </p>
                  </td>
                  <td className="py-3">
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <MapPin size={12} /> {s.area}
                    </p>
                  </td>
                  <td className="py-3">
                    <p className="font-semibold text-slate-700">{s.deliveries} deliveries</p>
                    <p className="flex items-center gap-1 text-xs text-amber-500">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {s.rating} ({s.onTime}%)
                    </p>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                        View
                      </button>
                      {s.status === "Active" ? (
                        <button
                          onClick={() => toggleBlock(s.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Ban size={12} />
                          Block
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleBlock(s.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={12} />
                          Unblock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No delivery personnel match your search.
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

export default DeliveryManagement;
