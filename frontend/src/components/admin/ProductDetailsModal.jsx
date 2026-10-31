import { Calendar, X } from "lucide-react";
import { formatDate } from "../../utils/formatDate";

// label/value detail row
const Row = ({ label, value }) =>
  value === undefined || value === null || value === "" ? null : (
    // one label/value line
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      {/* row label */}
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {/* row value */}
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );

// Popup showing all details of one product
const ProductDetailsModal = ({ product, onClose }) => {
  if (!product) return null; // nothing to show

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal card */}
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            {/* modal title */}
            <h2 className="text-lg font-black text-slate-900">Product Details</h2>
            {/* product id */}
            <p className="text-xs text-slate-600">#{product.id}</p>
          </div>
          {/* close button */}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* product image + name */}
          <div className="mb-4 flex items-center gap-4">
            {/* thumbnail image */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50 text-green-700">
              <img
                src={product.image || `https://placehold.co/160x160/eff0f5/64748b?text=${encodeURIComponent(product.name)}`}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/160x160/eff0f5/64748b?text=${encodeURIComponent(product.name)}`; // fallback placeholder
                }}
              />
            </div>
            <div>
              {/* product name */}
              <p className="text-base font-extrabold text-slate-900">{product.name}</p>
              {/* optional description */}
              {product.description && <p className="mt-1 text-xs text-slate-600">{product.description}</p>}
            </div>
          </div>

          {/* added date badge */}
          {product.created_at && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-700">
              <Calendar size={16} />
              <span className="text-sm font-semibold">Added on {formatDate(product.created_at)}</span>
            </div>
          )}

          {/* detail rows list */}
          <div className="rounded-xl bg-slate-50 px-4">
            <Row label="Category" value={product.category} />
            <Row label="Unit" value={product.unit} />
            <Row label="Price" value={product.price !== undefined ? `৳${product.price}` : undefined} />
            <Row label="Original Price" value={product.original ? `৳${product.original}` : undefined} />
            <Row label="Discount" value={product.discount ? `${product.discount}%` : undefined} />
            <Row label="Stock" value={product.stock} />
            <Row label="Sold" value={product.sold} />
            <Row label="Status" value={product.status} />
          </div>
        </div>

        {/* footer close action */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
