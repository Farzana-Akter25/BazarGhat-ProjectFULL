import {
  AlertTriangle,
  Apple,
  Box,
  CheckCircle2,
  Edit2,
  Eye,
  Plus,
  Search as SearchIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import ProductFormModal from "../../components/admin/ProductFormModal";
import AdminLayout from "../../layouts/AdminLayout";

const deriveStatus = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return "Low Stock";
  return "Active";
};

const INITIAL_PRODUCTS = [
  { id: 1, name: "Fresh Organic Apple", unit: "1kg", category: "Organic", price: 225, original: 250, discount: 12, stock: 145 },
  { id: 2, name: "Basmati Rice 5kg", unit: "5kg pack", category: "Grocery", price: 450, original: null, discount: 0, stock: 89 },
  { id: 3, name: "Fresh Vegetables Mix", unit: "1kg", category: "Grocery", price: 171, original: 180, discount: 5, stock: 234 },
  { id: 4, name: "Pure Honey 500g", unit: "500g", category: "Organic", price: 350, original: null, discount: 0, stock: 67 },
  { id: 5, name: "Fresh Chicken 1kg", unit: "1kg", category: "Grocery", price: 238, original: 280, discount: 15, stock: 12 },
  { id: 6, name: "Full Cream Milk 1L", unit: "1L", category: "Grocery", price: 85, original: null, discount: 0, stock: 0 },
  { id: 7, name: "Premium Tea Leaves", unit: "400g", category: "Grocery", price: 256, original: 320, discount: 20, stock: 95 },
  { id: 8, name: "Mustard Oil 1L", unit: "1L", category: "Grocery", price: 160, original: null, discount: 0, stock: 3 },
].map((p) => ({ ...p, status: deriveStatus(p.stock) }));

const CHIPS = ["All", "Active", "Low Stock", "Out of Stock"];

const ProductManagement = () => {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState(null); // { mode: "add" | "edit", product? }

  const categories = useMemo(() => ["All Categories", ...new Set(products.map((p) => p.category))], [products]);

  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.status === "Active").length,
      low: products.filter((p) => p.status === "Low Stock").length,
      out: products.filter((p) => p.status === "Out of Stock").length,
    }),
    [products],
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All Categories" || p.category === category;
        const matchesChip = chip === "All" || p.status === chip;
        return matchesQuery && matchesCategory && matchesChip;
      }),
    [products, query, category, chip],
  );

  const handleDelete = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (data) => {
    if (modal.mode === "edit") {
      setProducts((prev) =>
        prev.map((p) => (p.id === modal.product.id ? { ...p, ...data, status: deriveStatus(data.stock) } : p)),
      );
    } else {
      const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
      setProducts((prev) => [...prev, { id: nextId, ...data, status: deriveStatus(data.stock) }]);
    }
    setModal(null);
  };

  return (
    <AdminLayout
      title="Product Management"
      subtitle={`${products.length} products · Manage your catalogue`}
      actions={
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          <Plus size={16} />
          Add Product
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Box} iconBg="bg-blue-500" label="Total Products" value={counts.total} />
        <StatCard icon={CheckCircle2} iconBg="bg-emerald-500" label="Active" value={counts.active} />
        <StatCard icon={AlertTriangle} iconBg="bg-orange-500" label="Low Stock" value={counts.low} />
        <StatCard icon={XCircle} iconBg="bg-red-500" label="Out of Stock" value={counts.out} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setChip(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  chip === c ? "bg-emerald-500 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Price / Discount</th>
                <th className="pb-3 font-semibold">Stock</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                        <Apple size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          #{p.id} · {p.unit}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500">{p.category}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {p.original && <span className="text-xs text-slate-300 line-through">{p.original}TK</span>}
                      <span className="font-bold text-slate-800">{p.price}TK</span>
                      {p.discount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                          {p.discount}% off
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-slate-700">{p.stock}</td>
                  <td className="py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100" title="View">
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setModal({ mode: "edit", product: p })}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {(counts.low > 0 || counts.out > 0) && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600">
          <AlertTriangle size={16} />
          {counts.low} products low on stock · {counts.out} out of stock
        </div>
      )}

      {modal && (
        <ProductFormModal
          mode={modal.mode}
          product={modal.product}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
};

export default ProductManagement;
