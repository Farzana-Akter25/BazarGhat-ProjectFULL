import {
  Bell,
  Boxes,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  MapPinned,
  MessageSquareWarning,
  Package,
  RefreshCcw,
  Truck,
  Users,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Skeleton, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";
import { formatDate } from "../../utils/formatDate";
import { shortId } from "../../utils/shortId";
import DataTable, { TD } from "../../components/shared/DataTable"; // shared table shell
import SalesChart from "../../components/admin/SalesChart"; // daily revenue chart
import {
  useGetDashboardSummaryQuery,
  useGetSalesAnalyticsQuery,
} from "../../features/admin/dashboardApi";

// recent transactions table columns
const TRANSACTION_COLUMNS = [
  { label: "Transaction ID" },
  { label: "Customer" },
  { label: "Date & Time" },
  { label: "Status" },
  { label: "Amount", align: "right" },
];

// latest orders table columns
const LATEST_ORDER_COLUMNS = [
  { label: "Order ID" },
  { label: "Customer" },
  { label: "Date" },
  { label: "Amount" },
  { label: "Status" },
];

// Puts thousand separators into an amount that arrives as text ("2006 BDT" -> "2,006 BDT"), so large figures stay readable at a glance.
const readableAmount = (value) =>
  String(value ?? "").replace(/\d+/, (digits) => Number(digits).toLocaleString());

// order status breakdown rows, in the order an order moves through them
const ORDER_STATUS_ROWS = [
  { key: "pending", label: "Pending", dot: "bg-orange-400", bar: "bg-orange-400" },
  { key: "onTheWay", label: "Out for Delivery", dot: "bg-blue-500", bar: "bg-blue-500" },
  { key: "completed", label: "Completed", dot: "bg-green-700", bar: "bg-green-700" },
];

// fallback dashboard data
const EMPTY_DATA = {
  revenue: "0 BDT",
  orders: 0,
  pending: 0,
  customers: 0,
  orderStatus: { pending: 0, onTheWay: 0, completed: 0 },
  chart: [],
  latestOrders: [],
};

// quick access shortcuts grid
const QUICK_ACCESS = [
  { label: "Order Management", subtitle: "View & process orders", to: "/admin/orders", icon: ClipboardList, bg: "bg-blue-500" },
  { label: "Product Management", subtitle: "Add, edit, delete products", to: "/admin/products", icon: Package, bg: "bg-orange-500" },
  { label: "Inventory", subtitle: "Stock levels & alerts", to: "/admin/inventory", icon: Boxes, bg: "bg-amber-500" },
  { label: "Delivery Person", subtitle: "Manage delivery personnel", to: "/admin/delivery", icon: Truck, bg: "bg-purple-500" },
  { label: "Delivery Assignment", subtitle: "Assign orders to riders", to: "/admin/delivery-assignment", icon: MapPinned, bg: "bg-teal-500" },
  { label: "Delivery Man Request", subtitle: "Rejections & day-off requests", to: "/admin/delivery-requests", icon: Bell, bg: "bg-rose-500" },
  { label: "Customer Management", subtitle: "View all customers", to: "/admin/customers", icon: Users, bg: "bg-pink-500" },
  { label: "Invoice Management", subtitle: "Invoices & billing", to: "/admin/invoices", icon: FileText, bg: "bg-sky-500" },
  { label: "Return & Refund Management", subtitle: "Review returns & process refunds", to: "/admin/returns-refunds", icon: RefreshCcw, bg: "bg-yellow-500" },
  { label: "Complaint Management", subtitle: "Respond to complaints", to: "/admin/complaints", icon: MessageSquareWarning, bg: "bg-red-500" },
];

// Admin home page: stat cards, sales chart, order status, analytics and latest orders
const AdminDashboard = () => {
  const [range, setRange] = useState("7 Days"); // active date range toggle
  // summary stats, polled every 15s so numbers stay fresh
  const { data: fetched, isLoading } = useGetDashboardSummaryQuery(range === "7 Days" ? 7 : 30, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  // Use empty placeholder data until the first response arrives
  const data = fetched || EMPTY_DATA;
  // orders covered by the status breakdown, used for each row's share
  const statusTotal = ORDER_STATUS_ROWS.reduce((sum, row) => sum + (data.orderStatus[row.key] || 0), 0);

  // sales analytics, also polled every 15s
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useGetSalesAnalyticsQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  // Analytics sections, empty while loading
  const monthlyRevenue = analyticsData?.monthlyRevenue || [];
  const topCategories = analyticsData?.topCategories || [];
  const transactions = analyticsData?.transactions || [];

  // Totals across the monthly chart
  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const totalOrders = monthlyRevenue.reduce((sum, m) => sum + m.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <AdminLayout
      title="Analytics Overview"
      // says which period every number below covers, not just which toggles exist
      subtitle={`Business summary for the last ${range.toLowerCase()}`}
      actions={
        // date range toggle
        <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm">
          {["7 Days", "30 Days"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              title={`Show the last ${r.toLowerCase()}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                range === r
                  ? "bg-green-700 text-white shadow"
                  : "text-slate-700 hover:text-slate-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      {/* Stat cards — placeholders while the first load is still in flight, so zeros never get mistaken for real numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          iconBg="bg-green-700"
          label="Total Revenue"
          value={isLoading ? <Skeleton className="mt-2 h-7 w-28" /> : readableAmount(data.revenue)}
        />
        <StatCard
          icon={ClipboardList}
          iconBg="bg-blue-500"
          label="Total Orders"
          value={isLoading ? <Skeleton className="mt-2 h-7 w-14" /> : data.orders}
        />
        <StatCard
          icon={Clock3}
          iconBg="bg-orange-500"
          label="Pending Orders"
          value={isLoading ? <Skeleton className="mt-2 h-7 w-14" /> : data.pending}
        />
        <StatCard
          icon={Users2}
          iconBg="bg-purple-500"
          label="Customers"
          value={isLoading ? <Skeleton className="mt-2 h-7 w-14" /> : data.customers}
        />
      </div>

      {/* Order status + sales analytics */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* order status breakdown card */}
        <Card
          title="Order Status"
          action={
            // how many orders the breakdown below is splitting
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {statusTotal} {statusTotal === 1 ? "order" : "orders"}
            </span>
          }
        >
          <div className="space-y-5">
            {/* placeholder rows during the first load */}
            {isLoading &&
              ORDER_STATUS_ROWS.map((row) => (
                <div key={row.key}>
                  <Skeleton className="mb-2 h-4 w-40" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}

            {/* one row per status: count, share of the period and a share bar */}
            {!isLoading &&
              ORDER_STATUS_ROWS.map((row) => {
                // Orders in this status and their share of all orders
                const count = data.orderStatus[row.key] || 0;
                const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;

                return (
                  <div key={row.key}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-slate-700">
                        {/* status colour key */}
                        <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                        {row.label}
                      </span>
                      <span className="font-bold text-slate-800">
                        {count} <span className="font-normal text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    {/* share bar track + fill */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* daily sales chart card */}
        <Card
          title="Sales Analytics"
          action={
            // which period the chart is drawing
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              Last {range}
            </span>
          }
        >
          {isLoading ? (
            // placeholder chart while the first load runs
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <SalesChart data={data.chart} rangeLabel={range} />
          )}
        </Card>
      </div>

      {/* Monthly revenue + top categories */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Monthly Revenue"
          action={
            // range label chip
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-500">
              Last 4 Months
            </span>
          }
        >
          <div className="space-y-5">
            {/* placeholder rows during the first load */}
            {isAnalyticsLoading &&
              [0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}

            {/* nothing to draw yet */}
            {!isAnalyticsLoading && monthlyRevenue.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No revenue recorded yet.</p>
            )}

            {/* per-month revenue bar */}
            {monthlyRevenue.map((m) => (
              <div key={m.month}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-slate-600">{m.month}</span>
                  <span className="font-bold text-slate-800">
                    {m.revenue.toLocaleString()}TK{" "}
                    <span className="font-normal text-slate-600">({m.orders} orders)</span>
                  </span>
                </div>
                {/* progress bar track + fill */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-green-700"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* avg order value + total revenue footer */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-600">Average Order Value</p>
              <p className="text-lg font-extrabold text-slate-800">{avgOrderValue.toLocaleString()}TK</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Total Revenue</p>
              <p className="text-lg font-extrabold text-green-700">{totalRevenue.toLocaleString()}TK</p>
            </div>
          </div>
        </Card>

        {/* top categories card */}
        <Card title="Top Categories">
          <div className="space-y-5">
            {/* placeholder rows during the first load */}
            {isAnalyticsLoading &&
              [0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-40" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}

            {/* nothing to draw yet */}
            {!isAnalyticsLoading && topCategories.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No category sales recorded yet.
              </p>
            )}

            {/* per-category share bar */}
            {topCategories.map((c) => (
              <div key={c.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    {c.name} <span className="text-slate-600">#{c.rank}</span>
                  </span>
                  <span className="text-xs text-slate-600">{c.pct}% of sales</span>
                </div>
                {/* progress bar track + fill */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${c.pct}%` }} />
                </div>
                <p className="mt-1 text-right text-xs font-semibold text-slate-700">{c.revenue}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="mt-6" title="Recent Transactions">
        {/* transactions table */}
        <DataTable
          columns={TRANSACTION_COLUMNS}
          isEmpty={transactions.length === 0}
          emptyText="No transactions yet."
        >
          {/* transaction rows */}
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              {/* transaction id cell */}
              <td className={`${TD} font-semibold text-blue-500`} title={t.id}>
                {shortId(t.id)}
              </td>
              {/* customer name cell */}
              <td className={`${TD} font-medium text-orange-500`}>{t.customer}</td>
              {/* date cell */}
              <td className={`${TD} text-slate-700`}>{formatDate(t.date)}</td>
              {/* status badge cell */}
              <td className={TD}>
                <StatusBadge status="Completed" />
              </td>
              {/* amount cell */}
              <td className={`${TD} text-right font-bold text-slate-800`}>
                {readableAmount(t.amount)}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      {/* Latest orders */}
      <Card
        className="mt-6"
        title="Latest Orders"
        action={
          // view all link
          <Link to="/admin/orders" className="text-xs font-semibold text-green-700 hover:underline">
            View All →
          </Link>
        }
      >
        {/* latest orders table */}
        <DataTable
          columns={LATEST_ORDER_COLUMNS}
          isEmpty={data.latestOrders.length === 0}
          emptyText="No orders yet."
        >
          {/* order rows */}
          {data.latestOrders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50">
              {/* order id cell */}
              <td className={`${TD} font-semibold text-blue-500`} title={order.id}>
                {shortId(order.id)}
              </td>
              {/* customer name cell */}
              <td className={`${TD} font-medium text-orange-500`}>{order.customer}</td>
              {/* date cell */}
              <td className={`${TD} text-slate-700`}>{formatDate(order.date)}</td>
              {/* amount cell */}
              <td className={`${TD} font-bold text-slate-800`}>{readableAmount(order.amount)}</td>
              {/* status badge cell */}
              <td className={TD}>
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      {/* Quick access */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-bold text-slate-800">
          Quick Access — All Management Systems
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* shortcut cards grid */}
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon; // icon for this shortcut
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* colored icon badge */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
                  <p className="truncate text-xs text-slate-600">{item.subtitle}</p>
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
