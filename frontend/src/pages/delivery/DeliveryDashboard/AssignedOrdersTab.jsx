import {
  AlertTriangle,
  CircleCheck,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react"; // stat card, meta and row action icons
import { useMemo, useState } from "react";
import InvoiceModal from "../../../components/shared/InvoiceModal";
import {
  useAcceptAssignmentMutation,
  useGetAssignedOrdersQuery,
  useLazyGetAssignedOrderInvoiceQuery,
  useRejectAssignmentMutation,
  useUpdateAssignedOrderStatusMutation,
} from "../../../features/delivery/deliveryApi";
import { DELIVERY_STATUS_FILTERS, toDeliveryStatus } from "../../../utils/orderStatus";
import ReportIssueTab from "./ReportIssueTab";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../../utils/formatDate";
import { TH } from "../../../components/shared/DataTable"; // shared table header cell style

// fixed doorstep-rejection reasons — must match OrderStatusService::DOORSTEP_REJECTION_REASONS on the backend
const DOORSTEP_REJECTION_REASONS = [
  "Customer Refused",
  "Customer Unavailable",
  "Wrong Product",
  "Product Damaged",
  "Quantity Mismatch",
  "Other",
];

// statuses that mean the order is on its way to the customer
const IN_TRANSIT_STATUSES = ["Picked Up", "Out for Delivery"];

// A rider can flag a problem once the run is actually under way.
const canReportIssue = (order) =>
  ["Picked Up", "Out for Delivery", "Delivered", "Return Picked Up"].includes(
    order.status,
  ) || (order.type === "Return Pickup" && order.accepted);

// avatar initials from name
const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

// Delivery man's assigned orders with accept/reject and status updates
const AssignedOrdersTab = () => {
  const { data: orders = [], isLoading } = useGetAssignedOrdersQuery(); // orders assigned to this delivery man
  const [updateStatus] = useUpdateAssignedOrderStatusMutation(); // advance order status
  const [acceptAssignment] = useAcceptAssignmentMutation(); // accept assigned order
  const [rejectAssignment, { isLoading: isRejecting }] = useRejectAssignmentMutation(); // reject assigned order
  const [fetchInvoice, { data: invoice, isFetching: isInvoiceLoading, error: invoiceError }] =
    useLazyGetAssignedOrderInvoiceQuery();
  const [query, setQuery] = useState(""); // search box text
  const [filter, setFilter] = useState("All"); // active status filter
  const [reportingAssignmentId, setReportingAssignmentId] = useState(null); // assignment being issue-reported
  const [rejectingAssignmentId, setRejectingAssignmentId] = useState(null); // assignment pending reject confirm
  const [rejectReason, setRejectReason] = useState(""); // reject reason textarea
  const [doorstepAssignmentId, setDoorstepAssignmentId] = useState(null); // assignment pending doorstep rejection
  const [doorstepReason, setDoorstepReason] = useState(""); // doorstep rejection reason (dropdown)
  const [doorstepNote, setDoorstepNote] = useState(""); // doorstep rejection optional note
  const [customerOrderId, setCustomerOrderId] = useState(null); // order shown in customer details modal
  const [invoiceOrderId, setInvoiceOrderId] = useState(null); // order shown in invoice modal

  // stat card counts, same summary row the admin/customer order pages open with
  const counts = useMemo(
    () => ({
      total: orders.length,
      inTransit: orders.filter((o) => IN_TRANSIT_STATUSES.includes(o.status))
        .length,
      // A collected return is a completed run too — it just ended with the goods coming back rather than going out.
      delivered: orders.filter((o) =>
        ["Delivered", "Return Picked Up"].includes(o.status),
      ).length,
      rejected: orders.filter((o) =>
        ["Failed", "Customer Rejected at Doorstep"].includes(o.status),
      ).length,
    }),
    [orders],
  );

  // orders after search + status filter
  const filtered = useMemo(() => {
    // Filter by status and search text
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesFilter = filter === "All" || toDeliveryStatus(o.status) === filter;
      const matchesQuery =
        !q ||
        o.customer.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [orders, query, filter]);

  // push a status update for one order
  const handleUpdateStatus = (assignmentId, status) => {
    updateStatus({ assignmentId, status });
  };

  // open the reject-order dialog
  const openRejectDialog = (assignmentId) => {
    setRejectingAssignmentId(assignmentId);
    setRejectReason("");
  };

  // close the reject-order dialog
  const closeRejectDialog = () => {
    setRejectingAssignmentId(null);
    setRejectReason("");
  };

  // submit reject with reason
  const confirmReject = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    if (rejectingAssignmentId) {
      rejectAssignment({ assignmentId: rejectingAssignmentId, reason: rejectReason });
    }
    closeRejectDialog();
  };

  // open the doorstep-rejection dialog
  const openDoorstepDialog = (assignmentId) => {
    setDoorstepAssignmentId(assignmentId);
    setDoorstepReason("");
    setDoorstepNote("");
  };

  // close the doorstep-rejection dialog
  const closeDoorstepDialog = () => {
    setDoorstepAssignmentId(null);
    setDoorstepReason("");
    setDoorstepNote("");
  };

  // submit doorstep rejection with reason + optional note
  const confirmDoorstepRejection = (e) => {
    e.preventDefault();
    if (!doorstepReason) return;
    if (doorstepAssignmentId) {
      updateStatus({
        assignmentId: doorstepAssignmentId,
        status: "Customer Rejected at Doorstep",
        reason: doorstepReason,
        note: doorstepNote.trim() || undefined,
      });
    }
    closeDoorstepDialog();
  };

  // open invoice modal + fetch invoice data
  const handleViewInvoice = (order) => {
    setInvoiceOrderId(order.id);
    fetchInvoice(order.assignmentId);
  };

  // Every row dialog is keyed on the assignment, not the order number.
  const rejectingOrder = orders.find((o) => o.assignmentId === rejectingAssignmentId); // assignment in the reject dialog
  const doorstepOrder = orders.find((o) => o.assignmentId === doorstepAssignmentId); // assignment in the doorstep-rejection dialog
  const reportingOrder = orders.find((o) => o.assignmentId === reportingAssignmentId); // assignment handed to ReportIssueTab
  const customerOrder = orders.find((o) => o.id === customerOrderId); // order shown in customer modal

  // swap to the report-issue screen for this order
  if (reportingOrder) {
    return (
      <ReportIssueTab
        order={reportingOrder}
        onBack={() => setReportingAssignmentId(null)}
      />
    );
  }

  return (
    <div>
      {/* page heading, mirrors the admin/customer order page title block */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
          Assigned Orders
        </h1>
        <p className="text-sm text-slate-600">
          {orders.length} orders assigned by admin
        </p>
      </div>

      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ClipboardList,
            iconBg: "bg-slate-700",
            label: "Total Assigned",
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
            label: "Rejected",
            value: counts.rejected,
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or order ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* status filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {DELIVERY_STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* orders table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              {/* table header row */}
              <tr className="text-[11px] font-bold tracking-wide text-black uppercase">
                <th className={TH}>Order ID</th>
                <th className={TH}>Customer</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Date</th>
                <th className={TH}>Items</th>
                <th className={TH}>Status</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((order) => (
                // One order can appear twice — the run that delivered it and the run that went back to collect a return are two rows carrying the same order number.
                <tr key={order.assignmentId} className="hover:bg-slate-50">
                  {/* order id cell */}
                  <td className="px-3 py-3 break-words font-semibold text-blue-500">
                    {order.id}
                  </td>
                  {/* customer name + delivery address cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-medium text-orange-500">
                      {order.customer}
                    </p>
                    <p className="mt-1 flex max-w-[200px] items-start gap-1 text-[11px] text-slate-600">
                      <MapPin size={11} className="mt-0.5 shrink-0" />
                      {order.address}
                    </p>
                  </td>
                  {/* click-to-call phone cell */}
                  <td className="px-3 py-3 break-words">
                    <a
                      href={`tel:${order.phone}`}
                      className="font-medium text-slate-700 hover:text-green-700"
                    >
                      {order.phone}
                    </a>
                  </td>
                  {/* date cell */}
                  <td className="px-3 py-3 break-words text-slate-700">{formatDate(order.date)}</td>
                  {/* item count cell, plus the replacement to hand over on a collection run. */}
                  <td className="px-3 py-3 break-words text-slate-700">
                    {order.items} items
                    {order.replacement && (
                      <p className="mt-1 max-w-[200px] text-[11px] font-semibold text-purple-600">
                        Carry replacement {order.replacement.orderNumber}
                        {order.replacement.product
                          ? `: ${order.replacement.product} x${order.replacement.qty}`
                          : ""}
                      </p>
                    )}
                  </td>
                  {/* status badge cell */}
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={toDeliveryStatus(order.status)} />
                  </td>
                  {/* amount cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-bold text-slate-800">
                      {order.amount} BDT
                    </p>
                    {order.walletAmount > 0 && (
                      // part already paid from the customer's wallet, so the rider only collects the rest in cash
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        Wallet {order.walletAmount} BDT
                        {order.paymentMethod === "Cash on Delivery" &&
                          ` · Collect ${order.amount - order.walletAmount} BDT`}
                      </p>
                    )}
                  </td>
                  {/* action buttons cell */}
                  <td className="px-3 py-3 break-words">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* accept / reject when newly assigned */}
                      {order.status === "Assigned" && !order.accepted && (
                        <>
                          <button
                            onClick={() => acceptAssignment(order.assignmentId)}
                            title="Accept Order"
                            className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => openRejectDialog(order.assignmentId)}
                            title="Reject Order"
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {/* A return pickup is a collection run, not a delivery run. */}
                      {order.type === "Return Pickup" &&
                        order.status === "Assigned" &&
                        order.accepted && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                order.assignmentId,
                                "Return Picked Up",
                              )
                            }
                            title="Confirm the returned item has been collected — and the replacement, if any, handed over"
                            className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-100"
                          >
                            Mark Return Collected
                          </button>
                        )}
                      {/* mark picked up once accepted */}
                      {order.type !== "Return Pickup" &&
                        order.status === "Assigned" &&
                        order.accepted && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(order.assignmentId, "Picked Up")
                            }
                            title="Move to Picked Up"
                            className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Mark Picked Up
                          </button>
                        )}
                      {/* start out for delivery */}
                      {order.status === "Picked Up" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              order.assignmentId,
                              "Out for Delivery",
                            )
                          }
                          title="Move to Out for Delivery"
                          className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Out for Delivery
                        </button>
                      )}
                      {/* mark delivered / doorstep rejection */}
                      {order.status === "Out for Delivery" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                order.assignmentId,
                                "Delivered",
                              )
                            }
                            title="Move to Delivered"
                            className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Mark Delivered
                          </button>
                          <button
                            onClick={() => openDoorstepDialog(order.assignmentId)}
                            title="Customer Rejected at Doorstep"
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                          >
                            Doorstep Reject
                          </button>
                        </>
                      )}
                      {/* open customer details modal */}
                      <button
                        onClick={() => setCustomerOrderId(order.id)}
                        title="View Customer Details"
                        className="rounded-lg bg-orange-50 p-1.5 text-orange-500 hover:bg-orange-100"
                      >
                        <User size={14} />
                      </button>
                      {/* view invoice */}
                      <button
                        onClick={() => handleViewInvoice(order)}
                        title="View & Download Invoice"
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100"
                      >
                        <FileText size={14} />
                      </button>
                      {/* report issue, once the run is under way — a return pickup gets the same button as a delivery */}
                      {canReportIssue(order) && (
                        <button
                          onClick={() => setReportingAssignmentId(order.assignmentId)}
                          title="Report an Issue"
                          className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                        >
                          <AlertTriangle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                // loading row
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    Loading assigned orders...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    No orders match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* reject order modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <form onSubmit={confirmReject}>
              {/* modal header */}
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-bold text-slate-800">
                  Reject Order
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Tell admin why you're rejecting {rejectingOrder.id}. This will
                  be visible on the admin dashboard.
                </p>
              </div>
              {/* reason textarea */}
              <div className="px-6 py-5">
                <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                  Reason
                </label>
                <textarea
                  required
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Vehicle breakdown, wrong address, too far..."
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>
              {/* cancel / confirm buttons */}
              <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeRejectDialog}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* doorstep rejection modal */}
      {doorstepOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <form onSubmit={confirmDoorstepRejection}>
              {/* modal header */}
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-bold text-slate-800">
                  Doorstep Rejection
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  The customer refused {doorstepOrder.id} during delivery
                  inspection. This order will not be marked delivered — admin
                  will review it. A reason is required.
                </p>
              </div>
              {/* what was paid on this order, and what that means for a refund */}
              {doorstepOrder && (
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-700">
                  <div className="flex justify-between gap-2">
                    <span>{doorstepOrder.paymentMethod}</span>
                    <span className="font-bold text-slate-900">
                      ৳{doorstepOrder.amount}
                    </span>
                  </div>
                  <p className="mt-1 leading-snug text-slate-600">
                    {doorstepOrder.paymentMethod === "Cash on Delivery"
                      ? doorstepOrder.walletAmount > 0
                        ? `Do not collect the ৳${doorstepOrder.amount - doorstepOrder.walletAmount} cash. The ৳${doorstepOrder.walletAmount} paid from the customer's wallet goes back to their wallet when admin cancels the order.`
                        : "Do not collect this cash. Nothing was paid, so nothing is refundable."
                      : "Already paid — admin handles the refund when this rejection is reviewed."}
                  </p>
                </div>
              )}

              {/* reason dropdown + optional note */}
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    Rejection Reason
                  </label>
                  <select
                    required
                    autoFocus
                    value={doorstepReason}
                    onChange={(e) => setDoorstepReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="" disabled>
                      Select a reason...
                    </option>
                    {DOORSTEP_REJECTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  {doorstepReason === "Product Damaged" && (
                    <p className="mt-1.5 text-[11px] text-amber-600">
                      This quantity will be moved to Damaged Stock, not back to
                      Available Stock.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    Note (optional)
                  </label>
                  <textarea
                    value={doorstepNote}
                    onChange={(e) => setDoorstepNote(e.target.value)}
                    placeholder="Add any extra detail for admin..."
                    className="min-h-22.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
              {/* cancel / confirm buttons */}
              <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeDoorstepDialog}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!doorstepReason}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* customer details modal */}
      {customerOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">
                Customer Details
              </h3>
              <button
                onClick={() => setCustomerOrderId(null)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {/* avatar + name/id */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-700">
                  {initials(customerOrder.customer)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {customerOrder.customer}
                  </p>
                  <p className="text-xs text-slate-600">{customerOrder.id}</p>
                </div>
              </div>
              {/* contact + address list */}
              <div className="space-y-2.5 text-sm text-slate-600">
                {/* phone link */}
                <a
                  href={`tel:${customerOrder.phone}`}
                  className="flex items-center gap-2 hover:text-green-700"
                >
                  <Phone size={14} className="text-slate-600" />{" "}
                  {customerOrder.phone}
                </a>
                {/* email link, optional */}
                {customerOrder.email && (
                  <a
                    href={`mailto:${customerOrder.email}`}
                    className="flex items-center gap-2 hover:text-green-700"
                  >
                    <Mail size={14} className="text-slate-600" />{" "}
                    {customerOrder.email}
                  </a>
                )}
                {/* delivery address */}
                <p className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-slate-600" />
                  {customerOrder.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* invoice preview modal */}
      {invoiceOrderId && (
        <InvoiceModal
          invoice={invoice}
          isLoading={isInvoiceLoading}
          error={invoiceError}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}
    </div>
  );
};

export default AssignedOrdersTab;
