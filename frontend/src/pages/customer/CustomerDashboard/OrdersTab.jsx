import {
  CircleCheck,
  ClipboardList,
  FileText,
  MapPin,
  Search,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react"; // stat card, meta and row action icons
import { useMemo, useState } from "react";
import CancelOrderModal from "../../../components/customer/CancelOrderModal"; // cancel + refund method picker
import InvoiceModal from "../../../components/shared/InvoiceModal"; // invoice popup
import OrderTrackingTimeline from "../../../components/shared/OrderTrackingTimeline"; // step-by-step history view
import { useLazyGetMyInvoiceQuery } from "../../../features/customer/invoiceApi";
import { formatDate } from "../../../utils/formatDate";
import {
  useDeleteMyOrderMutation,
  useLazyGetMyOrderQuery,
} from "../../../features/customer/orderApi";
import {
  CUSTOMER_STATUS_FILTERS,
  canCustomerCancelOrder,
  canCustomerDeleteOrder,
  isRefundEligible,
  toCustomerStatus,
} from "../../../utils/orderStatus";
import StatusBadge from "./StatusBadge"; // colored status pill
import { TH as SHARED_TH } from "../../../components/shared/DataTable"; // shared table header cell style

// comma separated product names of an order, each with how many were ordered.
const itemNames = (order) =>
  order.items.map((i) => `${i.name} x${i.qty}`).join(", ");

// refund status -> pill color, matching the tones used elsewhere in the panel
const REFUND_PILL = {
  PENDING: "bg-orange-50 text-orange-600",
  PROCESSING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-50 text-red-600",
};

// the refund to headline on an order row: whichever leg is still open, else the first
const refundOf = (order) =>
  order.refunds?.find((r) => ["PENDING", "PROCESSING"].includes(r.status)) ??
  order.refunds?.[0];

// everything actually coming back, ignoring failed attempts
const refundTotal = (order) =>
  (order.refunds ?? [])
    .filter((r) => r.status !== "FAILED")
    .reduce((sum, r) => sum + r.amount, 0);

// the SSLCommerz leg of a cancelled order's refund while it is still on its way back.
const pendingGatewayRefund = (order) =>
  order.status === "Cancelled"
    ? order.refunds?.find(
        (r) =>
          r.method === "ORIGINAL_PAYMENT" &&
          ["PENDING", "PROCESSING"].includes(r.status),
      )
    : undefined;

// statuses that mean the order is on its way to the customer
const IN_TRANSIT_STATUSES = ["Assigned", "Picked Up", "Out for Delivery"];

// shared shapes so every row action is the same size and gets a keyboard focus ring
const ACTION_BTN =
  "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
// Style shared by the small icon buttons
const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
// sticky header cell, so column names stay visible while a long list scrolls
const TH = `sticky top-0 z-10 ${SHARED_TH}`;

// An order with a return/refund request still awaiting a decision reads as "Return Submitted" / "Refund Submitted".
const submittedLabel = (order) => order.returnRequest?.statusLabel;

// status pill plus the note explaining a cancelled or rejected order
const StatusCell = ({ order }) => (
  <>
    <StatusBadge status={submittedLabel(order) ?? toCustomerStatus(order.status)} />
    {submittedLabel(order) && (
      // the request the pill is standing in for, so the underlying order status is still readable rather than hidden behind it
      <p className="mt-1.5 text-[11px] text-slate-600">
        {order.returnRequest.id} · order {toCustomerStatus(order.status)}
      </p>
    )}
    {order.status === "Cancelled" && order.cancelledBy && (
      // who cancelled note
      <p className="mt-1.5 text-[11px] text-slate-600">
        By {order.cancelledBy === "admin" ? "Admin" : "You"}
      </p>
    )}
    {order.status === "Customer Rejected at Doorstep" &&
      order.rejectionReason && (
        // rider's rejection reason note
        <p className="mt-1.5 text-[11px] leading-relaxed break-words text-red-500">
          "{order.rejectionReason}" — our team is reviewing this order.
        </p>
      )}
  </>
);

// amount, payment method and the paid / refunded pill
const AmountCell = ({ order }) => {
  // Refund on this order and any gateway refund still in progress
  const refund = refundOf(order);
  const gatewayRefund = pendingGatewayRefund(order);

  // A balance refund that is already confirmed needs nothing but its own line.
  const settledToBalance =
    refund?.method === "WALLET" && refund?.status === "COMPLETED";

  return (
    <>
      <p className="font-bold text-slate-800">{order.total}TK</p>
      {(order.paymentLabel || order.paymentMethod) && (
        // which channel the gateway actually charged, e.g. "SSLCommerz (bKash)"
        <p className="mt-0.5 text-xs text-slate-600">
          {order.paymentLabel || order.paymentMethod}
        </p>
      )}
      {!settledToBalance &&
        ["Paid", "Refunded"].includes(order.paymentStatus) && (
          // paid / refunded pill
          <div className="mt-2">
            <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
              {order.paymentStatus}
            </span>
          </div>
        )}
      {refund && (
        // live refund state — a gateway refund stays "Processing" until the gateway confirms it, so this is never a promise the money has landed
        <div className="mt-2">
          {!settledToBalance && (
            <span
              className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${REFUND_PILL[refund.status] || "bg-slate-100 text-slate-600"}`}
            >
              Refund: {refund.statusLabel}
            </span>
          )}
          <p
            className={`text-[11px] text-slate-600 ${settledToBalance ? "" : "mt-1"}`}
          >
            {refund.methodLabel} · ৳{refundTotal(order)}
          </p>
          {gatewayRefund && (
            // gateway refunds are not instant — tell the customer when to expect it
            <p className="mt-1 text-[11px] font-medium text-amber-700">
              ৳{gatewayRefund.amount} will be refunded to{" "}
              {gatewayRefund.paymentMethod || order.paymentLabel || "SSLCommerz"}{" "}
              within 3 days.
            </p>
          )}
        </div>
      )}
    </>
  );
};

// row actions, shared by the desktop table and the mobile cards
const OrderActions = ({
  order,
  align = "justify-end",
  onCancel,
  onTrack,
  onInvoice,
  onReturn,
  onDelete,
}) => (
  // action button group
  <div className={`flex flex-wrap items-center gap-1.5 ${align}`}>
    {canCustomerCancelOrder(order.status) && (
      // cancel order button
      <button
        onClick={() => onCancel(order)}
        title="Cancel this order"
        className={`${ACTION_BTN} bg-red-50 text-red-500 hover:bg-red-100 focus-visible:ring-red-500`}
      >
        Cancel
      </button>
    )}
    {/* view tracking timeline button */}
    <button
      onClick={() => onTrack(order)}
      title="Track this order"
      aria-label="Track this order"
      className={`${ICON_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-100 focus-visible:ring-indigo-500`}
    >
      <Truck size={15} />
    </button>
    {/* view invoice button */}
    <button
      onClick={() => onInvoice(order)}
      title="View & download invoice"
      aria-label="View and download invoice"
      className={`${ICON_BTN} bg-blue-50 text-blue-500 hover:bg-blue-100 focus-visible:ring-blue-500`}
    >
      <FileText size={15} />
    </button>
    {/* An order is asked about once, so both buttons close as soon as a request of either kind exists against it. */}
    {!order.returnRequest && order.status === "Delivered" && (
      // jump to the returns tab with this order preselected
      <button
        onClick={() => onReturn?.(order.orderId, "Return")}
        title="Request a return for this order"
        className={`${ACTION_BTN} bg-amber-50 text-amber-600 hover:bg-amber-100 focus-visible:ring-amber-500`}
      >
        Return
      </button>
    )}
    {!order.returnRequest && isRefundEligible(order) && (
      // jump to the returns tab on the refund form for this order
      <button
        onClick={() => onReturn?.(order.orderId, "Refund")}
        title="Request a refund for this order"
        className={`${ACTION_BTN} bg-amber-50 text-amber-600 hover:bg-amber-100 focus-visible:ring-amber-500`}
      >
        Refund
      </button>
    )}
    {canCustomerDeleteOrder(order.status) && (
      // remove a finished order from the history
      <button
        onClick={() => onDelete(order)}
        title="Delete this order from your history"
        aria-label="Delete this order from your history"
        className={`${ICON_BTN} bg-red-50 text-red-500 hover:bg-red-100 focus-visible:ring-red-500`}
      >
        <Trash2 size={15} />
      </button>
    )}
  </div>
);

// grey pulsing placeholder shown while the order list loads
const SkeletonBar = ({ className = "w-24" }) => (
  <div className={`h-3 animate-pulse rounded bg-slate-200 ${className}`} />
);

// shown when the search / status filter matches nothing
const EmptyState = ({ onReset }) => (
  // empty state block
  <div className="px-4 py-12 text-center">
    <ClipboardList size={28} className="mx-auto mb-2 text-slate-500" />
    <p className="text-sm font-semibold text-slate-600">
      No orders match your search.
    </p>
    <p className="mt-1 text-xs text-slate-600">
      Try a different Order ID, product name or status.
    </p>
    {/* one click back to the full list */}
    <button
      onClick={onReset}
      className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-100 px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      Clear filters
    </button>
  </div>
);

// Orders tab: list of the customer's orders with actions (track, invoice, cancel, return)
const OrdersTab = ({ orders = [], isLoading, onReturnOrder }) => {
  const [search, setSearch] = useState(""); // search box text
  const [statusFilter, setStatusFilter] = useState("All Status"); // status dropdown filter
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null); // order tracking modal
  const [invoiceOrderId, setInvoiceOrderId] = useState(null); // which order's invoice modal is open
  const [cancellingOrder, setCancellingOrder] = useState(null); // order pending cancel confirm
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState(""); // post-cancel success banner
  const [deletingOrder, setDeletingOrder] = useState(null); // order pending delete confirm
  const [deleteError, setDeleteError] = useState(""); // delete modal error text

  const [fetchOrder, { data: trackedOrder, isFetching: isTracking }] =
    useLazyGetMyOrderQuery(); // fetch tracking detail for one order
  const [fetchInvoice, { data: invoice, isFetching: isInvoiceLoading, error: invoiceError }] =
    useLazyGetMyInvoiceQuery(); // fetch invoice detail for one order
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteMyOrderMutation();

  // stat card counts, same summary row the admin Order Management page opens with
  const counts = useMemo(
    () => ({
      total: orders.length,
      inTransit: orders.filter((o) => IN_TRANSIT_STATUSES.includes(o.status))
        .length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      cancelled: orders.filter((o) => o.status === "Cancelled").length,
    }),
    [orders],
  );

  // orders filtered by search text and status dropdown
  const filtered = useMemo(() => {
    // Filter by status and search text
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All Status" ||
        toCustomerStatus(order.status) === statusFilter;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  // open tracking modal and fetch detail
  const handleTrack = (order) => {
    setSelectedTrackingOrder(order);
    fetchOrder(order.orderId);
  };

  // open invoice modal and fetch its data
  const handleInvoice = (order) => {
    setInvoiceOrderId(order.orderId);
    fetchInvoice(order.orderId);
  };

  // open the cancel confirm modal for one order
  const openCancelModal = (order) => {
    setCancellingOrder(order);
  };

  // open the delete confirm modal for one order
  const openDeleteModal = (order) => {
    setDeleteError("");
    setDeletingOrder(order);
  };

  // put the search box and status dropdown back to their defaults
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All Status");
  };

  // banner shown after the modal reports a successful cancellation
  const handleCancelled = (response) => {
    if (!response?.refund_initiated) return;

    // Refunds created by the cancellation and their total
    const refunds = response.refunds ?? [];
    const total = refunds
      .filter((r) => r.status !== "FAILED")
      .reduce((sum, r) => sum + r.amount, 0);
    // All refunds already completed?
    const settled = refunds.every((r) => r.status === "COMPLETED");

    // Names the channel the order was paid through, so the banner says where the money is going back to rather than only that a gateway is involved.
    const via = cancellingOrder?.paymentLabel || "SSLCommerz";

    // A gateway refund is only submitted at this point, never settled — so the wording has to differ from a balance refund, which really is done.
    setCancelSuccessMessage(
      settled
        ? `Order cancelled. ৳${total} has been refunded to your Refund Wallet and is ready to use.`
        : `Order cancelled. Your refund of ৳${total} is being processed through ${via} — you can follow it in Refund History.`,
    );
    setTimeout(() => setCancelSuccessMessage(""), 8000);
  };

  // confirm delete of the selected order
  const confirmDelete = async () => {
    if (!deletingOrder) return;
    setDeleteError("");
    try {
      await deleteOrder(deletingOrder.orderId).unwrap();
      setDeletingOrder(null);
    } catch (err) {
      setDeleteError(
        err?.data?.message || "Could not delete this order. Please try again.",
      );
    }
  };

  return (
    <div>
      {/* page heading, mirrors the admin page title block */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
          My Orders
        </h1>
        <p className="text-sm text-slate-600">
          Track, cancel and download invoices for all your orders
        </p>
      </div>

      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ClipboardList,
            iconBg: "bg-slate-700",
            label: "Total Orders",
            value: counts.total,
          },
          {
            icon: Truck,
            iconBg: "bg-blue-500",
            label: "In Transit",
            value: counts.inTransit,
          },
          {
            icon: CircleCheck,
            iconBg: "bg-green-700",
            label: "Delivered",
            value: counts.delivered,
          },
          {
            icon: XCircle,
            iconBg: "bg-red-500",
            label: "Cancelled",
            value: counts.cancelled,
          },
        ].map((c) => (
          // stat card
          <div
            key={c.label}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                {/* stat label */}
                <p className="text-xs font-medium text-slate-600">{c.label}</p>
                {/* stat value */}
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {c.value}
                </p>
              </div>
              {/* colored icon badge */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${c.iconBg}`}
              >
                <c.icon size={18} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* orders card: filters + table */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        {cancelSuccessMessage && (
          // post-cancel refund success banner
          <p className="mb-4 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
            {cancelSuccessMessage}
          </p>
        )}

        {/* search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* search input, grows to fill space */}
          <div className="relative flex-1">
            {/* search icon inside input */}
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-600"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or product name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-9 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
            {search && (
              // clear the search box without selecting the text first
              <button
                onClick={() => setSearch("")}
                title="Clear search"
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {CUSTOMER_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* active filter summary + how many rows are showing */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium">
            Showing {filtered.length} of {orders.length} orders
          </span>
          {search && (
            // search term chip, click to remove it
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-200"
            >
              Search: "{search}"
              <X size={12} />
            </button>
          )}
          {statusFilter !== "All Status" && (
            // status filter chip, click to remove it
            <button
              onClick={() => setStatusFilter("All Status")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-200"
            >
              Status: {statusFilter}
              <X size={12} />
            </button>
          )}
        </div>

        {/* orders table, desktop and tablet */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
          <table className="w-full table-fixed text-left text-sm">
            {/* fixed column widths so nothing can push the table sideways */}
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[27%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              {/* table header row */}
              <tr className="text-[11px] font-bold tracking-wide text-black uppercase">
                <th className={TH}>Order ID</th>
                <th className={TH}>Date</th>
                <th className={TH}>Items</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((order) => (
                // order row
                <tr
                  key={order.orderId}
                  className="align-top transition-colors hover:bg-slate-50"
                >
                  {/* order id cell */}
                  <td className="px-3 py-4 break-words">
                    <p className="font-semibold break-words text-blue-600">
                      {order.id}
                    </p>
                    {order.isReplacement && (
                      // replacement note
                      <p className="mt-1 text-[11px] text-indigo-500">
                        Replacement for {order.replacementForOrderNumber}
                      </p>
                    )}
                  </td>
                  {/* date cell */}
                  <td className="px-3 py-4 break-words text-slate-700">{formatDate(order.date)}</td>
                  {/* ordered product names cell */}
                  <td className="px-3 py-4 break-words text-slate-600">
                    {/* full list on hover, in case a long order gets clamped */}
                    <p className="break-words" title={itemNames(order)}>
                      {itemNames(order)}
                    </p>
                  </td>
                  {/* status badge cell */}
                  <td className="px-3 py-4 break-words">
                    <StatusCell order={order} />
                  </td>
                  {/* amount + payment method + payment state cell */}
                  <td className="px-3 py-4 break-words text-right break-words">
                    <AmountCell order={order} />
                  </td>
                  {/* action buttons cell */}
                  <td className="px-3 py-4 break-words">
                    <OrderActions
                      order={order}
                      onCancel={openCancelModal}
                      onTrack={handleTrack}
                      onInvoice={handleInvoice}
                      onReturn={onReturnOrder}
                      onDelete={openDeleteModal}
                    />
                  </td>
                </tr>
              ))}
              {isLoading &&
                // placeholder rows while the list loads
                [0, 1, 2, 3].map((row) => (
                  <tr key={`skeleton-${row}`}>
                    {["w-20", "w-24", "w-32", "w-20", "w-16", "w-28"].map(
                      (w, cell) => (
                        <td key={cell} className="px-4 py-5">
                          <SkeletonBar className={w} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={6}>
                    <EmptyState onReset={resetFilters} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* same orders as stacked cards on phones, so nothing needs sideways scrolling */}
        <div className="space-y-3 lg:hidden">
          {filtered.map((order) => (
            // one order card
            <div
              key={order.orderId}
              className="rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              {/* card header: order id + date, status on the right */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-600">{order.id}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{formatDate(order.date)}</p>
                  {order.isReplacement && (
                    // replacement note
                    <p className="mt-1 text-[11px] text-indigo-500">
                      Replacement for {order.replacementForOrderNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <StatusCell order={order} />
                </div>
              </div>

              {/* ordered product names */}
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                {itemNames(order)}
              </p>

              {/* amount block */}
              <div className="mt-3 text-sm">
                <AmountCell order={order} />
              </div>

              {/* card actions */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <OrderActions
                  order={order}
                  align="justify-start"
                  onCancel={openCancelModal}
                  onTrack={handleTrack}
                  onInvoice={handleInvoice}
                  onReturn={onReturnOrder}
                  onDelete={openDeleteModal}
                />
              </div>
            </div>
          ))}
          {isLoading &&
            // placeholder cards while the list loads
            [0, 1, 2].map((card) => (
              <div
                key={`skeleton-card-${card}`}
                className="space-y-3 rounded-xl border border-slate-200 p-4"
              >
                <SkeletonBar className="w-24" />
                <SkeletonBar className="w-40" />
                <SkeletonBar className="w-20" />
              </div>
            ))}
          {!isLoading && filtered.length === 0 && (
            // empty state card
            <div className="rounded-xl border border-slate-200">
              <EmptyState onReset={resetFilters} />
            </div>
          )}
        </div>
      </div>

      {invoiceOrderId && (
        // invoice modal, closes by clearing the selected order id
        <InvoiceModal
          invoice={invoice}
          isLoading={isInvoiceLoading}
          error={invoiceError}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}

      {/* cancel confirm modal — owns the refund method choice for a paid order */}
      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onCancelled={handleCancelled}
        />
      )}
      {/* delete confirm modal */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            {/* modal header */}
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">
                Delete Order
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Are you sure you want to delete {deletingOrder.id}? This cannot
                be undone.
              </p>
            </div>
            <div className="px-6 py-4">
              {deleteError && (
                // delete error message
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  {deleteError}
                </p>
              )}
              {/* keep / confirm delete buttons */}
              <div className="flex gap-3">
                {/* dismiss modal, keep order */}
                <button
                  type="button"
                  onClick={() => setDeletingOrder(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Keep Order
                </button>
                {/* confirm delete */}
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* track order modal */}
      {selectedTrackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* modal header */}
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Track Order
                </h3>
                <p className="mt-0.5 text-sm text-slate-700">
                  {selectedTrackingOrder.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrackingOrder(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* modal content */}
            <div className="px-6 py-6">
              {isTracking || !trackedOrder ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-sm text-slate-700">
                    Loading tracking info...
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* current status section */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Current Status
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-700">
                      {toCustomerStatus(trackedOrder.tracking.currentStatus)}
                    </p>
                    {trackedOrder.tracking.rider ? (
                      <div className="mt-3 space-y-1.5 text-sm text-blue-700">
                        <p className="flex items-center gap-2">
                          <MapPin size={14} className="shrink-0" />
                          <span className="font-semibold">
                            {trackedOrder.tracking.rider.name}
                          </span>
                        </p>
                        <p className="flex items-center gap-2 pl-6">
                          <span>{trackedOrder.tracking.rider.phone}</span>
                        </p>
                        <p className="flex items-center gap-2 pl-6">
                          <span>{trackedOrder.tracking.rider.area}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-blue-700">
                        No delivery rider assigned yet.
                      </p>
                    )}
                  </div>

                  {/* order timeline section */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-4">
                      Order Timeline
                    </h4>
                    <OrderTrackingTimeline
                      history={trackedOrder.tracking.history}
                      refund={trackedOrder.tracking.refund}
                      replacementOrder={trackedOrder.tracking.replacementOrder}
                      replacementForOrderNumber={
                        trackedOrder.isReplacement
                          ? trackedOrder.replacementForOrderNumber
                          : null
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
