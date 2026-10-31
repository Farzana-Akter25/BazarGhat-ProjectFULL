import {
  Calendar,
  Percent,
  Search as SearchIcon,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGetAdminProductsQuery } from "../../features/admin/productApi";

// default empty form state
const emptyForm = {
  name: "", // sale name field
  discount_type: "percentage", // percentage or fixed
  discount_value: "", // amount off
  start_at: "", // sale start datetime
  end_at: "", // sale end datetime
  status: "Active", // active/inactive toggle
  product_ids: [], // selected product ids
};

// format date for datetime-local input
const toDatetimeLocalValue = (value) => {
  if (!value) return ""; // nothing to format
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return ""; // invalid date guard
  const pad = (n) => n.toString().padStart(2, "0"); // zero-pad helper
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Popup form for creating or editing a flash sale
const FlashSaleFormModal = ({ mode = "add", flashSale, onClose, onSubmit }) => {
  const { data: products = [] } = useGetAdminProductsQuery(); // full product list for picker
  const [form, setForm] = useState(emptyForm); // form field state
  const [search, setSearch] = useState(""); // product search text
  const [error, setError] = useState(""); // validation error message

  // prefill form when editing
  useEffect(() => {
    if (mode === "edit" && flashSale) {
      setForm({
        name: flashSale.name || "",
        discount_type: flashSale.discount_type || "percentage",
        discount_value: flashSale.discount_value ?? "",
        start_at: toDatetimeLocalValue(flashSale.start_at),
        end_at: toDatetimeLocalValue(flashSale.end_at),
        status: flashSale.status || "Active",
        product_ids: (flashSale.products || []).map((p) => p.id),
      });
    } else {
      setForm(emptyForm); // reset for add mode
    }
    setError(""); // clear old error on open
  }, [mode, flashSale]);

  // filter product list by search
  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  // toggle product selection
  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter((pid) => pid !== id) // remove if already selected
        : [...f.product_ids, id], // add if not selected
    }));
  };

  const discountValue = Number(form.discount_value) || 0; // numeric discount for validation

  // Mirrors the server's calculation so the admin sees the resulting price before saving.
  const previewSalePrice = (normalPrice) => {
    // Sale price after a percentage or fixed discount
    const price =
      form.discount_type === "percentage"
        ? Math.round(normalPrice - (normalPrice * discountValue) / 100)
        : Math.round(normalPrice - discountValue);
    return price;
  };

  // products chosen so far, with their resulting flash sale price
  const selectedPreview = useMemo(
    () =>
      products
        .filter((p) => form.product_ids.includes(p.id))
        .map((p) => ({
          ...p,
          salePrice: previewSalePrice(Number(p.price) || 0),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, form.product_ids, form.discount_type, discountValue],
  );

  const invalidPreview = selectedPreview.filter((p) => p.salePrice < 0); // discount exceeds price

  // validate fields and submit
  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Flash sale name is required.");
      return;
    }
    if (!discountValue || discountValue <= 0) {
      setError("Please enter a valid discount value.");
      return;
    }
    if (form.discount_type === "percentage" && discountValue > 100) {
      setError("Percentage discount cannot exceed 100.");
      return;
    }
    if (!form.start_at || !form.end_at) {
      setError("Please choose start and end date/time.");
      return;
    }
    if (new Date(form.end_at) <= new Date(form.start_at)) {
      setError("End time must be after start time.");
      return;
    }
    if (form.product_ids.length === 0) {
      setError("Select at least one product.");
      return;
    }
    if (invalidPreview.length > 0) {
      setError(
        `Discount exceeds the price of: ${invalidPreview.map((p) => p.name).join(", ")}.`,
      );
      return;
    }

    setError(""); // clear error before submitting
    onSubmit({
      name: form.name.trim(),
      discount_type: form.discount_type,
      discount_value: discountValue,
      start_at: form.start_at,
      end_at: form.end_at,
      status: form.status,
      product_ids: form.product_ids,
    });
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal card */}
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            {/* modal title, changes with mode */}
            <h2 className="text-lg font-black text-slate-900">
              {mode === "add" ? "Create Flash Sale" : "Edit Flash Sale"}
            </h2>
            {/* modal subtitle */}
            <p className="text-xs text-slate-600">
              {mode === "add"
                ? "Set up a new time-boxed flash sale"
                : "Update flash sale details"}
            </p>
          </div>
          {/* close button */}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* form fields */}
        <div className="space-y-5 px-6 py-5">
          {/* sale name input */}
          <div>
            {/* field label with tag icon */}
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <Tag size={12} /> Flash Sale Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekend Mega Sale"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
            />
          </div>

          {/* start/end date pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              {/* start date label */}
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <Calendar size={12} /> Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_at: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              {/* end date label */}
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <Calendar size={12} /> End Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_at: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* discount type, value, status */}
          <div className="grid grid-cols-3 gap-3">
            {/* discount type select */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Discount Type
              </label>
              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_type: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            {/* discount value input */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                {/* icon swaps based on discount type */}
                {form.discount_type === "percentage" ? (
                  <Percent size={11} />
                ) : (
                  <Wallet size={11} />
                )}
                Discount Value
              </label>
              <input
                type="number"
                min="1"
                max={form.discount_type === "percentage" ? 100 : undefined}
                value={form.discount_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_value: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            {/* status select */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* product picker */}
          <div>
            {/* selected count label */}
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Products ({form.product_ids.length} selected)
              </label>
            </div>
            {/* product search box */}
            <div className="relative mb-2">
              {/* search icon inside input */}
              <SearchIcon
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-orange-400 focus:bg-white"
              />
            </div>
            {/* product checkbox list */}
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
              {/* no results message */}
              {filteredProducts.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-600">
                  No products found please add one.
                </p>
              )}
              {/* one row per product */}
              {filteredProducts.map((p) => {
                const selected = form.product_ids.includes(p.id);
                const salePrice = previewSalePrice(Number(p.price) || 0);

                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {/* selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(p.id)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    {/* product name */}
                    <span className="flex-1 truncate text-slate-700">
                      {p.name}
                    </span>
                    {/* normal price, and what it becomes once selected */}
                    <span className="shrink-0 text-xs font-semibold text-slate-600">
                      {selected && discountValue > 0 ? (
                        <>
                          <span className="line-through">{p.price}TK</span>{" "}
                          <span
                            className={
                              salePrice < 0 ? "text-red-500" : "text-green-700"
                            }
                          >
                            {salePrice}TK
                          </span>
                        </>
                      ) : (
                        <>{p.price}TK</>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* what this sale will charge, before saving */}
            {selectedPreview.length > 0 && discountValue > 0 && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Resulting flash sale prices
                </p>
                <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
                  {selectedPreview.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-slate-600">{p.name}</span>
                      <span className="shrink-0 font-semibold">
                        <span className="text-slate-600 line-through">
                          ৳{p.price}
                        </span>{" "}
                        <span
                          className={
                            p.salePrice < 0 ? "text-red-500" : "text-green-700"
                          }
                        >
                          ৳{p.salePrice}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-slate-600">
                  Normal selling prices stay unchanged — these apply only
                  between the start and end times.
                </p>
              </div>
            )}
          </div>

          {/* validation error */}
          {error && (
            <p className="text-xs font-semibold text-red-500">{error}</p>
          )}
        </div>

        {/* footer actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          {/* cancel button */}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          {/* submit button, label changes with mode */}
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            {mode === "add" ? "Create Flash Sale" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashSaleFormModal;
