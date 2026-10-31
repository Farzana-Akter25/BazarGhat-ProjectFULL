import { Image as ImageIcon, Package, Percent, Trash2, Wallet, X } from "lucide-react"; // form field icons
import { useEffect, useState } from "react";

const CATEGORIES = ["Organic", "Grocery"]; // category dropdown options
const UNIT_TYPES = ["g", "kg", "L", "ml", "piece", "pack", "Other"]; // unit dropdown options

// default form state
const emptyForm = {
  imageUrl: "", // preview/selected image url
  name: "", // product name
  category: CATEGORIES[0], // default category
  unitQty: "", // unit quantity number
  unitType: UNIT_TYPES[0], // unit type dropdown value
  unitCustom: "", // custom unit label when "Other"
  price: "", // base price
  discount: "", // discount percent
  stock: "", // stock quantity
};

// Best-effort split of a stored unit string like "500g" or "2 kg" back into qty + type so the number+dropdown inputs prefill sensibly when editing an existing product.
const parseUnit = (unit) => {
  const match = String(unit || "").trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/); // split leading number from unit text
  if (!match) {
    return { unitQty: "1", unitType: "Other", unitCustom: unit || "" }; // fallback when unparseable
  }
  // Split "500 gm" into quantity and a known unit type
  const [, qty, rest] = match;
  const type = UNIT_TYPES.find((u) => u.toLowerCase() === rest.trim().toLowerCase()); // match known unit type
  return type
    ? { unitQty: qty, unitType: type, unitCustom: "" } // known unit
    : { unitQty: qty, unitType: "Other", unitCustom: rest.trim() }; // custom unit
};

// Popup form for adding or editing a product
const ProductFormModal = ({ mode = "add", product, onClose, onSubmit, submitError }) => {
  const [form, setForm] = useState(emptyForm); // all form field values
  const [imageFile, setImageFile] = useState(null); // selected file object, for upload
  const [error, setError] = useState(""); // client-side validation message

  // preload form when editing an existing product
  useEffect(() => {
    if (mode === "edit" && product) {
      setForm({
        imageUrl: product.image || "",
        name: product.name || "",
        category: product.category || CATEGORIES[0],
        ...parseUnit(product.unit), // split unit string back into qty + type
        price: product.original ?? product.price ?? "",
        discount: product.discount || "",
        stock: product.stock ?? "",
      });
    } else {
      setForm(emptyForm); // reset for add mode
    }
    setImageFile(null);
    setError("");
  }, [mode, product]);

  // handles image file selection
  const handleFile = (e) => {
    const file = e.target.files?.[0]; // picked file
    if (!file) return;
    setImageFile(file);
    setForm((f) => ({ ...f, imageUrl: URL.createObjectURL(file) })); // local preview url
  };

  // clears selected/preview image
  const removeImage = () => {
    setImageFile(null);
    setForm((f) => ({ ...f, imageUrl: "" }));
  };

  const price = Number(form.price) || 0; // numeric price
  const discount = Number(form.discount) || 0; // numeric discount percent
  const finalPrice = Math.round(price - (price * discount) / 100); // price after discount

  // validates fields then calls onSubmit
  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.imageUrl) {
      setError("Product image is required.");
      return;
    }
    if (!form.price || price <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    // Unit quantity must be a positive number
    const unitQtyNum = Number(form.unitQty);
    if (!form.unitQty || Number.isNaN(unitQtyNum) || unitQtyNum <= 0) {
      setError("Please enter a valid unit quantity.");
      return;
    }
    if (form.unitType === "Other" && !form.unitCustom.trim()) {
      setError("Please enter a custom unit label.");
      return;
    }
    // Stock must be a positive number
    const stockNum = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stockNum) || stockNum <= 0) {
      setError("Stock quantity cannot be 0 or negative.");
      return;
    }
    setError("");
    // build the final unit string, custom label or qty+type
    const unit =
      form.unitType === "Other" ? `${form.unitQty} ${form.unitCustom.trim()}` : `${form.unitQty}${form.unitType}`;
    onSubmit({
      imageUrl: imageFile ? null : form.imageUrl, // send url only if no new file
      imageFile, // new file to upload, if any
      name: form.name.trim(),
      category: form.category,
      unit,
      price: finalPrice, // discounted price
      original: discount > 0 ? Math.round(price) : null, // pre-discount price
      discount,
      stock: stockNum,
    });
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal card */}
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            {/* modal title, changes with mode */}
            <h2 className="text-lg font-black text-slate-900">
              {mode === "add" ? "Add Product" : "Edit Product"}
            </h2>
            {/* modal subtitle */}
            <p className="text-xs text-slate-600">
              {mode === "add" ? "Create a new product" : "Update product details"}
            </p>
          </div>
          {/* close modal button */}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* form fields */}
        <div className="space-y-5 px-6 py-5">
          {/* image upload */}
          <div>
            {/* field label */}
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <ImageIcon size={12} /> Product Image
            </p>
            {/* file picker input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />

            {/* image preview box */}
            <div className="relative mt-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {form.imageUrl ? (
                <>
                  {/* selected image preview */}
                  <img src={form.imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                  {/* remove image button */}
                  <button
                    type="button"
                    onClick={removeImage}
                    title="Remove image"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              ) : (
                // empty state placeholder icon
                <ImageIcon size={32} className="text-slate-500" />
              )}
            </div>
          </div>

          {/* product name field */}
          <div>
            {/* field label */}
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <Package size={12} /> Product Name
            </label>
            {/* name input */}
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Fresh Organic Apple"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>

          {/* category and unit fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* category dropdown */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
              >
                {CATEGORIES.map((c) => (
                  // category option
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {/* unit qty + type fields */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Unit
              </label>
              <div className="flex gap-2">
                {/* unit quantity number input */}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitQty}
                  onChange={(e) => setForm((f) => ({ ...f, unitQty: e.target.value }))}
                  placeholder="2"
                  className="w-1/2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                />
                {/* unit type dropdown */}
                <select
                  value={form.unitType}
                  onChange={(e) => setForm((f) => ({ ...f, unitType: e.target.value }))}
                  className="w-1/2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                >
                  {UNIT_TYPES.map((u) => (
                    // unit type option
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              {/* custom unit label, only when "Other" selected */}
              {form.unitType === "Other" && (
                <input
                  type="text"
                  value={form.unitCustom}
                  onChange={(e) => setForm((f) => ({ ...f, unitCustom: e.target.value }))}
                  placeholder="e.g. dozen, bundle"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                />
              )}
            </div>
          </div>

          {/* price, discount, stock fields */}
          <div className="grid grid-cols-3 gap-3">
            {/* price field */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <Wallet size={11} /> Price (TK)
              </label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
              />
            </div>
            {/* discount field */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <Percent size={11} /> Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
              />
            </div>
            {/* stock qty field */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Stock Qty
              </label>
              <input
                type="number"
                min="1"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
              />
            </div>
          </div>

          {/* price preview, only if price entered */}
          {price > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3">
              <Percent size={16} className="text-orange-400" />
              {/* original price, struck through if discounted */}
              {discount > 0 && <span className="text-sm text-slate-600 line-through">{price}TK</span>}
              {/* final discounted price */}
              <span className="text-lg font-extrabold text-orange-600">{finalPrice}TK</span>
              {/* discount percent badge */}
              {discount > 0 && (
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white">
                  {discount}% OFF
                </span>
              )}
            </div>
          )}

          {/* validation/submit error message */}
          {(error || submitError) && (
            <p className="text-xs font-semibold text-red-500">{error || submitError}</p>
          )}
        </div>

        {/* modal footer buttons */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          {/* cancel button */}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          {/* submit button, label depends on mode */}
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            {mode === "add" ? "Add Product" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal; // add/edit product modal, used from admin products page
