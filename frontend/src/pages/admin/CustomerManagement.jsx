import { Ban, CheckCircle2, Mail, Phone, Search as SearchIcon, ShieldOff, Users, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const CUSTOMERS = [
  { id: "CUST 001", name: "Rakib Hasan", email: "rakib@email.com", phone: "01712 345678", orders: 45, spent: "TK 67,500", status: "Active" },
  { id: "CUST 002", name: "Sadia Khatun", email: "sadia@email.com", phone: "01812 987654", orders: 32, spent: "TK 48,000", status: "Active" },
  { id: "CUST 003", name: "Fahim Rahman", email: "fahim@email.com", phone: "01912 456789", orders: 78, spent: "TK 125,000", status: "Active" },
  { id: "CUST 004", name: "Nadia Islam", email: "nadia@email.com", phone: "01612 789012", orders: 15, spent: "TK 22,500", status: "Blocked" },
  { id: "CUST 005", name: "Ahmed Hassan", email: "ahmed@email.com", phone: "01512 345678", orders: 28, spent: "TK 38,900", status: "Active" },
];

const FILTERS = ["All", "Active", "Blocked"];

const CustomerManagement = () => {
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const counts = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((c) => c.status === "Active").length,
      blocked: customers.filter((c) => c.status === "Blocked").length,
    }),
    [customers],
  );

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const matchesQuery =
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query) ||
          c.id.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "All" || c.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [customers, query, filter],
  );

  const toggleBlock = (id) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === "Active" ? "Blocked" : "Active" } : c)),
    );
  };

  return (
    <AdminLayout title="Customer Management" subtitle="View, manage, and block/unblock customers">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Customers</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">{counts.total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Users size={18} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Active Customers</p>
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
              <p className="text-xs text-slate-400">Blocked Customers</p>
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
              placeholder="Search by name, email, phone, or ID..."
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Contact</th>
                <th className="pb-3 font-semibold">Orders</th>
                <th className="pb-3 font-semibold">Total Spent</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="py-3">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.id}</p>
                  </td>
                  <td className="py-3">
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Mail size={12} /> {c.email}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Phone size={12} /> {c.phone}
                    </p>
                  </td>
                  <td className="py-3 font-semibold text-slate-700">{c.orders}</td>
                  <td className="py-3 font-bold text-emerald-600">{c.spent}</td>
                  <td className="py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                        View
                      </button>
                      {c.status === "Active" ? (
                        <button
                          onClick={() => toggleBlock(c.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Ban size={12} />
                          Block
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleBlock(c.id)}
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
                    No customers match your search.
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

export default CustomerManagement;
