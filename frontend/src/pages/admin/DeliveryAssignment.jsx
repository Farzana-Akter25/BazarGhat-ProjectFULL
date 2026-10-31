import { CheckCircle2, ClipboardList, Clock3, Eye, LoaderCircle, MoreVertical, Plus, Search as SearchIcon, X } from "lucide-react"; // icons for stats, table, modal
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom"; // "?assign=RET-..." deep link from Return & Refund
import { StatCard, StatusBadge } from "../../components/admin/AdminUI"; // shared stat card + status pill
import InvoiceModal from "../../components/shared/InvoiceModal"; // order details/invoice viewer popup
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import {
  useGetDeliveryAssignmentsQuery,
  useCreateDeliveryAssignmentMutation,
} from "../../features/admin/deliveryAssignmentApi";
import { useGetOrdersQuery } from "../../features/admin/orderApi";
import { useGetDeliveryStaffQuery } from "../../features/admin/deliveryApi";
import { useLazyGetInvoiceQuery } from "../../features/admin/invoiceApi";
import { isReturnPickupAssignable, toDeliveryStatus } from "../../utils/orderStatus";
import { formatDate } from "../../utils/formatDate";
import { shortId } from "../../utils/shortId";
import { TD, TH } from "../../components/shared/DataTable"; // shared table cell styles

// status filter dropdown options — a new assignment reads "Assigned" until the rider acts on it ("Pending" only appears on rows created before that wording)
const STATUSES = ["All Status", "Assigned", "In Progress", "Completed", "Pending"];

// assignment still holding the order: the rider has neither declined it nor had it rejected at the customer's door, so the order must not be assigned again.
const SETTLED_RIDER_STATUSES = [
  "Failed",
  "Customer Rejected at Doorstep",
  "Delivered",
  "Return Picked Up",
];
// True while an assignment is still running (not finished or failed)
const HOLDS_ORDER = (riderStatus) => !SETTLED_RIDER_STATUSES.includes(riderStatus);

// The assign time as two pieces — "12-09-2026" and "12:15 AM".
const splitDateTime = (value) => {
  // Formatted date split at the comma
  const text = formatDate(value);
  const [date, ...rest] = text.split(",");
  return { date: date.trim(), time: rest.join(",").trim() };
};

// small initials avatar for a rider name
const RiderAvatar = ({ name }) => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
    {name
      .split(" ")
      .map((n) => n[0])
      .join("")}
  </div>
);

// Admin page for assigning orders and return pickups to delivery men
const DeliveryAssignment = () => {
  // refetched on every visit, so an order a rider has just rejected is offered again
  const { data: assignments = [], isLoading } = useGetDeliveryAssignmentsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  }); // assignment list from api
  const { data: orders = [] } = useGetOrdersQuery(undefined, { refetchOnMountOrArgChange: true }); // orders available to assign
  const { data: deliveryStaff = [] } = useGetDeliveryStaffQuery(); // riders available to assign
  const [createDeliveryAssignment, { isLoading: isAssigning }] = useCreateDeliveryAssignmentMutation(); // create assignment mutation
  const [fetchInvoice, { data: invoice, isFetching: isInvoiceLoading, error: invoiceError }] = useLazyGetInvoiceQuery(); // order details fetch on demand

  // Return & Refund Management links here as "?assign=RET-...".
  const [searchParams] = useSearchParams();
  // Order id passed in the URL (?assign=...) to open the assign form directly
  const assignRequest = searchParams.get("assign");

  const [rider, setRider] = useState("All Delivery Men"); // rider filter select
  const [status] = useState("All Status"); // status filter (dropdown removed, always shows all)
  const [query, setQuery] = useState(""); // search text
  const [showAssignModal, setShowAssignModal] = useState(Boolean(assignRequest)); // new assignment modal toggle
  const [assignOrderId, setAssignOrderId] = useState(""); // selected order in modal
  const [assignRiderId, setAssignRiderId] = useState(""); // selected rider in modal
  const [orderQuery, setOrderQuery] = useState(assignRequest ?? ""); // search text for the modal's order list
  const [assignError, setAssignError] = useState(""); // why the last assign attempt was refused
  // Orders assigned during this visit to the page.
  const [justAssignedOrderIds, setJustAssignedOrderIds] = useState(() => new Set());
  const [detailsAssignmentId, setDetailsAssignmentId] = useState(null); // assignment whose order details modal is open

  // open the order details modal and fetch invoice data
  const viewOrderDetails = (assignment) => {
    setDetailsAssignmentId(assignment.id);
    fetchInvoice(assignment.orderDbId);
  };

  // An order a rider is still holding can never be handed to a second rider, no matter how the admin reaches it.
  const heldOrderIds = useMemo(
    () => new Set(assignments.filter((a) => HOLDS_ORDER(a.riderStatus)).map((a) => a.orderDbId)),
    [assignments],
  );

  // Orders assigned this visit that the assignment list has not caught up with yet; once it has, its own rider status decides.
  const pendingAssignedOrderIds = useMemo(() => {
    // Orders just assigned that are not in the list yet
    const listed = new Set(assignments.map((a) => a.orderDbId));
    return new Set([...justAssignedOrderIds].filter((id) => !listed.has(id)));
  }, [assignments, justAssignedOrderIds]);

  // Orders whose latest run the rider rejected or failed — back on the desk, so offered like a fresh order.
  const riderDeclinedOrderIds = useMemo(() => {
    // Latest assignment for each order
    const latestByOrder = new Map();
    assignments.forEach((a) => {
      const current = latestByOrder.get(a.orderDbId);
      if (!current || a.id > current.id) latestByOrder.set(a.orderDbId, a);
    });
    return new Set(
      [...latestByOrder.values()].filter((a) => a.riderStatus === "Failed").map((a) => a.orderDbId),
    );
  }, [assignments]);

  // Every order that has been through a rider at all, whoever it ended with.
  const everAssignedOrderIds = useMemo(
    () => new Set([...assignments.map((a) => a.orderDbId), ...pendingAssignedOrderIds]),
    [assignments, pendingAssignedOrderIds],
  );

  // A rider gets an order on one of two errands.
  const assignableOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (isReturnPickupAssignable(o.status) ||
            (o.status === "Confirmed" && !o.isReplacement)) &&
          !heldOrderIds.has(o.orderId) &&
          !pendingAssignedOrderIds.has(o.orderId),
      ),
    [orders, heldOrderIds, pendingAssignedOrderIds],
  );

  // What the dropdown actually offers.
  const searchedOrders = useMemo(() => {
    // Orders shown by default (never assigned, declined by the rider, etc.)
    const isRoutine = (o) =>
      !everAssignedOrderIds.has(o.orderId) ||
      riderDeclinedOrderIds.has(o.orderId) ||
      isReturnPickupAssignable(o.status);
    // Search text; with no search show only the default orders
    const q = orderQuery.trim().toLowerCase();
    if (!q) return assignableOrders.filter(isRoutine);
    return assignableOrders.filter((o) => {
      const matchesId =
        o.id?.toLowerCase().includes(q) || o.returnRequestId?.toLowerCase().includes(q);
      if (!isRoutine(o)) return matchesId;
      return matchesId || [o.customer, o.area].some((field) => field?.toLowerCase().includes(q));
    });
  }, [assignableOrders, everAssignedOrderIds, riderDeclinedOrderIds, orderQuery]);

  // rider filter dropdown options: every delivery man on record.
  const deliveryMen = useMemo(() => {
    // Unique delivery man names for the filter
    const names = new Set(
      [...deliveryStaff.map((s) => s.name), ...assignments.map((a) => a.rider)].filter(Boolean),
    );
    return ["All Delivery Men", ...[...names].sort((a, b) => a.localeCompare(b))];
  }, [deliveryStaff, assignments]);

  // stat card counts
  const counts = useMemo(
    () => ({
      total: assignments.length,
      // only runs that actually reached the customer — a rejected or failed run is not a completion
      completed: assignments.filter((a) => a.riderStatus === "Delivered").length,
      inProgress: assignments.filter((a) => a.status === "In Progress").length,
      // handed to a rider but not started yet ("Pending" is the old wording for it)
      assigned: assignments.filter((a) => a.status === "Assigned" || a.status === "Pending").length,
    }),
    [assignments],
  );

  // assignments matching search text, rider filter, status filter
  const filtered = useMemo(
    () =>
      assignments.filter((a) => {
        // Keep assignments matching the search, rider and status filters
        const q = query.toLowerCase();
        const matchesQuery =
          !query ||
          a.orderId.toLowerCase().includes(q) ||
          // a collection run is findable by the return it was raised on
          a.returnRequestId?.toLowerCase().includes(q) ||
          a.customer.toLowerCase().includes(q);
        const matchesRider = rider === "All Delivery Men" || a.rider === rider;
        const matchesStatus = status === "All Status" || a.status === status;
        return matchesQuery && matchesRider && matchesStatus;
      }),
    [assignments, query, rider, status],
  );

  // close the modal and clear what was typed/picked in it
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignOrderId("");
    setAssignRiderId("");
    setOrderQuery("");
    setAssignError("");
  };

  // Submit new assignment from modal.
  const handleCreateAssignment = async () => {
    if (!assignOrderId || !assignRiderId || isAssigning) return;
    setAssignError("");
    // Send the assignment to the server
    const orderDbId = Number(assignOrderId);
    try {
      await createDeliveryAssignment({
        order_id: assignOrderId,
        delivery_profile_id: assignRiderId,
      }).unwrap();
      setJustAssignedOrderIds((prev) => new Set(prev).add(orderDbId));
      closeAssignModal();
    } catch (err) {
      // Show the first validation error, or the server message
      const errors = err?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setAssignError(firstError || err?.data?.message || "Failed to assign this order.");
    }
  };

  return (
    <AdminLayout title="Delivery Assignment" subtitle="Assign orders to delivery personnel">
      {/* stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} iconBg="bg-blue-500" label="Total Assignments" value={counts.total} />
        <StatCard icon={CheckCircle2} iconBg="bg-green-700" label="Completed" value={counts.completed} />
        <StatCard icon={LoaderCircle} iconBg="bg-orange-500" label="In Progress" value={counts.inProgress} />
        <StatCard icon={Clock3} iconBg="bg-red-500" label="Assigned" value={counts.assigned} />
      </div>

      {/* filter bar */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* delivery man filter field */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Delivery Man</label>
            <select
              value={rider}
              onChange={(e) => setRider(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-700"
            >
              {deliveryMen.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          {/* new assignment trigger button */}
          <div className="flex items-end">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={16} />
              New Assignment
            </button>
          </div>
        </div>
      </div>

      {/* assignments list card */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        {/* card title + search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-slate-800">Assignments List</h3>
          <div className="relative w-full sm:w-72">
            {/* search icon inside input */}
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by order ID, return ID, customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
        </div>

        {/* assignments table, desktop and large tablet */}
        {/* fixed column widths, so a long name or status can never push the table wider than the card — the page only scrolls up and down */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[17%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              {/* table header row */}
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Order ID</th>
                <th className={TH}>Customer</th>
                <th className={TH}>Delivery Man</th>
                <th className={TH}>Area</th>
                <th className={TH}>Assign Time</th>
                <th className={TH}>Status</th>
                <th className={TH}>Delivery Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => (
                // assignment row — keyed on the assignment, not the order: a rejected order reassigned to another rider has two rows for the same order
                <tr key={a.id} className="align-top hover:bg-slate-50">
                  {/* order id cell — shortened, full number on hover */}
                  <td className={`${TD} font-semibold text-blue-500`} title={a.orderId}>
                    {shortId(a.orderId)}
                  </td>
                  {/* customer name + phone cell */}
                  <td className={TD}>
                    <p className="font-medium text-slate-700">{a.customer}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{a.customerPhone}</p>
                  </td>
                  {/* rider avatar + name cell */}
                  <td className={TD}>
                    <div className="flex items-start gap-2">
                      <RiderAvatar name={a.rider} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700">{a.rider}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{a.riderPhone}</p>
                      </div>
                    </div>
                  </td>
                  {/* delivery area cell */}
                  <td className={`${TD} text-slate-700`}>{a.area}</td>
                  {/* assign time cell — the clock time sits under the date, so a narrow column never breaks the date itself across lines */}
                  <td className={`${TD} text-slate-700`}>
                    <p className="whitespace-nowrap">{splitDateTime(a.time).date}</p>
                    {splitDateTime(a.time).time && (
                      <p className="mt-0.5 whitespace-nowrap text-xs text-slate-600">
                        {splitDateTime(a.time).time}
                      </p>
                    )}
                  </td>
                  {/* order status badge cell */}
                  <td className={TD}>
                    <StatusBadge status={a.status} wrap />
                  </td>
                  {/* rider status badge cell */}
                  <td className={TD}>
                    <StatusBadge status={toDeliveryStatus(a.riderStatus)} wrap />
                  </td>
                  {/* action buttons cell */}
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      {/* view order details button */}
                      <button
                        onClick={() => viewOrderDetails(a)}
                        className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                      >
                        <Eye size={13} />
                        View
                      </button>
                      {/* more options button */}
                      <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                // loading row
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                    Loading assignments...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                // empty state row
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                    No assignments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* the same assignments as cards, for screens too narrow to hold eight columns — the row stacks instead of being squeezed */}
        <div className="space-y-3 lg:hidden">
          {filtered.map((a) => (
            // one assignment card
            <div key={a.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
              {/* card header: order id + assign time, status pills on the right */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-blue-500" title={a.orderId}>
                    {shortId(a.orderId)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{formatDate(a.time)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={a.status} />
                  <StatusBadge status={toDeliveryStatus(a.riderStatus)} />
                </div>
              </div>

              {/* customer name + phone + area */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-700">{a.customer}</p>
                <p className="text-xs text-slate-600">{a.customerPhone}</p>
                {a.area && <p className="text-xs break-words text-slate-600">{a.area}</p>}
              </div>

              {/* rider on the run */}
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <RiderAvatar name={a.rider} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">{a.rider}</p>
                  <p className="text-xs text-slate-600">{a.riderPhone}</p>
                </div>
              </div>

              {/* card actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => viewOrderDetails(a)}
                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                >
                  <Eye size={13} />
                  View
                </button>
                <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                  <MoreVertical size={15} />
                </button>
              </div>
            </div>
          ))}
          {isLoading && (
            // loading card
            <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-600">
              Loading assignments...
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            // empty state card
            <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-600">
              No assignments match your filters.
            </div>
          )}
        </div>

        {/* results count footer */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
          <p className="text-xs text-slate-600">
            Showing {filtered.length} of {assignments.length} entries
          </p>
        </div>
      </div>

      {/* new assignment modal */}
      {showAssignModal && (
        // modal overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          {/* modal panel */}
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-900">New Assignment</h2>
              {/* close button */}
              <button
                onClick={closeAssignModal}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            {/* modal form body */}
            <div className="space-y-4 px-6 py-5">
              {/* why the last assign attempt was refused */}
              {assignError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {assignError}
                </p>
              )}
              {/* order search + select field */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Order
                </label>
                {/* search box over the confirmed, not-yet-assigned orders below */}
                <div className="relative mb-2">
                  <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={orderQuery}
                    onChange={(e) => {
                      setOrderQuery(e.target.value);
                      setAssignOrderId("");
                    }}
                    type="text"
                    placeholder="Search order ID, return ID, customer, area..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-700 focus:bg-white"
                  />
                </div>
                <select
                  value={assignOrderId}
                  onChange={(e) => setAssignOrderId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                >
                  <option value="">
                    {searchedOrders.length === 0 ? "No order found" : "Select an order"}
                  </option>
                  {/* each option carries the customer's delivery area so admin can pick a rider who covers it, and marks a collection run so it is never picked in the belief it is a delivery */}
                  {searchedOrders.map((o) => (
                    <option key={o.orderId} value={o.orderId}>
                      {shortId(o.id)} — {o.customer}
                      {o.area ? ` · ${o.area}` : ""}
                      {isReturnPickupAssignable(o.status)
                        ? ` · Return Pickup${o.returnRequestId ? ` (${o.returnRequestId})` : ""}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              {/* rider select field */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Delivery Man
                </label>
                <select
                  value={assignRiderId}
                  onChange={(e) => setAssignRiderId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                >
                  <option value="">Select a rider</option>
                  {/* rider options show the area they cover and how many deliveries they have completed, instead of their staff code */}
                  {deliveryStaff
                    .filter((s) => s.status === "Active")
                    .map((s) => (
                      <option key={s.profileId} value={s.profileId}>
                        {s.name}
                        {s.area ? ` · ${s.area}` : ""} · {s.deliveries || 0} delivered
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {/* modal footer actions */}
            <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
              {/* cancel button */}
              <button
                onClick={closeAssignModal}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              {/* confirm assign button */}
              <button
                onClick={handleCreateAssignment}
                disabled={!assignOrderId || !assignRiderId || isAssigning}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* order details modal */}
      {detailsAssignmentId && (
        <InvoiceModal
          invoice={invoice}
          isLoading={isInvoiceLoading}
          error={invoiceError}
          onClose={() => setDetailsAssignmentId(null)}
        />
      )}
    </AdminLayout>
  );
};

export default DeliveryAssignment;
