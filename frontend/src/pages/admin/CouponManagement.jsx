import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  Search as SearchIcon,
  TicketPercent,
  Trash2,
  Users,
} from "lucide-react"; // icons for pagination, coupon badge and row actions
import { useState } from "react";
import notify from "../../utils/notify"; // shared toast notifications
import { Card, StatCard } from "../../components/admin/AdminUI"; // shared card wrapper + stat card
import CouponFormModal from "../../components/admin/CouponFormModal"; // add/edit form modal
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import { TH } from "../../components/shared/DataTable"; // shared table header cell style
import {
  useAddCouponMutation,
  useDeleteCouponMutation,
  useGetAdminCouponsQuery,
  useToggleCouponStatusMutation,
  useUpdateCouponMutation,
} from "../../features/admin/couponApi";

// coupon type key -> label shown in the table
const TYPE_LABELS = {
  free_delivery: "Free Delivery",
  fixed_discount: "Fixed Amount",
  percentage_discount: "Percentage",
};

// small colored pill showing coupon status
const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
    }`}
  >
    {status === "active" ? "Active" : "Inactive"}
  </span>
);

// what the coupon takes off the order
const describeDiscount = (coupon) => {
  if (coupon.coupon_type === "fixed_discount") return `৳${coupon.discount_value} off`;
  if (coupon.coupon_type === "percentage_discount")
    return `${coupon.discount_value}% off${coupon.max_discount ? ` (max ৳${coupon.max_discount})` : ""}`;
  return "Free delivery";
};

// the rules a customer has to pass, as short tags
const describeRules = (coupon) => {
  const rules = [];
  if (coupon.minimum_order) rules.push(`Cart ৳${coupon.minimum_order}+`);
  if (coupon.first_order_only) rules.push("First order");
  if (coupon.min_completed_orders) rules.push(`${coupon.min_completed_orders}+ past orders`);
  if (coupon.min_total_spent) rules.push(`Spent ৳${coupon.min_total_spent}+`);
  if (coupon.start_date) rules.push(`From ${coupon.start_date}`);
  if (coupon.expiry_date) rules.push(`Until ${coupon.expiry_date}`);
  if (coupon.usage_limit) rules.push(`${coupon.total_uses}/${coupon.usage_limit} uses`);
  if (coupon.per_user_limit) rules.push(`${coupon.per_user_limit}× per customer`);
  return rules;
};

// Admin page listing coupons, with create/edit and per-customer or rule-based targeting
const CouponManagement = () => {
  const [search, setSearch] = useState(""); // search text
  const [page, setPage] = useState(1); // current page number
  const [modal, setModal] = useState(null); // { mode: "add" | "edit", coupon? }
  // Load the current page of coupons
  const { data, isLoading } = useGetAdminCouponsQuery({
    search: search || undefined,
    page,
    per_page: 10,
  }); // coupon list from api, paginated
  const [addCoupon, { isLoading: isAdding }] = useAddCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [toggleStatus] = useToggleCouponStatusMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const coupons = data?.coupons || []; // current page of coupons
  const meta = data?.meta; // pagination info
  const counts = data?.counts || {}; // whole-table counts for the stat cards

  // submit add or edit form from modal
  const handleSubmit = async (payload) => {
    const result =
      modal.mode === "edit"
        ? await updateCoupon({ id: modal.coupon.id, ...payload })
        : await addCoupon(payload);

    if (result.error) {
      notify.apiError(result.error, modal.mode === "edit" ? "Couldn’t update coupon" : "Couldn’t create coupon");
      return;
    }

    notify.success(modal.mode === "edit" ? "Coupon updated" : "Coupon created");
    setModal(null);
  };

  // switch a coupon on or off
  const handleToggle = async (coupon) => {
    const status = coupon.status === "active" ? "inactive" : "active";
    const result = await toggleStatus({ id: coupon.id, status });
    if (result.error) notify.apiError(result.error, "Couldn’t change coupon status");
  };

  // delete a coupon after confirm
  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.coupon_code}? This cannot be undone.`)) return;
    const result = await deleteCoupon(coupon.id);
    if (result.error) notify.apiError(result.error, "Couldn’t delete coupon");
    else notify.success("Coupon deleted");
  };

  return (
    <AdminLayout
      title="Coupon Management"
      subtitle={`${counts.total ?? 0} coupons · Give coupons to chosen customers or set rules for who gets them`}
    >
      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TicketPercent} iconBg="bg-orange-500" label="Total Coupons" value={counts.total ?? 0} />
        <StatCard icon={TicketPercent} iconBg="bg-green-700" label="Active" value={counts.active ?? 0} />
        <StatCard icon={TicketPercent} iconBg="bg-red-500" label="Inactive" value={counts.inactive ?? 0} />
        <StatCard icon={Users} iconBg="bg-blue-500" label="Customer-Specific" value={counts.selected ?? 0} />
      </div>

      <Card className="mt-6">
        {/* search box + create button */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // reset to first page on new search
              }}
              type="text"
              placeholder="Search coupons..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white"
            />
          </div>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus size={16} /> Create Coupon
          </button>
        </div>

        {/* coupons table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Coupon</th>
                <th className={TH}>Discount</th>
                <th className={TH}>Who</th>
                <th className={TH}>Rules</th>
                <th className={TH}>Users Used</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => {
                const rules = describeRules(coupon);
                const isSystem = coupon.generated_by === "System";

                return (
                  <tr key={coupon.id}>
                    {/* code + campaign cell */}
                    <td className="px-3 py-3 break-words">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                          <TicketPercent size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{coupon.coupon_code}</p>
                          <p className="text-xs text-slate-600">
                            {coupon.campaign_name || "-"} · {coupon.generated_by}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* discount value cell */}
                    <td className="px-3 py-3">
                      <span className="whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                        {describeDiscount(coupon)}
                      </span>
                      <p className="mt-1 text-xs text-slate-600">{TYPE_LABELS[coupon.coupon_type]}</p>
                    </td>
                    {/* audience cell */}
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {coupon.audience === "selected" && !isSystem ? (
                        <span title={coupon.customers.map((c) => c.name).join(", ")}>
                          <span className="font-semibold">{coupon.customers.length} selected</span>
                          <br />
                          <span className="text-slate-600">
                            {coupon.customers.slice(0, 2).map((c) => c.name).join(", ")}
                            {coupon.customers.length > 2 ? "…" : ""}
                          </span>
                        </span>
                      ) : (
                        "All customers"
                      )}
                    </td>
                    {/* rules cell */}
                    <td className="px-3 py-3">
                      {rules.length === 0 ? (
                        <span className="text-xs text-slate-600">No rules</span>
                      ) : (
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {rules.map((rule) => (
                            <span key={rule} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                              {rule}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* how many customers have used this coupon */}
                    <td className="px-3 py-3">
                      <span className="font-bold text-slate-800">{coupon.used_count}</span>
                      <span className="ml-1 text-xs text-slate-600">
                        {coupon.used_count === 1 ? "user" : "users"}
                      </span>
                    </td>
                    {/* status badge cell */}
                    <td className="px-3 py-3">
                      <StatusBadge status={coupon.status} />
                    </td>
                    {/* row actions — system coupons can only be switched on/off */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(coupon)}
                          title={coupon.status === "active" ? "Deactivate" : "Activate"}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Power size={15} />
                        </button>
                        {!isSystem && (
                          <>
                            <button
                              onClick={() => setModal({ mode: "edit", coupon })}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600">
                    Loading coupons...
                  </td>
                </tr>
              )}
              {!isLoading && coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600">
                    No coupons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination controls */}
        {meta && meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {modal && (
        <CouponFormModal
          mode={modal.mode}
          coupon={modal.coupon}
          saving={isAdding || isUpdating}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
};

export default CouponManagement;
