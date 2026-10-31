import { Search as SearchIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetCustomersQuery } from "../../features/admin/customerApi";

// default empty form state
const emptyForm = {
  coupon_code: "", // code the customer types at checkout
  campaign_name: "", // internal name for the campaign
  coupon_type: "fixed_discount", // free_delivery | fixed_discount | percentage_discount
  discount_value: "", // taka off, or percent off
  max_discount: "", // ceiling for a percentage coupon
  minimum_order: "", // cart must be at least this
  start_date: "", // campaign start (inclusive)
  expiry_date: "", // campaign end (inclusive)
  usage_limit: "", // total uses across all customers
  per_user_limit: "1", // uses per customer
  first_order_only: false, // only on a customer's first order
  min_completed_orders: "", // loyalty: delivered orders so far
  min_total_spent: "", // loyalty: taka spent so far
  audience: "all", // all customers who meet the rules, or only selected ones
  customer_ids: [], // hand-picked customers
  status: "active", // active/inactive
};

// shared input styles
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600";

// number fields go to the server as numbers, blanks as null
const numOrNull = (value) => (value === "" || value === null ? null : Number(value));

// form state for a coupon being edited (the modal remounts each time it opens)
const formFromCoupon = (coupon) => ({
  coupon_code: coupon.coupon_code || "",
  campaign_name: coupon.campaign_name || "",
  coupon_type: coupon.coupon_type || "fixed_discount",
  discount_value: coupon.discount_value ?? "",
  max_discount: coupon.max_discount ?? "",
  minimum_order: coupon.minimum_order ?? "",
  start_date: coupon.start_date || "",
  expiry_date: coupon.expiry_date || "",
  usage_limit: coupon.usage_limit ?? "",
  per_user_limit: coupon.per_user_limit ?? "",
  first_order_only: Boolean(coupon.first_order_only),
  min_completed_orders: coupon.min_completed_orders ?? "",
  min_total_spent: coupon.min_total_spent ?? "",
  audience: coupon.audience === "selected" ? "selected" : "all",
  customer_ids: (coupon.customers || []).map((c) => c.id),
  status: coupon.status || "active",
});

// Popup form for creating or editing a coupon
const CouponFormModal = ({ mode = "add", coupon, onClose, onSubmit, saving }) => {
  const { data: customers = [] } = useGetCustomersQuery(); // customer list for the picker
  const [form, setForm] = useState(() =>
    mode === "edit" && coupon ? formFromCoupon(coupon) : emptyForm,
  ); // form field state
  const [search, setSearch] = useState(""); // customer search text
  const [error, setError] = useState(""); // validation error message

  // update one field
  const set = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  // filter customer list by name, email or phone
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [customers, search]);

  // toggle customer selection
  const toggleCustomer = (id) => {
    setForm((f) => ({
      ...f,
      customer_ids: f.customer_ids.includes(id)
        ? f.customer_ids.filter((cid) => cid !== id)
        : [...f.customer_ids, id],
    }));
  };

  const isPercentage = form.coupon_type === "percentage_discount";
  const needsValue = form.coupon_type !== "free_delivery";

  // validate fields and submit
  const handleSubmit = () => {
    const code = form.coupon_code.trim().toUpperCase();
    const value = Number(form.discount_value);

    if (!code) return setError("Coupon code is required.");
    if (!/^[A-Z0-9_-]+$/.test(code))
      return setError("Use only letters, numbers, - and _ in the coupon code.");
    if (needsValue && (!value || value <= 0))
      return setError("Please enter a valid discount value.");
    if (isPercentage && value > 100)
      return setError("A percentage discount cannot be more than 100.");
    if (form.start_date && form.expiry_date && form.expiry_date < form.start_date)
      return setError("Expiry date must be on or after the start date.");
    if (form.audience === "selected" && form.customer_ids.length === 0)
      return setError("Pick at least one customer for this coupon.");

    setError("");
    onSubmit({
      coupon_code: code,
      campaign_name: form.campaign_name.trim() || null,
      coupon_type: form.coupon_type,
      discount_value: needsValue ? value : null,
      max_discount: isPercentage ? numOrNull(form.max_discount) : null,
      minimum_order: numOrNull(form.minimum_order),
      start_date: form.start_date || null,
      expiry_date: form.expiry_date || null,
      usage_limit: numOrNull(form.usage_limit),
      per_user_limit: numOrNull(form.per_user_limit),
      first_order_only: form.first_order_only,
      min_completed_orders: numOrNull(form.min_completed_orders),
      min_total_spent: numOrNull(form.min_total_spent),
      audience: form.audience,
      customer_ids: form.audience === "selected" ? form.customer_ids : undefined,
      status: form.status,
    });
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal card */}
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {mode === "add" ? "Create Coupon" : "Edit Coupon"}
            </h2>
            <p className="text-xs text-slate-600">
              Give it to chosen customers, or to anyone whose shopping matches the rules
            </p>
          </div>
          {/* close button */}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* basics */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Coupon</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Coupon Code</label>
                <input
                  value={form.coupon_code}
                  onChange={set("coupon_code")}
                  placeholder="e.g. EID100"
                  className={`${INPUT} uppercase`}
                />
              </div>
              <div>
                <label className={LABEL}>Campaign Name</label>
                <input
                  value={form.campaign_name}
                  onChange={set("campaign_name")}
                  placeholder="e.g. Eid special"
                  className={INPUT}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Type</label>
                <select value={form.coupon_type} onChange={set("coupon_type")} className={INPUT}>
                  <option value="fixed_discount">Fixed amount (৳ off)</option>
                  <option value="percentage_discount">Percentage (% off)</option>
                  <option value="free_delivery">Free delivery</option>
                </select>
              </div>
              {needsValue && (
                <div>
                  <label className={LABEL}>{isPercentage ? "Discount (%)" : "Discount (৳)"}</label>
                  <input
                    type="number"
                    min="1"
                    max={isPercentage ? 100 : undefined}
                    value={form.discount_value}
                    onChange={set("discount_value")}
                    className={INPUT}
                  />
                </div>
              )}
              {isPercentage && (
                <div>
                  <label className={LABEL}>Max Discount (৳)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_discount}
                    onChange={set("max_discount")}
                    placeholder="No limit"
                    className={INPUT}
                  />
                </div>
              )}
            </div>
          </section>

          {/* who gets it */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Who can use it</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["all", "Any customer who meets the rules", "Shown automatically at checkout when their cart and history match"],
                ["selected", "Only selected customers", "Pick customers by hand — they get a notification with the code"],
              ].map(([value, title, hint]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-3 ${
                    form.audience === value ? "border-orange-400 bg-orange-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={value}
                    checked={form.audience === value}
                    onChange={set("audience")}
                    className="mr-2 accent-orange-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">{title}</span>
                  <p className="mt-1 text-xs text-slate-600">{hint}</p>
                </label>
              ))}
            </div>

            {form.audience === "selected" && (
              // customer picker
              <div>
                <p className={LABEL}>Customers ({form.customer_ids.length} selected)</p>
                <div className="relative mb-2">
                  <SearchIcon
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email or phone..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-orange-400 focus:bg-white"
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
                  {filteredCustomers.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-600">No customers found.</p>
                  )}
                  {filteredCustomers.map((c) => (
                    <label
                      key={c.userId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.customer_ids.includes(c.userId)}
                        onChange={() => toggleCustomer(c.userId)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-800">{c.name}</span>
                        <span className="block truncate text-xs text-slate-600">
                          {c.phone || c.email}
                        </span>
                      </span>
                      {/* order history helps the admin choose */}
                      <span className="shrink-0 text-right text-xs text-slate-600">
                        {c.orders} orders
                        <br />
                        {c.spent}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* rules */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Rules</h3>
              <p className="text-xs text-slate-600">
                Leave a field empty to skip that rule. A customer must pass every rule you set.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Min Cart Amount (৳)</label>
                <input type="number" min="0" value={form.minimum_order} onChange={set("minimum_order")} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Min Past Orders</label>
                <input
                  type="number"
                  min="1"
                  value={form.min_completed_orders}
                  onChange={set("min_completed_orders")}
                  placeholder="Delivered orders"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Min Total Spent (৳)</label>
                <input
                  type="number"
                  min="1"
                  value={form.min_total_spent}
                  onChange={set("min_total_spent")}
                  placeholder="On delivered orders"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Start Date</label>
                <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={set("expiry_date")} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select value={form.status} onChange={set("status")} className={INPUT}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Total Usage Limit</label>
                <input
                  type="number"
                  min="1"
                  value={form.usage_limit}
                  onChange={set("usage_limit")}
                  placeholder="Unlimited"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Uses per Customer</label>
                <input
                  type="number"
                  min="1"
                  value={form.per_user_limit}
                  onChange={set("per_user_limit")}
                  placeholder="Unlimited"
                  className={INPUT}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.first_order_only}
                  onChange={set("first_order_only")}
                  className="h-4 w-4 accent-orange-500"
                />
                First order only
              </label>
            </div>
          </section>

          {/* validation error */}
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        </div>

        {/* footer actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : mode === "add" ? "Create Coupon" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouponFormModal;
