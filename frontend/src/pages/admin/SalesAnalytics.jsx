import { Clock, DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users2 } from "lucide-react";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const STATS = [
  { label: "Total Revenue", value: "245,680TK", trend: "+12.5%", up: true, icon: DollarSign, bg: "bg-emerald-500" },
  { label: "Total Orders", value: "1,245", trend: "+8.2%", up: true, icon: ShoppingCart, bg: "bg-blue-500" },
  { label: "Products Sold", value: "3,842", trend: "+15.3%", up: true, icon: Clock, bg: "bg-orange-500" },
  { label: "New Customers", value: "156", trend: "-2.4%", up: false, icon: Users2, bg: "bg-purple-500" },
];

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 18500, orders: 145, pct: 72 },
  { month: "Feb", revenue: 22300, orders: 178, pct: 87 },
  { month: "Mar", revenue: 19800, orders: 162, pct: 77 },
  { month: "Apr", revenue: 25600, orders: 198, pct: 100 },
];

const TOP_CATEGORIES = [
  { rank: 1, name: "Groceries", pct: 45, revenue: "89100TK" },
  { rank: 2, name: "Fruits", pct: 38, revenue: "61250TK" },
  { rank: 3, name: "Vegetables", pct: 32, revenue: "45800TK" },
  { rank: 4, name: "Dairy", pct: 28, revenue: "38900TK" },
  { rank: 5, name: "Meat", pct: 25, revenue: "52400TK" },
];

const TRANSACTIONS = [
  { id: "TXN-001", customer: "Rakib Hasan", date: "2026-04-12 14:30", amount: "1050TK" },
  { id: "TXN-002", customer: "Mohedi Islam", date: "2026-04-12 13:15", amount: "750TK" },
  { id: "TXN-003", customer: "Tasnia Ahmed", date: "2026-04-12 11:45", amount: "1200TK" },
  { id: "TXN-004", customer: "Fahim Rahman", date: "2026-04-11 16:20", amount: "850TK" },
  { id: "TXN-005", customer: "Sadia Khatun", date: "2026-04-11 15:00", amount: "650TK" },
];

const SalesAnalytics = () => {
  return (
    <AdminLayout title="Sales Analytics" subtitle="Track your sales performance and revenue">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          const Trend = s.up ? TrendingUp : TrendingDown;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${
                    s.up ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  <Trend size={13} />
                  {s.trend}
                </span>
              </div>
              <p className="mt-4 text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Monthly Revenue"
          action={
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-500">
              Last 4 Months
            </span>
          }
        >
          <div className="space-y-5">
            {MONTHLY_REVENUE.map((m) => (
              <div key={m.month}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-slate-600">{m.month}</span>
                  <span className="font-bold text-slate-800">
                    {m.revenue.toLocaleString()}TK{" "}
                    <span className="font-normal text-slate-400">({m.orders} orders)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-400"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-400">Average Order Value</p>
              <p className="text-lg font-extrabold text-slate-800">127TK</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Revenue</p>
              <p className="text-lg font-extrabold text-emerald-500">86,200TK</p>
            </div>
          </div>
        </Card>

        <Card title="Top Categories">
          <div className="space-y-5">
            {TOP_CATEGORIES.map((c) => (
              <div key={c.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    {c.name} <span className="text-slate-300">#{c.rank}</span>
                  </span>
                  <span className="text-xs text-slate-400">{c.pct}% of sales</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${c.pct}%` }} />
                </div>
                <p className="mt-1 text-right text-xs font-semibold text-slate-500">{c.revenue}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6" title="Recent Transactions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Transaction ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TRANSACTIONS.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 font-semibold text-blue-500">{t.id}</td>
                  <td className="py-3 font-medium text-orange-500">{t.customer}</td>
                  <td className="py-3 text-slate-500">{t.date}</td>
                  <td className="py-3">
                    <StatusBadge status="Completed" />
                  </td>
                  <td className="py-3 text-right font-bold text-slate-800">{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
};

export default SalesAnalytics;
