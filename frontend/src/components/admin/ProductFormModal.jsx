import { Image as ImageIcon, Link2, Package, Percent, Upload, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORIES = ["Organic", "Grocery"];
const UNITS = ["kg", "g", "500g", "1kg", "1L", "500ml", "pack", "piece"];

const emptyForm = {
  imageUrl: "",
  name: "",
  category: CATEGORIES[0],
  unit: UNITS[0],
  price: "",
  discount: "",
  stock: "",
};

const ProductFormModal = ({ mode = "add", product, onClose, onSubmit }) => {
  const [imageMode, setImageMode] = useState("url");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "edit" && product) {
      setForm({
        imageUrl: product.imageUrl || "",
        name: product.name || "",
        category: product.category || CATEGORIES[0],
        unit: product.unit || UNITS[0],
        price: product.original ?? product.price ?? "",
        discount: product.discount || "",
        stock: product.stock ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
  }, [mode, product]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, imageUrl: url }));
  };

  const price = Number(form.price) || 0;
  const discount = Number(form.discount) || 0;
  const finalPrice = Math.round(price - (price * discount) / 100);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.price || price <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    const stockNum = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stockNum) || stockNum <= 0) {
      setError("Stock quantity cannot be 0 or negative.");
      return;
    }
    setError("");
    onSubmit({
      imageUrl: form.imageUrl,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      price: finalPrice,
      original: discount > 0 ? price : null,
      discount,
      stock: stockNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {mode === "add" ? "Add Product" : "Edit Product"}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === "add" ? "Create a new product" : "Update product details"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <ImageIcon size={12} /> Product Image
            </p>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  imageMode === "url" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Link2 size={13} />
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setImageMode("file")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  imageMode === "file" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Upload size={13} />
                Upload File
              </button>
            </div>

            {imageMode === "url" ? (
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://images.example.com/photo.jpg"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white"
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
            )}

            <div className="mt-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Product preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={32} className="text-slate-300" />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <Package size={12} /> Product Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Fresh Organic Apple"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Wallet size={11} /> Price (TK)
              </label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Percent size={11} /> Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Stock Qty
              </label>
              <input
                type="number"
                min="1"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {price > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3">
              <Percent size={16} className="text-orange-400" />
              {discount > 0 && <span className="text-sm text-slate-300 line-through">{price}TK</span>}
              <span className="text-lg font-extrabold text-orange-600">{finalPrice}TK</span>
              {discount > 0 && (
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white">
                  {discount}% OFF
                </span>
              )}
            </div>
          )}

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
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

export default ProductFormModal;
