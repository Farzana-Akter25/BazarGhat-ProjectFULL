import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  MapPinned,
  MessageSquareWarning,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const RANGE_DATA = {
  "7 Days": {
    revenue: "7980 BDT",
    orders: 4,
    pending: 0,
    customers: 2,
    orderStatus: { pending: 2, onTheWay: 1, completed: 2 },
    chart: [
      { label: "Sat", value: 2500 },
      { label: "Sun", value: 4200 },
      { label: "Mon", value: 3100 },
      { label: "Tue", value: 4800 },
      { label: "Wed", value: 5200 },
      { label: "Thu", value: 4600 },
      { label: "Fri", value: 6800 },
    ],
  },
  "30 Days": {
    revenue: "86200 BDT",
    orders: 42,
    pending: 3,
    customers: 5,
    orderStatus: { pending: 3, onTheWay: 4, completed: 35 },
    chart: [
      { label: "Wk1", value: 18500 },
      { label: "Wk2", value: 22300 },
      { label: "Wk3", value: 19800 },
      { label: "Wk4", value: 25600 },
    ],
  },
};

const LATEST_ORDERS = [
  { id: "ORD-2026-001", customer: "Rakib Hasan", date: "Jul 2, 2026", amount: "1050 BDT", status: "Completed" },
  { id: "ORD-2026-002", customer: "Mohedi Islam", date: "Jul 2, 2026", amount: "750 BDT", status: "On The Way" },
  { id: "ORD-2026-003", customer: "Tasnia Ahmed", date: "Jul 1, 2026", amount: "1200 BDT", status: "Pending" },
  { id: "ORD-2026-004", customer: "Fahim Rahman", date: "Jul 1, 2026", amount: "850 BDT", status: "Completed" },
  { id: "ORD-2026-005", customer: "Sadia Khatun", date: "Jun 30, 2026", amount: "650 BDT", status: "Pending" },
];

const QUICK_ACCESS = [
  { label: "Order Management", subtitle: "View & process orders", to: "/admin/orders", icon: ClipboardList, bg: "bg-blue-500" },
  { label: "Product Management", subtitle: "Add, edit, delete products", to: "/admin/products", icon: Package, bg: "bg-orange-500" },
  { label: "Inventory", subtitle: "Stock levels & alerts", to: "/admin/inventory", icon: Boxes, bg: "bg-amber-500" },
  { label: "Delivery Management", subtitle: "Manage deliveries", to: "/admin/delivery", icon: Truck, bg: "bg-purple-500" },
  { label: "Delivery Assignment", subtitle: "Assign orders to riders", to: "/admin/delivery-assignment", icon: MapPinned, bg: "bg-teal-500" },
  { label: "Customer Management", subtitle: "View all customers", to: "/admin/customers", icon: Users, bg: "bg-pink-500" },
  { label: "Invoice Management", subtitle: "Invoices & billing", to: "/admin/invoices", icon: FileText, bg: "bg-sky-500" },
  { label: "Return & Refund Management", subtitle: "Review returns & process refunds", to: "/admin/returns-refunds", icon: RotateCcw, bg: "bg-yellow-500" },
  { label: "Complaint Management", subtitle: "Respond to complaints", to: "/admin/complaints", icon: MessageSquareWarning, bg: "bg-red-500" },
  { label: "Sales Analytics", subtitle: "Revenue & reports", to: "/admin/sales-analytics", icon: BarChart3, bg: "bg-indigo-500" },
  { label: "Settings", subtitle: "System configuration", to: "/admin/settings", icon: Settings, bg: "bg-slate-500" },
];

const AdminDashboard = () => {
  const [range, setRange] = useState("7 Days");
  const data = RANGE_DATA[range];
  const maxValue = Math.max(...data.chart.map((d) => d.value));

  return (
    <AdminLayout
      title="Analytics Overview"
      subtitle="7 Days & 30 Days Business Summary"
      actions={
        <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm">
          {["7 Days", "30 Days"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                range === r
                  ? "bg-emerald-500 text-white shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} iconBg="bg-emerald-500" label="Total Revenue" value={data.revenue} />
        <StatCard icon={ShoppingCart} iconBg="bg-blue-500" label="Total Orders" value={data.orders} />
        <StatCard icon={Clock} iconBg="bg-orange-500" label="Pending Orders" value={data.pending} />
        <StatCard icon={Users2} iconBg="bg-purple-500" label="Customers" value={data.customers} />
      </div>

      {/* Order status + sales analytics */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Order Status" action={<BarChart3 size={18} className="text-slate-300" />}>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold text-emerald-600">Pending</span>
              <span className="text-lg font-bold text-slate-800">{data.orderStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-slate-500">On The Way</span>
              <span className="text-lg font-bold text-slate-800">{data.orderStatus.onTheWay}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-slate-500">Completed</span>
              <span className="text-lg font-bold text-slate-800">{data.orderStatus.completed}</span>
            </div>
          </div>
        </Card>

        <Card
          title="Sales Analytics"
          action={
            <Link to="/admin/sales-analytics" className="text-xs font-semibold text-emerald-600 hover:underline">
              View All →
            </Link>
          }
        >
          <div className="flex h-40 items-end justify-between gap-3 px-1">
            {data.chart.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-8 rounded-t-md bg-emerald-400"
                  style={{ height: `${(d.value / maxValue) * 100}%` }}
                />
                <span className="text-[11px] font-medium text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Latest orders */}
      <Card
        className="mt-6"
        title="Latest Orders"
        action={
          <Link to="/admin/orders" className="text-xs font-semibold text-emerald-600 hover:underline">
            View All →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LATEST_ORDERS.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 font-semibold text-blue-500">{order.id}</td>
                  <td className="py-3 font-medium text-orange-500">{order.customer}</td>
                  <td className="py-3 text-slate-500">{order.date}</td>
                  <td className="py-3 font-bold text-slate-800">{order.amount}</td>
                  <td className="py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick access */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-bold text-slate-800">
          Quick Access — All Management Systems
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
                  <p className="truncate text-xs text-slate-400">{item.subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
