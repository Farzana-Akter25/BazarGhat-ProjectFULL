import {
  AlertTriangle,
  Package,
  CheckCircle2,
  Pencil,
  Eye,
  PackagePlus,
  Search as SearchIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import ProductFormModal from "../../components/admin/ProductFormModal";
import ProductDetailsModal from "../../components/admin/ProductDetailsModal";
import AdminLayout from "../../layouts/AdminLayout";
import { TH } from "../../components/shared/DataTable"; // shared table header cell style
import {
  useGetAdminProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "../../features/admin/productApi";

// status filter chips
const CHIPS = ["All", "Active", "Low Stock", "Out of Stock"];

// Falls back to deriving status from stock so the column never renders blank if the API response is ever missing the field.
const productStatus = (p) => {
  if (p.status) return p.status;
  if (p.stock <= 0) return "Out of Stock";
  if (p.stock < 20) return "Low Stock";
  return "Active";
};

// Admin page listing products with add, edit and delete
const ProductManagement = () => {
  const { data: products = [], isLoading } = useGetAdminProductsQuery();
  // API calls to add, update and delete products
  const [addProduct] = useAddProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [query, setQuery] = useState(""); // search box text
  const [category, setCategory] = useState("All Categories"); // active category filter
  const [chip, setChip] = useState("All"); // active status chip
  const [modal, setModal] = useState(null); // { mode: "add" | "edit", product?
  const [viewProduct, setViewProduct] = useState(null); // product shown in details modal
  const [formError, setFormError] = useState(""); // add/edit form error text

  // unique category list, with "All" option prepended
  const categories = useMemo(() => ["All Categories", ...new Set(products.map((p) => p.category))], [products]);

  // status counts for stat cards
  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => productStatus(p) === "Active").length,
      low: products.filter((p) => productStatus(p) === "Low Stock").length,
      out: products.filter((p) => productStatus(p) === "Out of Stock").length,
    }),
    [products],
  );

  // products after search/category/status filters
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        // Keep products matching the search text, category and stock filter
        const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All Categories" || p.category === category;
        const matchesChip = chip === "All" || productStatus(p) === chip;
        return matchesQuery && matchesCategory && matchesChip;
      }),
    [products, query, category, chip],
  );

  // delete a product after confirm dialog
  const handleDelete = (product) => {
    if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      deleteProduct(product.id);
    }
  };

  // submit add/edit product form
  const handleSubmit = async (data) => {
    // Form fields to send to the server
    const fields = {
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: Number(data.price) || 0,
      original_price: data.original ? Number(data.original) : "",
      discount: Number(data.discount) || 0,
      stock: Number(data.stock) || 0,
    };

    // build multipart form data if a new image file was chosen
    let payload;
    if (data.imageFile) {
      payload = new FormData();
      Object.entries(fields).forEach(([key, value]) => payload.append(key, value));
      payload.append("image_file", data.imageFile);
    } else {
      payload = { ...fields, original_price: data.original ? Number(data.original) : null, image: data.imageUrl || null };
    }

    setFormError("");
    try {
      if (modal.mode === "edit") {
        await updateProduct({ id: modal.product.id, body: payload }).unwrap();
      } else {
        await addProduct(payload).unwrap();
      }
      setModal(null);
    } catch (err) {
      // Show the first validation error, or the server message
      const fieldErrors = err?.data?.errors;
      const firstFieldMessage = fieldErrors ? Object.values(fieldErrors).flat()[0] : null;
      setFormError(
        firstFieldMessage || err?.data?.message || "Failed to save product. Please check the form and try again."
      );
    }
  };

  return (
    <AdminLayout
      title="Product Management"
      subtitle={`${products.length} products · Manage your catalogue`}
    >
      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} iconBg="bg-blue-500" label="Total Products" value={counts.total} />
        <StatCard icon={CheckCircle2} iconBg="bg-green-700" label="Active" value={counts.active} />
        <StatCard icon={AlertTriangle} iconBg="bg-orange-500" label="Low Stock" value={counts.low} />
        <StatCard icon={XCircle} iconBg="bg-red-500" label="Out of Stock" value={counts.out} />
      </div>

      {/* add-product action, below the stat cards */}
      <div className="mt-6 flex justify-end">
        {/* open add-product modal */}
        <button
          onClick={() => {
            setFormError("");
            setModal({ mode: "add" });
          }}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          <PackagePlus size={16} />
          Add Product
        </button>
      </div>

      <Card className="mt-4">
        {/* search, category, chip filters */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* search box */}
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* category dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {/* status filter chips */}
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setChip(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  chip === c ? "bg-green-700 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* products table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            {/* column headers */}
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Product</th>
                <th className={TH}>Category</th>
                <th className={TH}>Price / Discount</th>
                <th className={TH}>Stock</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* row per product */}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  {/* thumbnail + name + id/unit */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50 text-green-700">
                        <img
                          src={p.image || `https://placehold.co/80x80/eff0f5/64748b?text=${encodeURIComponent(p.name)}`}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://placehold.co/80x80/eff0f5/64748b?text=${encodeURIComponent(p.name)}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-600">
                          #{p.id} · {p.unit}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 break-words text-slate-700">{p.category}</td>
                  {/* price, old price, discount badge */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-500">৳{p.price}</span>
                      {p.original && <span className="text-xs text-slate-600 line-through">৳{p.original}</span>}
                      {p.discount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                          {p.discount}% off
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 break-words font-semibold text-slate-700">{p.stock}</td>
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={productStatus(p)} />
                  </td>
                  {/* view/edit/delete action icons */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-2">
                      {/* view details */}
                      <button
                        onClick={() => setViewProduct(p)}
                        className="rounded-lg bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      {/* open edit modal */}
                      <button
                        onClick={() => {
                          setFormError("");
                          setModal({ mode: "edit", product: p });
                        }}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {/* delete product */}
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* loading row */}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    Loading products...
                  </td>
                </tr>
              )}
              {/* empty state row */}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* low stock warning banner */}
      {(counts.low > 0 || counts.out > 0) && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600">
          <AlertTriangle size={16} />
          {counts.low} products low on stock · {counts.out} out of stock
        </div>
      )}

      {/* add/edit product modal */}
      {modal && (
        <ProductFormModal
          mode={modal.mode}
          product={modal.product}
          onClose={() => {
            setModal(null);
            setFormError("");
          }}
          onSubmit={handleSubmit}
          submitError={formError}
        />
      )}

      {/* view product details modal */}
      {viewProduct && <ProductDetailsModal product={viewProduct} onClose={() => setViewProduct(null)} />}
    </AdminLayout>
  );
};

export default ProductManagement;
