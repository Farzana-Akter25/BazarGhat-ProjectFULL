import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Search as SearchIcon,
  Trash2,
  Zap,
} from "lucide-react"; // icons for pagination, table actions, flash sale badge
import { Fragment, useState } from "react";
import notify from "../../utils/notify"; // shared toast notifications
import { formatDateTime as formatDateTimeValue } from "../../utils/formatDate";
import { Card, StatCard } from "../../components/admin/AdminUI"; // shared card wrapper + stat card
import FlashSaleFormModal from "../../components/admin/FlashSaleFormModal"; // add/edit form modal
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import { TH } from "../../components/shared/DataTable"; // shared table header cell style
import {
  useAddFlashSaleMutation,
  useDeleteFlashSaleMutation,
  useGetAdminFlashSalesQuery,
  useUpdateFlashSaleMutation,
} from "../../features/admin/flashSaleApi";

// Phase is derived from the clock on every read, so a sale moves Upcoming -> Active -> Expired on its own with no admin action.
const PHASE_LABELS = {
  upcoming: "Upcoming",
  active: "Active",
  expired: "Expired",
  inactive: "Inactive",
};

// phase key -> badge color classes
const PHASE_STYLES = {
  upcoming: "bg-blue-50 text-blue-600",
  active: "bg-green-50 text-green-700",
  expired: "bg-slate-100 text-slate-700",
  inactive: "bg-red-50 text-red-600",
};

// status filter tabs
const PHASE_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "expired", label: "Expired" },
  { key: "inactive", label: "Inactive" },
];

// small colored pill showing sale phase
const PhaseBadge = ({ phase }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      PHASE_STYLES[phase] || "bg-slate-100 text-slate-600"
    }`}
  >
    {PHASE_LABELS[phase] || phase}
  </span>
);

// formats an iso datetime for table display, day-month-year
const formatDateTime = (value) => (value ? formatDateTimeValue(value) : "-");

// Admin page listing flash sales, with create, edit and delete
const FlashSaleManagement = () => {
  const [search, setSearch] = useState(""); // search text
  const [phase, setPhase] = useState(""); // status filter tab
  const [page, setPage] = useState(1); // current page number
  const [expandedId, setExpandedId] = useState(null); // sale showing its product prices
  // Load the current page of flash sales
  const { data, isLoading } = useGetAdminFlashSalesQuery({
    search: search || undefined,
    phase: phase || undefined,
    page,
    per_page: 10,
  }); // flash sale list from api, paginated
  const [addFlashSale] = useAddFlashSaleMutation(); // create mutation
  const [updateFlashSale] = useUpdateFlashSaleMutation(); // edit mutation
  const [deleteFlashSale] = useDeleteFlashSaleMutation(); // delete mutation
  const [modal, setModal] = useState(null); // { mode: "add" | "edit", flashSale?

  const flashSales = data?.flash_sales || []; // current page of flash sales
  const meta = data?.meta; // pagination info
  // whole-table counts, so the tabs don't just describe the current page
  const phaseCounts = data?.phase_counts || {};

  // delete a flash sale after confirm
  const handleDelete = (id) => {
    if (window.confirm("Delete this flash sale? This cannot be undone.")) {
      deleteFlashSale(id);
    }
  };

  // submit add or edit form from modal
  const handleSubmit = async (payload) => {
    if (modal.mode === "edit") {
      // Editing: save changes
      const result = await updateFlashSale({ id: modal.flashSale.id, ...payload });
      if (result.error) {
        notify.apiError(result.error, "Couldn’t update flash sale");
        return;
      }
    } else {
      // Creating: add a new sale
      const result = await addFlashSale(payload);
      if (result.error) {
        notify.apiError(result.error, "Couldn’t create flash sale");
        return;
      }
    }
    setModal(null);
  };

  return (
    <AdminLayout
      title="Flash Sale Management"
      subtitle={`${phaseCounts.all ?? 0} flash sales · Prices revert automatically when a sale ends`}
    >
      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} iconBg="bg-green-700" label="Active Now" value={phaseCounts.active ?? 0} />
        <StatCard icon={Zap} iconBg="bg-blue-500" label="Upcoming" value={phaseCounts.upcoming ?? 0} />
        <StatCard icon={Zap} iconBg="bg-slate-400" label="Expired" value={phaseCounts.expired ?? 0} />
        <StatCard icon={Zap} iconBg="bg-red-500" label="Inactive" value={phaseCounts.inactive ?? 0} />
      </div>

      {/* create flash sale action, below the stat cards */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          <Plus size={16} />
          Create Flash Sale
        </button>
      </div>

      <Card className="mt-4">
        {/* search box */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            {/* search icon inside input */}
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // reset to first page on new search
              }}
              type="text"
              placeholder="Search flash sales..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white"
            />
          </div>
        </div>

        {/* status filter tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PHASE_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => {
                setPhase(tab.key);
                setPage(1); // reset to first page on filter change
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                phase === tab.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              <span className="ml-1.5">
                {tab.key ? (phaseCounts[tab.key] ?? 0) : (phaseCounts.all ?? 0)}
              </span>
            </button>
          ))}
        </div>

        {/* flash sales table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              {/* table header row */}
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Name</th>
                <th className={TH}>Products</th>
                <th className={TH}>Discount</th>
                <th className={TH}>Start</th>
                <th className={TH}>End</th>
                <th className={TH}>Phase</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flashSales.map((fs) => (
                // flash sale row + its expandable product price breakdown
                <Fragment key={fs.id}>
                <tr>
                  {/* name + icon cell */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-3">
                      {/* orange zap icon badge */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                        <Zap size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{fs.name}</p>
                        <p className="text-xs text-slate-600">#{fs.id} · {fs.status}</p>
                      </div>
                    </div>
                  </td>
                  {/* product count cell, expands the price breakdown */}
                  <td className="px-3 py-3 break-words">
                    <button
                      onClick={() => setExpandedId(expandedId === fs.id ? null : fs.id)}
                      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-orange-500"
                      title="Show prices"
                    >
                      {fs.products_count}
                      {expandedId === fs.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  {/* discount value cell */}
                  <td className="px-3 py-3 break-words">
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                      {fs.discount_type === "percentage" ? `${fs.discount_value}% OFF` : `${fs.discount_value}TK OFF`}
                    </span>
                  </td>
                  {/* start date cell */}
                  <td className="px-3 py-3 break-words text-slate-700">{formatDateTime(fs.start_at)}</td>
                  {/* end date cell */}
                  <td className="px-3 py-3 break-words text-slate-700">{formatDateTime(fs.end_at)}</td>
                  {/* phase badge cell */}
                  <td className="px-3 py-3 break-words">
                    <PhaseBadge phase={fs.phase} />
                  </td>
                  {/* action buttons cell */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex items-center gap-2">
                      {/* edit button */}
                      <button
                        onClick={() => setModal({ mode: "edit", flashSale: fs })}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {/* delete button */}
                      <button
                        onClick={() => handleDelete(fs.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* per-product pricing: what each product normally sells for, the discount, and the resulting flash sale price */}
                {expandedId === fs.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 px-4 py-4">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-wide text-black">
                            <th className="pb-2 font-semibold">Product</th>
                            <th className="pb-2 font-semibold">Normal Price</th>
                            <th className="pb-2 font-semibold">Discount</th>
                            <th className="pb-2 font-semibold">Flash Sale Price</th>
                            <th className="pb-2 font-semibold">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {fs.products.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50">
                              <td className="py-2 font-semibold text-slate-700">{product.name}</td>
                              {/* permanent selling price, never overwritten */}
                              <td className="py-2 text-slate-700">৳{product.normal_price}</td>
                              <td className="py-2">
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-600">
                                  -{product.discount_percentage}%
                                </span>
                              </td>
                              {/* temporary promotional price */}
                              <td className="py-2 font-bold text-green-700">৳{product.sale_price}</td>
                              <td className="py-2 text-slate-700">{product.stock}</td>
                            </tr>
                          ))}
                          {fs.products.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-slate-600">
                                No products in this flash sale.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {isLoading && (
                // loading row
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600">
                    Loading flash sales...
                  </td>
                </tr>
              )}
              {!isLoading && flashSales.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600">
                    No flash sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination controls */}
        {meta && meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {/* page count summary text */}
            <p className="text-slate-600">
              Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </p>
            <div className="flex items-center gap-2">
              {/* prev page button */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              {/* next page button */}
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

      {/* add/edit modal */}
      {modal && (
        <FlashSaleFormModal
          mode={modal.mode}
          flashSale={modal.flashSale}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
};

export default FlashSaleManagement;
