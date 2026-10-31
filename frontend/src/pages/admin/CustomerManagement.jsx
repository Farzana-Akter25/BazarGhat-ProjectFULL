import {
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  Search as SearchIcon,
  ShieldOff,
  UserCheck,
  Users,
} from "lucide-react"; // icons for stats, contact, actions
import { useMemo, useState } from "react";
import { Card, StatusBadge } from "../../components/admin/AdminUI"; // shared card wrapper + status pill
import CustomerOrderHistoryModal from "../../components/admin/CustomerOrderHistoryModal"; // per-customer history popup
import {
  useGetCustomersQuery,
  useToggleCustomerStatusMutation,
} from "../../features/admin/customerApi";
import { useGetOrdersQuery } from "../../features/admin/orderApi";
import { useGetReturnsQuery } from "../../features/admin/returnApi";
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import { TH } from "../../components/shared/DataTable"; // shared table header cell style

// status filter chip labels
const FILTERS = ["All", "Active", "Blocked"];

// Admin page listing customers, with block/unblock and order history
const CustomerManagement = () => {
  const { data: customers = [], isLoading } = useGetCustomersQuery(); // customer list from api
  const { data: orders = [] } = useGetOrdersQuery(); // all orders, filtered per customer below
  const { data: returns = [] } = useGetReturnsQuery(); // all returns, filtered per customer below
  const [toggleCustomerStatus] = useToggleCustomerStatusMutation(); // block/unblock mutation
  const [query, setQuery] = useState(""); // search text
  const [filter, setFilter] = useState("All"); // active status chip
  const [historyCustomer, setHistoryCustomer] = useState(null); // customer whose history modal is open

  // stat card counts
  const counts = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((c) => c.status === "Active").length,
      blocked: customers.filter((c) => c.status === "Blocked").length,
    }),
    [customers],
  );

  // customers matching search text + status filter
  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        // Keep customers matching the search text and status filter
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

  // block/unblock a customer
  const toggleBlock = (customer) => {
    toggleCustomerStatus({
      userId: customer.userId,
      status: customer.status === "Active" ? "Blocked" : "Active",
    });
  };


  // open the order/return history modal for a customer
  const viewCustomerHistory = (customer) => {
    setHistoryCustomer({ name: customer.name, phone: customer.phone });
  };

  // orders belonging to the customer whose history is open
  const customerHistoryOrders = useMemo(() => {
    if (!historyCustomer) return [];
    return orders.filter(
      (o) =>
        o.phone === historyCustomer.phone &&
        o.customer === historyCustomer.name,
    );
  }, [orders, historyCustomer]);

  // returns belonging to the customer whose history is open
  const customerHistoryReturns = useMemo(() => {
    if (!historyCustomer) return [];
    return returns.filter(
      (r) =>
        r.phone === historyCustomer.phone &&
        r.customer === historyCustomer.name,
    );
  }, [returns, historyCustomer]);

  return (
    <AdminLayout
      title="Customer Management"
      subtitle="View, manage, and block/unblock customers"
    >
      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* total customers card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Total Customers</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">
                {counts.total}
              </p>
            </div>
            {/* blue icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Users size={18} />
            </div>
          </div>
        </div>
        {/* active customers card */}
        <div className="rounded-2xl border border-green-200 bg-green-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Active Customers</p>
              <p className="mt-1 text-2xl font-extrabold text-green-700">
                {counts.active}
              </p>
            </div>
            {/* green icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
              <UserCheck size={18} />
            </div>
          </div>
        </div>
        {/* blocked customers card */}
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Blocked Customers</p>
              <p className="mt-1 text-2xl font-extrabold text-red-500">
                {counts.blocked}
              </p>
            </div>
            {/* red icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-500">
              <ShieldOff size={18} />
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        {/* search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* search input, grows to fill space */}
          <div className="relative flex-1">
            {/* search icon inside input */}
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by name, email, phone, or ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* status filter chips */}
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              // filter chip, green when active
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-green-700 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* customers table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              {/* table header row */}
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Customer</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Orders</th>
                <th className={TH}>Total Spent</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                // customer row
                <tr key={c.id} className="hover:bg-slate-50">
                  {/* name + id cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-600">{c.id}</p>
                  </td>
                  {/* email + phone cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <Mail size={12} /> {c.email}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Phone size={12} /> {c.phone}
                    </p>
                  </td>
                  {/* order count cell */}
                  <td className="px-3 py-3 break-words font-semibold text-slate-700">
                    {c.orders}
                  </td>
                  {/* total spent cell */}
                  <td className="px-3 py-3 break-words font-bold text-green-700">{c.spent}</td>
                  {/* status badge cell */}
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={c.status} />
                  </td>
                  {/* action buttons cell */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-2">
                      {/* view history button */}
                      <button
                        onClick={() => viewCustomerHistory(c)}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                      >
                        View
                      </button>
                      {c.status === "Active" ? (
                        // block button
                        <button
                          onClick={() => toggleBlock(c)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Ban size={12} />
                          Block
                        </button>
                      ) : (
                        // unblock button
                        <button
                          onClick={() => toggleBlock(c)}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle2 size={12} />
                          Unblock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                // loading row
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    Loading customers...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    No customers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* order history modal */}
      {historyCustomer && (
        <CustomerOrderHistoryModal
          customer={historyCustomer}
          orders={customerHistoryOrders}
          returns={customerHistoryReturns}
          onClose={() => setHistoryCustomer(null)}
        />
      )}
    </AdminLayout>
  );
};

export default CustomerManagement;
