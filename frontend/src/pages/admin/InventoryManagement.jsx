import { Boxes, Check, CheckCircle2, Edit2, RefreshCw, Search as SearchIcon, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BorderStatCard, Card, StatusBadge } from "../../components/admin/AdminUI";
import AdminLayout from "../../layouts/AdminLayout";

const deriveStatus = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return "Low Stock";
  return "In Stock";
};

const INITIAL_ITEMS = [
  { id: 1, name: "Fresh Organic Apple 1kg", price: 250, category: "Fruits", sold: 245, stock: 48 },
  { id: 2, name: "Basmati Rice 5kg", price: 450, category: "Grains", sold: 198, stock: 3 },
  { id: 3, name: "Pure Honey 500g", price: 380, category: "Organic", sold: 156, stock: 0 },
  { id: 4, name: "Fresh Chicken 1kg", price: 250, category: "Meat", sold: 142, stock: 12 },
  { id: 5, name: "Hilsa Fish 1kg", price: 400, category: "Fish", sold: 118, stock: 2 },
  { id: 6, name: "Mustard Oil 1L", price: 160, category: "Oil", sold: 95, stock: 25 },
  { id: 7, name: "Green Vegetables Mix 500g", price: 60, category: "Veggies", sold: 88, stock: 0 },
  { id: 8, name: "Full Cream Milk 1L", price: 75, category: "Dairy", sold: 210, stock: 18 },
].map((i) => ({ ...i, status: deriveStatus(i.stock) }));

const CHIPS = ["All", "In Stock", "Low Stock", "Out of Stock"];

const InventoryManagement = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const counts = useMemo(
    () => ({
      out: items.filter((i) => i.status === "Out of Stock").length,
      low: items.filter((i) => i.status === "Low Stock").length,
      in: items.filter((i) => i.status === "In Stock").length,
    }),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const matchesQuery = !query || i.name.toLowerCase().includes(query.toLowerCase());
        const matchesChip = chip === "All" || i.status === chip;
        return matchesQuery && matchesChip;
      }),
    [items, query, chip],
  );

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(String(item.stock));
  };

  const saveEdit = (id) => {
    const stockNum = Math.max(0, Number(editValue) || 0);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, stock: stockNum, status: deriveStatus(stockNum) } : i)),
    );
    setEditingId(null);
  };

  return (
    <AdminLayout
      title="Inventory Management"
      subtitle="Monitor stock levels and update quantities"
      backTo={{ to: "/admindashboard", onClick: () => navigate("/admindashboard") }}
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">
          <RefreshCw size={16} />
          Sync Stock
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BorderStatCard tone="red" icon={XCircle} label="Out of Stock" value={counts.out} />
        <BorderStatCard tone="orange" icon={Boxes} label="Low Stock" value={counts.low} />
        <BorderStatCard tone="emerald" icon={CheckCircle2} label="In Stock" value={counts.in} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Sold</th>
                <th className="pb-3 font-semibold">Stock</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                        <Boxes size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{i.name}</p>
                        <p className="text-xs text-slate-400">{i.price}TK</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500">{i.category}</td>
                  <td className="py-3 text-slate-500">{i.sold}</td>
                  <td className="py-3 font-semibold text-slate-700">
                    {editingId === i.id ? (
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(i.id)}
                        className="w-20 rounded-lg border border-emerald-400 px-2 py-1 text-sm outline-none"
                      />
                    ) : (
                      i.stock
                    )}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="py-3">
                    {editingId === i.id ? (
                      <button
                        onClick={() => saveEdit(i.id)}
                        className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
                      >
                        <Check size={13} />
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(i)}
                        className="flex items-center gap-1 text-sm font-semibold text-blue-500 hover:underline"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No inventory items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
};

export default InventoryManagement;
