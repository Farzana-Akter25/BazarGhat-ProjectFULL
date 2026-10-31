import {
  Boxes,
  Check,
  CheckCircle2,
  Eye,
  Pencil,
  Search as SearchIcon,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BorderStatCard,
  Card,
  StatusBadge,
} from "../../components/admin/AdminUI";
import ProductDetailsModal from "../../components/admin/ProductDetailsModal";
import {
  useGetInventoryQuery,
  useGetStockTransactionsQuery,
  useUpdateStockMutation,
} from "../../features/admin/inventoryApi";
import AdminLayout from "../../layouts/AdminLayout";
import { formatDate } from "../../utils/formatDate";
import { TH } from "../../components/shared/DataTable"; // shared table header cell style

// transaction type -> badge tone
const TRANSACTION_TONE = {
  "Doorstep Rejection Return": "bg-green-50 text-green-700",
  "Damaged from Doorstep Rejection": "bg-red-50 text-red-600",
};

// stock filter chips
const CHIPS = ["All", "In Stock", "Low Stock", "Out of Stock"];

// Admin page for stock levels, stock edits and stock history
const InventoryManagement = () => {
  // Router helper and inventory data
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useGetInventoryQuery();
  const { data: transactions = [], isLoading: isLoadingTransactions } =
    useGetStockTransactionsQuery();
  // Stock update API call
  const [updateStock] = useUpdateStockMutation();
  const [query, setQuery] = useState(""); // search text
  const [chip, setChip] = useState("All"); // active stock filter
  const [editingId, setEditingId] = useState(null); // row currently in stock-edit mode
  const [editValue, setEditValue] = useState(""); // draft stock value
  const [editError, setEditError] = useState(""); // stock edit validation error
  const [viewItem, setViewItem] = useState(null); // item shown in details modal

  // stock status counts for summary cards
  const counts = useMemo(
    () => ({
      out: items.filter((i) => i.status === "Out of Stock").length,
      low: items.filter((i) => i.status === "Low Stock").length,
      in: items.filter((i) => i.status === "In Stock").length,
    }),
    [items],
  );

  // items filtered by search text + chip
  const filtered = useMemo(
    () =>
      items.filter((i) => {
        // Keep products matching the search text and stock filter
        const matchesQuery =
          !query || i.name.toLowerCase().includes(query.toLowerCase());
        const matchesChip = chip === "All" || i.status === chip;
        return matchesQuery && matchesChip;
      }),
    [items, query, chip],
  );

  // begin inline stock edit
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(String(item.stock));
    setEditError("");
  };

  // save updated stock value
  const saveEdit = (id) => {
    // New stock must be zero or more
    const stockNum = Number(editValue);
    if (editValue === "" || Number.isNaN(stockNum) || stockNum < 0) {
      setEditError("Stock cannot be negative.");
      return;
    }
    updateStock({ id, stock: stockNum });
    setEditingId(null);
    setEditError("");
  };

  return (
    // shared admin page frame
    <AdminLayout
      title="Inventory Management"
      subtitle="Monitor stock levels and update quantities"
      backTo={{
        to: "/admindashboard",
        onClick: () => navigate("/admindashboard"),
      }}
    >
      {/* stock summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BorderStatCard
          tone="red"
          icon={XCircle}
          label="Out of Stock"
          value={counts.out}
        />
        <BorderStatCard
          tone="orange"
          icon={Boxes}
          label="Low Stock"
          value={counts.low}
        />
        <BorderStatCard
          tone="emerald"
          icon={CheckCircle2}
          label="In Stock"
          value={counts.in}
        />
      </div>

      <Card className="mt-6">
        {/* search + filter chips */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* search box */}
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
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* stock filter chip row */}
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              // single filter chip, highlighted when active
              <button
                key={c}
                onClick={() => setChip(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  chip === c
                    ? "bg-green-700 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* inventory table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            {/* table column headers */}
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Product</th>
                <th className={TH}>Category</th>
                <th className={TH}>Sold</th>
                <th className={TH}>Stock</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* inventory row */}
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-3">
                      {/* product thumbnail */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-orange-500">
                        <img
                          src={
                            i.image ||
                            `https://placehold.co/80x80/eff0f5/64748b?text=${encodeURIComponent(i.name)}`
                          }
                          alt={i.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://placehold.co/80x80/eff0f5/64748b?text=${encodeURIComponent(i.name)}`;
                          }}
                        />
                      </div>
                      <div>
                        {/* product name */}
                        <p className="font-semibold text-slate-800">{i.name}</p>
                        {/* product price */}
                        <p className="text-xs text-slate-600">{i.price}TK</p>
                      </div>
                    </div>
                  </td>
                  {/* category */}
                  <td className="px-3 py-3 break-words text-slate-700">{i.category}</td>
                  {/* units sold */}
                  <td className="px-3 py-3 break-words text-slate-700">{i.sold}</td>
                  {/* stock value, editable inline */}
                  <td className="px-3 py-3 break-words font-semibold text-slate-700">
                    {editingId === i.id ? (
                      <div>
                        {/* stock number input */}
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(i.id)}
                          className="w-20 rounded-lg border border-green-700 px-2 py-1 text-sm outline-none"
                        />
                        {editError && (
                          <p className="mt-1 text-[11px] font-semibold text-red-500">
                            {editError}
                          </p>
                        )}
                      </div>
                    ) : (
                      i.stock
                    )}
                  </td>
                  {/* status pill */}
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={i.status} />
                  </td>
                  {/* row action buttons */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-3">
                      {/* view details button */}
                      <button
                        onClick={() => setViewItem(i)}
                        className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>
                      {editingId === i.id ? (
                        // save stock edit button
                        <button
                          onClick={() => saveEdit(i.id)}
                          className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline"
                        >
                          <Check size={13} />
                          Save
                        </button>
                      ) : (
                        // start stock edit button
                        <button
                          onClick={() => startEdit(i)}
                          className="flex items-center gap-1 text-sm font-semibold text-blue-500 hover:underline"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                // loading state row
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    Loading inventory...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    No inventory items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* rejected/damaged stock transaction history */}
      <Card className="mt-6" title="Recent Stock Transactions">
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Type</th>
                <th className={TH}>Product</th>
                <th className={TH}>Order</th>
                <th className={TH}>Qty</th>
                <th className={TH}>Stock Change</th>
                <th className={TH}>Reason</th>
                <th className={TH}>By</th>
                <th className={TH}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 break-words">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        TRANSACTION_TONE[t.type] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 break-words font-semibold text-slate-700">
                    {t.productName}
                  </td>
                  <td className="px-3 py-3 break-words text-slate-700">
                    {t.orderNumber || "—"}
                  </td>
                  <td className="px-3 py-3 break-words text-slate-700">{t.quantity}</td>
                  <td className="px-3 py-3 break-words text-slate-700">
                    {t.previousStock} → {t.newStock}
                  </td>
                  <td className="px-3 py-3 break-words text-slate-700">{t.reason || "—"}</td>
                  <td className="px-3 py-3 break-words text-slate-700">{t.createdBy || "—"}</td>
                  <td className="px-3 py-3 break-words text-slate-600">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
              {isLoadingTransactions && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    Loading stock transactions...
                  </td>
                </tr>
              )}
              {!isLoadingTransactions && transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    No stock transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* product details modal */}
      {viewItem && (
        <ProductDetailsModal
          product={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </AdminLayout>
  );
};

export default InventoryManagement;
