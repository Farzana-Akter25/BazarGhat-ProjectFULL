import {
  AlertCircle,
  Bike,
  Search as SearchIcon,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import OrderTrackingTimeline from "../../components/shared/OrderTrackingTimeline";
import {
  useGetComplaintsQuery,
  useRejectComplaintMutation,
  useRequestComplaintInfoMutation,
  useResolveComplaintMutation,
  useStartComplaintReviewMutation,
} from "../../features/admin/complaintApi";
import AdminLayout from "../../layouts/AdminLayout";
import { formatDate } from "../../utils/formatDate";
import { TH } from "../../components/shared/DataTable"; // shared table header cell style

// page heading per complaint side
const PAGES = {
  dm: {
    title: "Delivery Man Complaints",
    subtitle: "Complaints filed by delivery men against customers",
  },
  customer: {
    title: "Customer Complaints",
    subtitle: "Complaints filed by customers against delivery men or products",
  },
};

// status filter chip options
const STATUS_FILTERS = [
  "All Status",
  "Pending",
  "Under Review",
  "Waiting for Response",
  "Resolved",
  "Rejected",
  "Closed",
];

// name + code table cell
const PersonCell = ({ name, code }) => (
  <div>
    <p className="font-medium text-slate-700">{name}</p>
    {code && <p className="text-xs text-slate-600">{code}</p>}
  </div>
);

// kind: "customer" (default) or "dm" — each one is its own page under the sidebar's Complaint Management group, so a page only ever shows its own list.
const ComplaintManagement = ({ kind = "customer" }) => {
  // Which complaint page this is (delivery man or customer)
  const isDmPage = kind === "dm";
  const page = isDmPage ? PAGES.dm : PAGES.customer; // title + subtitle for this page
  // Load all complaints
  const { data, isLoading } = useGetComplaintsQuery();
  const dmComplaints = data?.dmComplaints || []; // delivery-man-filed complaints
  const customerComplaints = data?.customerComplaints || []; // customer-filed complaints
  const type = isDmPage ? "By Delivery Man" : "By Customer"; // the page decides which list it shows
  const [status, setStatus] = useState("All Status"); // active status filter
  const [query, setQuery] = useState(""); // search box text

  const [selectedId, setSelectedId] = useState(null); // complaint open in side panel
  const [selectedKind, setSelectedKind] = useState(null); // "dm" | "customer", which list selected came from
  const [actionMode, setActionMode] = useState(null); // null | 'requestInfo' | 'resolve' | 'reject'
  const [party, setParty] = useState("customer"); // who info is being requested from
  const [message, setMessage] = useState(""); // request-info message textarea
  const [note, setNote] = useState(""); // resolve/reject note textarea
  const [actionError, setActionError] = useState(null); // action failure message

  const [startReview, { isLoading: isStarting }] =
    useStartComplaintReviewMutation();
  const [requestInfo, { isLoading: isRequesting }] =
    useRequestComplaintInfoMutation();
  const [resolveComplaint, { isLoading: isResolving }] =
    useResolveComplaintMutation();
  const [rejectComplaint, { isLoading: isRejecting }] =
    useRejectComplaintMutation();

  // delivery-man complaints after search/status/type filters
  const filteredDm = useMemo(
    () =>
      dmComplaints.filter((c) => {
        // Keep complaints matching the search text, status and filer type
        const matchesQuery =
          !query ||
          c.id.toLowerCase().includes(query.toLowerCase()) ||
          c.deliveryMan.toLowerCase().includes(query.toLowerCase()) ||
          c.customer.toLowerCase().includes(query.toLowerCase()) ||
          c.orderId.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || c.status === status;
        const matchesType = type !== "By Customer";
        return matchesQuery && matchesStatus && matchesType;
      }),
    [dmComplaints, query, status, type],
  );

  // customer complaints after search/status/type filters
  const filteredCustomer = useMemo(
    () =>
      customerComplaints.filter((c) => {
        // Keep complaints matching the search text, status and filer type
        const matchesQuery =
          !query ||
          c.id.toLowerCase().includes(query.toLowerCase()) ||
          c.customer.toLowerCase().includes(query.toLowerCase()) ||
          c.against.toLowerCase().includes(query.toLowerCase()) ||
          c.orderId.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "All Status" || c.status === status;
        const matchesType = type !== "By Delivery Man";
        return matchesQuery && matchesStatus && matchesType;
      }),
    [customerComplaints, query, status, type],
  );

  // complaint currently shown in the side panel
  const selected = useMemo(() => {
    if (!selectedId) return null;
    // Find the open complaint in the right list
    const pool = selectedKind === "dm" ? dmComplaints : customerComplaints;
    return pool.find((c) => c.complaintId === selectedId) || null;
  }, [selectedId, selectedKind, dmComplaints, customerComplaints]);

  // open the details side panel, reset action form
  const openDetails = (complaint, kind) => {
    setSelectedId(complaint.complaintId);
    setSelectedKind(kind);
    setActionMode(null);
    setActionError(null);
    setMessage("");
    setNote("");
    setParty("customer");
  };

  // close the details side panel
  const closeDetails = () => {
    setSelectedId(null);
    setSelectedKind(null);
    setActionMode(null);
    setActionError(null);
  };

  // shared wrapper: run mutation, clear form, or show error
  const runAction = async (fn) => {
    setActionError(null);
    try {
      await fn().unwrap();
      setActionMode(null);
      setMessage("");
      setNote("");
    } catch (err) {
      setActionError(err?.data?.message || "Action failed. Please try again.");
    }
  };

  // Buttons that move the complaint through its workflow
  const handleStartReview = () =>
    runAction(() => startReview(selected.complaintId));
  const handleRequestInfo = () =>
    runAction(() =>
      requestInfo({ complaintId: selected.complaintId, party, message }),
    );
  const handleResolve = () =>
    runAction(() =>
      resolveComplaint({ complaintId: selected.complaintId, note }),
    );
  const handleReject = () =>
    runAction(() =>
      rejectComplaint({ complaintId: selected.complaintId, note }),
    );

  return (
    <AdminLayout title={page.title} subtitle={page.subtitle}>
      {/* summary card for this page only */}
      <div className="grid grid-cols-1 gap-4">
        {isDmPage ? (
          // delivery-man-filed summary card
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {/* icon badge */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500">
                <Bike size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-600">
                  {dmComplaints.length}
                </p>
                <p className="text-sm font-bold text-slate-800">
                  Complaints by Delivery Man
                </p>
                <p className="text-xs text-slate-600">Against Customer</p>
              </div>
            </div>
          </div>
        ) : (
          // customer-filed summary card
          <div className="rounded-2xl border border-green-100 bg-green-50/40 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {/* icon badge */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-700">
                <User size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-green-700">
                  {customerComplaints.length}
                </p>
                <p className="text-sm font-bold text-slate-800">
                  Complaints by Customer
                </p>
                <p className="text-xs text-slate-600">
                  Against Delivery Man / Product
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* filters bar — the type filter is the page itself now */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* status dropdown */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {/* search box */}
        <div className="relative flex-1">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search complaint ID, name, order ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
          />
        </div>
      </div>

      {/* lists are stacked, never side by side, so each table has the full page width and no column has to be scrolled to */}
      <div className="mt-6 grid grid-cols-1 gap-4">
        {/* delivery man complaints table */}
        {type !== "By Customer" && (
          <Card
            title={
              // table title + count badge
              <span className="flex items-center gap-2 text-blue-600">
                Complaints by Delivery Man Against Customer
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600">
                  {dmComplaints.length}
                </span>
              </span>
            }
          >
            <div className="rounded-xl border border-slate-200">
              <table className="w-full table-auto text-left text-sm">
                {/* column headers */}
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                    <th className={TH}>ID</th>
                    <th className={TH}>Delivery Man</th>
                    <th className={TH}>Customer</th>
                    <th className={TH}>Order ID</th>
                    <th className={TH}>Reason</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Date</th>
                    <th className={TH}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* row per complaint */}
                  {filteredDm.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 break-words font-semibold text-slate-700">
                        {c.id}
                      </td>
                      <td className="px-3 py-3 break-words">
                        <PersonCell
                          name={c.deliveryMan}
                          code={c.deliveryManCode}
                        />
                      </td>
                      <td className="px-3 py-3 break-words">
                        <PersonCell name={c.customer} code={c.customerCode} />
                      </td>
                      <td className="px-3 py-3 break-words font-semibold text-blue-500">
                        {c.orderId}
                      </td>
                      <td className="px-3 py-3 break-words text-slate-600">{c.reason}</td>
                      <td className="px-3 py-3 break-words">
                        <StatusBadge status={c.status} />
                      </td>
                      {/* date + time */}
                      <td className="px-3 py-3 break-words text-slate-700">
                        <p>{formatDate(c.date)}</p>
                        <p className="text-xs text-slate-600">{c.time}</p>
                      </td>
                      {/* view button */}
                      <td className="px-3 py-3 break-words">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetails(c, "dm")}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* loading row */}
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-600"
                      >
                        Loading complaints...
                      </td>
                    </tr>
                  )}
                  {/* empty state row */}
                  {!isLoading && filteredDm.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-600"
                      >
                        No complaints match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* customer complaints table */}
        {type !== "By Delivery Man" && (
          <Card
            title={
              // table title + count badge
              <span className="flex items-center gap-2 text-green-700">
                Complaints by Customer Against Delivery Man / Product
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                  {customerComplaints.length}
                </span>
              </span>
            }
          >
            <div className="rounded-xl border border-slate-200">
              <table className="w-full table-auto text-left text-sm">
                {/* column headers */}
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                    <th className={TH}>ID</th>
                    <th className={TH}>Customer</th>
                    <th className={TH}>Against</th>
                    <th className={TH}>Order ID</th>
                    <th className={TH}>Reason</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Date</th>
                    <th className={TH}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* row per complaint */}
                  {filteredCustomer.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 break-words font-semibold text-slate-700">
                        {c.id}
                      </td>
                      <td className="px-3 py-3 break-words">
                        <PersonCell name={c.customer} code={c.customerCode} />
                      </td>
                      <td className="px-3 py-3 break-words">
                        <PersonCell name={c.against} code={c.againstCode} />
                      </td>
                      <td className="px-3 py-3 break-words font-semibold text-blue-500">
                        {c.orderId}
                      </td>
                      <td className="px-3 py-3 break-words text-slate-600">{c.reason}</td>
                      <td className="px-3 py-3 break-words">
                        <StatusBadge status={c.status} />
                      </td>
                      {/* date + time */}
                      <td className="px-3 py-3 break-words text-slate-700">
                        <p>{formatDate(c.date)}</p>
                        <p className="text-xs text-slate-600">{c.time}</p>
                      </td>
                      {/* view button */}
                      <td className="px-3 py-3 break-words">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetails(c, "customer")}
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* loading row */}
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-600"
                      >
                        Loading complaints...
                      </td>
                    </tr>
                  )}
                  {/* empty state row */}
                  {!isLoading && filteredCustomer.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-600"
                      >
                        No complaints match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* complaint details side panel */}
      {selected && (
        <>
          {/* dim backdrop, click to close */}
          <div
            onClick={closeDetails}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
          />
          <aside className="scrollbar-overlay fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            {/* panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-800">
                Complaint Details
              </h3>
              <button
                onClick={closeDetails}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* complaint id + status */}
              <div className="flex items-center justify-between">
                <p className="text-lg font-black text-slate-900">
                  {selected.id}
                </p>
                <StatusBadge status={selected.status} />
              </div>

              {/* parties + order info grid */}
              <div className="grid grid-cols-2 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                {selectedKind === "dm" ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-600">Delivery Man</p>
                      <p className="font-medium text-slate-700">
                        {selected.deliveryMan}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Customer</p>
                      <p className="font-medium text-slate-700">
                        {selected.customer}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-600">Customer</p>
                      <p className="font-medium text-slate-700">
                        {selected.customer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Against</p>
                      <p className="font-medium text-slate-700">
                        {selected.against}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-slate-600">Order ID</p>
                  <p className="font-semibold text-blue-500">
                    {selected.orderId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Filed On</p>
                  <p className="font-medium text-slate-700">
                    {formatDate(selected.date)}, {selected.time}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-600">Reason</p>
                  <p className="font-medium text-slate-700">
                    {selected.reason}
                  </p>
                </div>
              </div>

              {/* waiting-for-response notice */}
              {selected.status === "Waiting for Response" && (
                <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={16} className="shrink-0" />
                    Waiting for a response from the{" "}
                    <b className="font-semibold">
                      {selected.waitingOn === "delivery"
                        ? "Delivery Man"
                        : "Customer"}
                    </b>
                    .
                  </div>
                  {/* most recent info request note, if any */}
                  {(() => {
                    // Latest "Waiting for Response" entry, to show what was asked
                    const requestEntry = [...(selected.history || [])]
                      .reverse()
                      .find((h) => h.status === "Waiting for Response");
                    return requestEntry?.note ? (
                      <p className="rounded-lg bg-white/70 p-2.5 text-amber-800">
                        {requestEntry.note}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              {/* resolution / rejection note */}
              {selected.resolutionNote && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    {selected.status === "Rejected"
                      ? "Rejection Note"
                      : "Resolution Note"}
                  </p>
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                    {selected.resolutionNote}
                  </p>
                </div>
              )}

              {/* closed notice */}
              {selected.status === "Closed" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  This complaint is closed and read-only.
                </div>
              )}

              {/* status history timeline */}
              <div>
                <OrderTrackingTimeline history={selected.history} />
              </div>

              {/* action error message */}
              {actionError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  <AlertCircle size={14} className="shrink-0" />
                  {actionError}
                </div>
              )}

              {/* start review button */}
              {selected.status === "Pending" && (
                <button
                  onClick={handleStartReview}
                  disabled={isStarting}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStarting ? "Starting..." : "Start Review"}
                </button>
              )}

              {/* review action buttons */}
              {selected.status === "Under Review" && actionMode === null && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => setActionMode("requestInfo")}
                    className="rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                  >
                    Request Info
                  </button>
                  <button
                    onClick={() => setActionMode("resolve")}
                    className="rounded-xl border border-green-200 bg-green-50 py-2.5 text-xs font-bold text-green-700 hover:bg-green-100"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => setActionMode("reject")}
                    className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* request-info form */}
              {selected.status === "Under Review" &&
                actionMode === "requestInfo" && (
                  <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Request Additional Info
                    </p>
                    {/* which party to ask */}
                    <select
                      value={party}
                      onChange={(e) => setParty(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="customer">Customer</option>
                      <option value="delivery">Delivery Man</option>
                    </select>
                    {/* request message */}
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="What information or evidence do you need?"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-orange-400"
                    />
                    {/* cancel / send buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActionMode(null)}
                        className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRequestInfo}
                        disabled={isRequesting || !message.trim()}
                        className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRequesting ? "Sending..." : "Send Request"}
                      </button>
                    </div>
                  </div>
                )}

              {/* resolve form */}
              {selected.status === "Under Review" &&
                actionMode === "resolve" && (
                  <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Resolve Complaint
                    </p>
                    {/* resolution note */}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Describe the action taken (refund, return, warning, suspension, etc.)"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-green-700"
                    />
                    {/* cancel / confirm buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActionMode(null)}
                        className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResolve}
                        disabled={isResolving || !note.trim()}
                        className="flex-1 rounded-xl bg-green-700 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isResolving ? "Saving..." : "Mark Resolved"}
                      </button>
                    </div>
                  </div>
                )}

              {/* reject form */}
              {selected.status === "Under Review" &&
                actionMode === "reject" && (
                  <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Reject Complaint
                    </p>
                    {/* rejection note */}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Why is this complaint invalid or lacking evidence?"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-red-400"
                    />
                    {/* cancel / confirm buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActionMode(null)}
                        className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={isRejecting || !note.trim()}
                        className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRejecting ? "Saving..." : "Reject"}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </aside>
        </>
      )}
    </AdminLayout>
  );
};

export default ComplaintManagement;
