import {
  CalendarDays,
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  Search as SearchIcon,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const INVOICES = [
  { id: "INV-2026-001", orderId: "ORD-2026-001", customer: "Rakib Hasan", invoiceDate: "2026-04-12", dueDate: "2026-04-15", status: "Paid", amount: "1050TK" },
  { id: "INV-2026-002", orderId: "ORD-2026-002", customer: "Mohedi Islam", invoiceDate: "2026-04-11", dueDate: "2026-04-14", status: "Paid", amount: "750TK" },
  { id: "INV-2026-003", orderId: "ORD-2026-003", customer: "Tasnia Ahmed", invoiceDate: "2026-04-10", dueDate: "2026-04-13", status: "Paid", amount: "1200TK" },
  { id: "INV-2026-004", orderId: "ORD-2026-004", customer: "Fahim Rahman", invoiceDate: "2026-04-09", dueDate: "2026-04-12", status: "Paid", amount: "850TK" },
  { id: "INV-2026-005", orderId: "ORD-2026-005", customer: "Sadia Khatun", invoiceDate: "2026-04-08", dueDate: "2026-04-11", status: "Paid", amount: "650TK" },
  { id: "INV-2026-006", orderId: "ORD-2026-006", customer: "Karim Uddin", invoiceDate: "2026-04-08", dueDate: "2026-04-11", status: "Unpaid", amount: "400TK" },
  { id: "INV-2026-007", orderId: "ORD-2026-007", customer: "Nusrat Jahan", invoiceDate: "2026-04-07", dueDate: "2026-04-10", status: "Paid", amount: "1500TK" },
  { id: "INV-2026-008", orderId: "ORD-2026-008", customer: "Habib Khan", invoiceDate: "2026-04-07", dueDate: "2026-04-10", status: "Unpaid", amount: "920TK" },
];

const STATUS_FILTERS = ["All Status", "Paid", "Unpaid"];

const InvoiceManagement = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");

  const counts = useMemo(
    () => ({
      total: INVOICES.length,
      paid: INVOICES.filter((i) => i.status === "Paid").length,
      unpaid: INVOICES.filter((i) => i.status === "Unpaid").length,
      totalAmount: INVOICES.reduce((sum, i) => sum + parseInt(i.amount, 10), 0),
    }),
    [],
  );

  const totalPaid = INVOICES.filter((i) => i.status === "Paid").reduce((sum, i) => sum + parseInt(i.amount, 10), 0);
  const totalUnpaid = INVOICES.filter((i) => i.status === "Unpaid").reduce((sum, i) => sum + parseInt(i.amount, 10), 0);

  const filtered = useMemo(
    () =>
      INVOICES.filter((i) => {
        const matchesQuery =
          !query ||
          i.id.toLowerCase().includes(query.toLowerCase()) ||
          i.orderId.toLowerCase().includes(query.toLowerCase()) ||
          i.customer.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || i.status === status;
        return matchesQuery && matchesStatus;
      }),
    [query, status],
  );

  return (
    <AdminLayout
      title="Invoice Management"
      subtitle="Create, view and manage all invoices"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600">
          <Plus size={16} />
          Create Invoice
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} iconBg="bg-blue-500" label="Total Invoices" value={counts.total} />
        <StatCard icon={FileText} iconBg="bg-emerald-500" label="Paid" value={counts.paid} />
        <StatCard icon={FileText} iconBg="bg-red-500" label="Unpaid" value={counts.unpaid} />
        <StatCard icon={Wallet} iconBg="bg-purple-500" label="Total Amount" value={`${counts.totalAmount}TK`} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by Invoice ID, Order ID or Customer..."
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
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Invoice ID</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Invoice Date</th>
                <th className="pb-3 font-semibold">Due Date</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 font-semibold text-blue-500">{i.id}</td>
                  <td className="py-3 font-semibold text-blue-500">{i.orderId}</td>
                  <td className="py-3 font-medium text-orange-500">{i.customer}</td>
                  <td className="py-3 text-slate-500">{i.invoiceDate}</td>
                  <td className="py-3 text-slate-500">{i.dueDate}</td>
                  <td className="py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="py-3 font-bold text-slate-800">{i.amount}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
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
                    No invoices match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Paid</p>
            <p className="text-lg font-extrabold text-emerald-600">{totalPaid}TK</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Unpaid</p>
            <p className="text-lg font-extrabold text-red-500">{totalUnpaid}TK</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <CalendarDays size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">This Month</p>
            <p className="text-lg font-extrabold text-blue-600">{counts.total}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InvoiceManagement;
