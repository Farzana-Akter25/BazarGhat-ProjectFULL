import {
  ArrowRight,
  CalendarDays,
  HardHat,
  Search as SearchIcon,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const DM_COMPLAINTS = [
  { id: "#DM1245", deliveryMan: "Rafiq Hossain", deliveryManCode: "DM001", customer: "John Doe", customerCode: "CUST1002", orderId: "ORD12345", reason: "Rude Behavior", status: "Pending", date: "25 May 2024", time: "10:30 AM" },
  { id: "#DM1244", deliveryMan: "Asif Khan", deliveryManCode: "DM002", customer: "Sarah Smith", customerCode: "CUST1003", orderId: "ORD12312", reason: "Didn't Pay Additional Tip", status: "In Review", date: "25 May 2024", time: "09:15 AM" },
  { id: "#DM1243", deliveryMan: "Jahid Hasan", deliveryManCode: "DM003", customer: "Mike Johnson", customerCode: "CUST1004", orderId: "ORD12311", reason: "Customer Misbehavior", status: "Resolved", date: "24 May 2024", time: "08:40 PM" },
  { id: "#DM1242", deliveryMan: "Tanvir Islam", deliveryManCode: "DM004", customer: "David Brown", customerCode: "CUST1005", orderId: "ORD12310", reason: "Wrong Address Provided", status: "Pending", date: "24 May 2024", time: "07:20 PM" },
  { id: "#DM1241", deliveryMan: "Rasel Ahmed", deliveryManCode: "DM005", customer: "Emily Davis", customerCode: "CUST1006", orderId: "ORD12309", reason: "Order Cancelled Unfairly", status: "In Review", date: "24 May 2024", time: "06:10 PM" },
];

const CUSTOMER_COMPLAINTS = [
  { id: "#CUST2145", customer: "John Doe", customerCode: "CUST1002", against: "Rafiq Hossain", againstCode: "DM001", orderId: "ORD12345", reason: "Late Delivery", status: "Pending", date: "25 May 2024", time: "10:45 AM" },
  { id: "#CUST2144", customer: "Sarah Smith", customerCode: "CUST1003", against: "Asif Khan", againstCode: "DM002", orderId: "ORD12312", reason: "Damaged Product", status: "In Review", date: "25 May 2024", time: "09:30 AM" },
  { id: "#CUST2143", customer: "Mike Johnson", customerCode: "CUST1004", against: "Tanvir Islam", againstCode: "DM004", orderId: "ORD12310", reason: "Rude Behavior", status: "Resolved", date: "24 May 2024", time: "08:50 PM" },
  { id: "#CUST2142", customer: "David Brown", customerCode: "CUST1005", against: "Jahid Hasan", againstCode: "DM003", orderId: "ORD12311", reason: "Wrong Item Delivered", status: "Pending", date: "24 May 2024", time: "07:25 PM" },
  { id: "#CUST2141", customer: "Emily Davis", customerCode: "CUST1006", against: "DeliveryHub (Product)", againstCode: "", orderId: "ORD12309", reason: "Poor Product Quality", status: "In Review", date: "24 May 2024", time: "06:15 PM" },
];

const COMPLAINT_TYPES = ["All Complaints", "By Delivery Man", "By Customer"];
const STATUS_FILTERS = ["All Status", "Pending", "In Review", "Resolved"];

const PersonCell = ({ name, code }) => (
  <div>
    <p className="font-medium text-slate-700">{name}</p>
    {code && <p className="text-xs text-slate-400">{code}</p>}
  </div>
);

const ComplaintManagement = () => {
  const [type, setType] = useState("All Complaints");
  const [status, setStatus] = useState("All Status");
  const [dateRange, setDateRange] = useState("2024-05-01 - 2024-05-31");
  const [query, setQuery] = useState("");

  const filteredDm = useMemo(
    () =>
      DM_COMPLAINTS.filter((c) => {
        const matchesQuery =
          !query ||
          c.id.toLowerCase().includes(query.toLowerCase()) ||
          c.deliveryMan.toLowerCase().includes(query.toLowerCase()) ||
          c.customer.toLowerCase().includes(query.toLowerCase()) ||
          c.orderId.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || c.status === status;
        const matchesType = type !== "By Customer";
        return matchesQuery && matchesStatus && matchesType;
      }),
    [query, status, type],
  );

  const filteredCustomer = useMemo(
    () =>
      CUSTOMER_COMPLAINTS.filter((c) => {
        const matchesQuery =
          !query ||
          c.id.toLowerCase().includes(query.toLowerCase()) ||
          c.customer.toLowerCase().includes(query.toLowerCase()) ||
          c.against.toLowerCase().includes(query.toLowerCase()) ||
          c.orderId.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || c.status === status;
        const matchesType = type !== "By Delivery Man";
        return matchesQuery && matchesStatus && matchesType;
      }),
    [query, status, type],
  );

  return (
    <AdminLayout title="Complaint Management" subtitle="Review and resolve complaints between delivery men and customers">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500">
              <HardHat size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{DM_COMPLAINTS.length + 123}</p>
              <p className="text-sm font-bold text-slate-800">Complaints by Delivery Man</p>
              <p className="text-xs text-slate-400">Against Customer</p>
            </div>
          </div>
          <button
            onClick={() => setType("By Delivery Man")}
            className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View Complaints <ArrowRight size={15} />
          </button>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <User size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">{CUSTOMER_COMPLAINTS.length + 171}</p>
              <p className="text-sm font-bold text-slate-800">Complaints by Customer</p>
              <p className="text-xs text-slate-400">Against Delivery Man / Product</p>
            </div>
          </div>
          <button
            onClick={() => setType("By Customer")}
            className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View Complaints <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
        >
          {COMPLAINT_TYPES.map((t) => (
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
        <div className="relative flex-1">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search complaint ID, name, order ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
          />
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <SlidersHorizontal size={15} />
          Filter
        </button>
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-4 ${type === "All Complaints" ? "xl:grid-cols-2" : ""}`}>
        {type !== "By Customer" && (
          <Card
            title={
              <span className="flex items-center gap-2 text-blue-600">
                Complaints by Delivery Man Against Customer
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600">
                  {DM_COMPLAINTS.length + 123}
                </span>
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="pb-3 font-semibold">ID</th>
                    <th className="pb-3 font-semibold">Delivery Man</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Order ID</th>
                    <th className="pb-3 font-semibold">Reason</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDm.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-semibold text-slate-700">{c.id}</td>
                      <td className="py-3">
                        <PersonCell name={c.deliveryMan} code={c.deliveryManCode} />
                      </td>
                      <td className="py-3">
                        <PersonCell name={c.customer} code={c.customerCode} />
                      </td>
                      <td className="py-3 font-semibold text-blue-500">{c.orderId}</td>
                      <td className="py-3 text-slate-600">{c.reason}</td>
                      <td className="py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 text-slate-500">
                        <p>{c.date}</p>
                        <p className="text-xs text-slate-400">{c.time}</p>
                      </td>
                    </tr>
                  ))}
                  {filteredDm.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No complaints match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All Complaints <ArrowRight size={15} />
            </button>
          </Card>
        )}

        {type !== "By Delivery Man" && (
          <Card
            title={
              <span className="flex items-center gap-2 text-emerald-600">
                Complaints by Customer Against Delivery Man / Product
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  {CUSTOMER_COMPLAINTS.length + 171}
                </span>
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="pb-3 font-semibold">ID</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Against</th>
                    <th className="pb-3 font-semibold">Order ID</th>
                    <th className="pb-3 font-semibold">Reason</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomer.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-semibold text-slate-700">{c.id}</td>
                      <td className="py-3">
                        <PersonCell name={c.customer} code={c.customerCode} />
                      </td>
                      <td className="py-3">
                        <PersonCell name={c.against} code={c.againstCode} />
                      </td>
                      <td className="py-3 font-semibold text-blue-500">{c.orderId}</td>
                      <td className="py-3 text-slate-600">{c.reason}</td>
                      <td className="py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 text-slate-500">
                        <p>{c.date}</p>
                        <p className="text-xs text-slate-400">{c.time}</p>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomer.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No complaints match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              View All Complaints <ArrowRight size={15} />
            </button>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ComplaintManagement;
