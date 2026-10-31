import { AlertCircle, CheckCircle2, Clock, ImagePlus, MessageSquareWarning, Send, Trash2, X, XCircle } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateDeliveryComplaintMutation,
  useDeleteDeliveryComplaintMutation,
  useGetMyDeliveryComplaintsQuery,
  useRespondToDeliveryComplaintMutation,
} from "../../../features/delivery/complaintApi";
import { useGetAssignedOrdersQuery } from "../../../features/delivery/deliveryApi";
import OrderTrackingTimeline from "../../../components/shared/OrderTrackingTimeline";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../../utils/formatDate";
import { shortId } from "../../../utils/shortId";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell

// complaint reason options
const COMPLAINT_REASONS = [
  "Customer Unreachable",
  "Refused to Pay (COD)",
  "Abusive Behavior",
  "Wrong Address Given",
  "Refused Delivery Without Reason",
  "Other",
];

// complaint table columns
const COMPLAINT_COLUMNS = [
  { label: "Complaint ID" },
  { label: "Order" },
  { label: "Against" },
  { label: "Reason" },
  { label: "Filed On" },
  { label: "Status" },
  { label: "Actions" },
];

// statuses where rider is allowed to delete the complaint
const DELETABLE_COMPLAINT_STATUSES = ["Resolved", "Rejected", "Closed"];
// cap on evidence photo uploads
const MAX_EVIDENCE_PHOTOS = 3;

// status message per complaint state
const STATUS_NOTE = {
  Pending: {
    icon: Clock,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: "Admin is reviewing your complaint. You'll receive an update soon.",
  },
  "Under Review": {
    icon: Clock,
    box: "border-blue-100 bg-blue-50/60 text-blue-700",
    text: "Your complaint is currently being reviewed by admin.",
  },
  "Waiting for Response": {
    icon: AlertCircle,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: "Admin needs more information from you to continue reviewing this complaint.",
  },
  Resolved: {
    icon: CheckCircle2,
    box: "border-green-100 bg-green-50/60 text-green-700",
    text: "This complaint has been resolved.",
  },
  Rejected: {
    icon: XCircle,
    box: "border-red-100 bg-red-50/60 text-red-700",
    text: "This complaint was reviewed and rejected.",
  },
  Closed: {
    icon: CheckCircle2,
    box: "border-slate-200 bg-slate-50 text-slate-700",
    text: "This complaint is closed.",
  },
};

// pull the latest "waiting for response" note from history
const getRequestMessage = (complaint) => {
  if (complaint.status !== "Waiting for Response") return null;
  // Latest "Waiting for Response" note, i.e. what the admin asked
  const entry = [...(complaint.history || [])].reverse().find((h) => h.status === "Waiting for Response");
  return entry?.note || null;
};

// rider's reply form when admin asks for more info
const ResponseForm = ({ complaint, onSubmitted }) => {
  const [message, setMessage] = useState(""); // reply text
  const [photos, setPhotos] = useState([]); // attached evidence files
  const [error, setError] = useState(null); // submit error text
  // Respond API call
  const [respond, { isLoading }] = useRespondToDeliveryComplaintMutation();
  const requestMessage = getRequestMessage(complaint); // what admin asked for
  const fileInputRef = useRef(null); // hidden file input ref

  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]); // local preview urls
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]); // cleanup blob urls

  // append new files, capped at max
  const addPhotos = (files) => {
    setPhotos((prev) => [...prev, ...Array.from(files || [])].slice(0, MAX_EVIDENCE_PHOTOS));
  };

  // remove one attached photo
  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // submit the response with message + photos
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    // Build the form data with the message and photos
    const formData = new FormData();
    formData.append("message", message);
    photos.forEach((file) => formData.append("photos[]", file));

    try {
      await respond({ complaintId: complaint.complaintId, formData }).unwrap();
      setMessage("");
      setPhotos([]);
      onSubmitted?.();
    } catch (err) {
      setError(err?.data?.message || "Failed to submit your response. Please try again.");
    }
  };

  return (
    // admin response form
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      {/* form heading */}
      <p className="text-xs font-bold text-amber-800">Admin needs more information from you</p>
      {requestMessage && (
        // admin's request note
        <p className="rounded-lg bg-white/70 p-2.5 text-xs text-amber-700">{requestMessage}</p>
      )}
      {/* reply message textarea */}
      <textarea
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Provide the requested details or evidence..."
        className="w-full rounded-xl border border-amber-200 bg-white p-2.5 text-sm outline-none focus:border-green-700"
      />
      {/* evidence photo uploads */}
      <div>
        <div className="flex flex-wrap gap-2">
          {previews.map((src, idx) => (
            // uploaded photo thumbnail
            <div key={src} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-amber-200 shadow-sm">
              <img src={src} alt="Evidence preview" className="h-full w-full object-cover" />
              {/* remove photo button */}
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                title="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {photos.length < MAX_EVIDENCE_PHOTOS && (
            // add photo trigger
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-amber-300 text-amber-500 transition hover:border-green-700 hover:bg-green-50 hover:text-green-700"
            >
              <ImagePlus size={17} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
            </button>
          )}
        </div>
        {/* hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        {/* photo count hint */}
        <p className="mt-1.5 text-[11px] text-amber-700">
          {photos.length}/{MAX_EVIDENCE_PHOTOS} photos attached
        </p>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {/* submit response button */}
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Submitting..." : "Submit Response"}
      </button>
    </form>
  );
};

// Complaints tab: the delivery man's complaints and a form to file a new one
const ComplaintsTab = () => {
  const { data: orders = [] } = useGetAssignedOrdersQuery(); // orders rider can complain about
  const { data: complaints = [], isLoading } = useGetMyDeliveryComplaintsQuery(); // rider's filed complaints
  const [createComplaint, { isLoading: isSubmitting }] = useCreateDeliveryComplaintMutation();
  const [deleteComplaint, { isLoading: isDeleting }] = useDeleteDeliveryComplaintMutation();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(""); // chosen order for new complaint
  const [reason, setReason] = useState(""); // chosen reason for new complaint
  const [banner, setBanner] = useState(null); // success/error banner after submit
  const [openHistoryId, setOpenHistoryId] = useState(null); // which card has timeline expanded
  const [deletingComplaint, setDeletingComplaint] = useState(null); // complaint pending delete confirm
  const [deleteError, setDeleteError] = useState(""); // delete confirm error text

  // clear the new-complaint form fields
  const resetForm = () => {
    setSelectedAssignmentId("");
    setReason("");
  };

  // submit new complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      await createComplaint({
        delivery_assignment_id: Number(selectedAssignmentId),
        reason,
      }).unwrap();
      setBanner({ type: "success", message: "Complaint submitted successfully!" });
      resetForm();
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.data?.message || "Failed to submit complaint. Please try again.",
      });
    }
  };

  // confirm and run complaint delete
  const confirmDelete = async () => {
    if (!deletingComplaint) return;
    setDeleteError("");
    try {
      await deleteComplaint(deletingComplaint.complaintId).unwrap();
      setDeletingComplaint(null);
    } catch (err) {
      setDeleteError(
        err?.data?.message || "Could not delete this complaint. Please try again."
      );
    }
  };

  return (
    // page wrapper
    <div className="space-y-5">
      {/* page header */}
      <div>
        {/* page title */}
        <h1 className="text-lg font-bold text-slate-800">Complaints</h1>
        {/* page subtitle */}
        <p className="text-sm text-slate-600">
          File and track complaints against customers
        </p>
      </div>

      {/* new complaint form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* form title */}
        <h3 className="mb-5 text-sm font-bold text-slate-800">
          File a Complaint Against Customer
        </h3>

        {banner && (
          // success/error banner, color depends on type
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              banner.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            {banner.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            {/* order select label */}
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
              Select Order *
            </label>
            {/* order dropdown */}
            <select
              required
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Choose an order...</option>
              {orders.map((o) => (
                // order option
                <option key={o.assignmentId} value={o.assignmentId}>
                  {o.id} - {o.customer} - {formatDate(o.date)}
                </option>
              ))}
            </select>
            {orders.length === 0 && (
              // no-orders hint
              <p className="mt-1.5 text-xs text-slate-600">
                You have no assigned orders to file a complaint against yet.
              </p>
            )}
          </div>

          <div>
            {/* reason select label */}
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
              Reason *
            </label>
            {/* reason dropdown */}
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select reason...</option>
              {COMPLAINT_REASONS.map((r) => (
                // reason option
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* submit/cancel row */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            {/* submit complaint button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />{" "}
              {isSubmitting ? "Submitting..." : "Submit Complaint"}
            </button>
            {/* clear form button */}
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* filed complaints list */}
      <div>
        {/* list title */}
        <h3 className="mb-3 text-sm font-bold text-slate-800">My Complaints</h3>
        {isLoading ? (
          // loading state
          <p className="py-6 text-center text-sm text-slate-600">
            Loading complaints...
          </p>
        ) : complaints.length === 0 ? (
          // empty state
          <p className="py-6 text-center text-sm text-slate-600">
            You haven&apos;t filed any complaints yet.
          </p>
        ) : (
          // complaints table: one row per complaint, details expand underneath
          <DataTable columns={COMPLAINT_COLUMNS}>
            {complaints.map((c) => {
              const note = STATUS_NOTE[c.status] || STATUS_NOTE.Pending; // status copy + icon
              const NoteIcon = note.icon; // icon component for status note
              const awaitingMyResponse = c.status === "Waiting for Response"; // rider needs to reply
              const requestMessage = getRequestMessage(c); // admin's ask, if any
              const historyOpen = openHistoryId === c.complaintId; // is this row expanded
              const detailsOpen = historyOpen || awaitingMyResponse; // always open when a reply is needed
              return (
                // complaint summary row + its detail row
                <Fragment key={c.complaintId}>
                  <tr className="align-top hover:bg-slate-50">
                    {/* complaint id cell */}
                    <td className={`${TD} font-bold text-slate-800`} title={c.id}>
                      {shortId(c.id)}
                    </td>
                    {/* related order cell */}
                    <td className={`${TD} font-semibold text-blue-600`} title={c.orderId}>
                      {shortId(c.orderId)}
                    </td>
                    {/* complained-against cell */}
                    <td className={`${TD} font-semibold text-slate-700`}>{c.against}</td>
                    {/* reason cell */}
                    <td className={`${TD} text-slate-700`}>{c.reason}</td>
                    {/* filed date cell */}
                    <td className={`${TD} text-slate-700`}>
                      {formatDate(c.date)}
                      <span className="block text-xs text-slate-600">{c.time}</span>
                    </td>
                    {/* status badge cell */}
                    <td className={TD}>
                      <StatusBadge status={c.status} />
                      {awaitingMyResponse && (
                        // reply-needed hint, so it is never missed in a collapsed row
                        <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                          Your reply needed
                        </span>
                      )}
                    </td>
                    {/* details toggle + delete cell */}
                    <td className={TD}>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* show/hide detail row */}
                        <button
                          type="button"
                          onClick={() => setOpenHistoryId(historyOpen ? null : c.complaintId)}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-200"
                        >
                          <MessageSquareWarning size={13} />
                          {historyOpen ? "Hide" : "Details"}
                        </button>
                        {DELETABLE_COMPLAINT_STATUSES.includes(c.status) && (
                          // delete complaint button, only for finished statuses
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingComplaint(c);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {detailsOpen && (
                    // detail row: status note, admin's ask, resolution, reply form, timeline
                    <tr className="bg-slate-50/60">
                      <td colSpan={COMPLAINT_COLUMNS.length} className="px-4 py-4">
                        {/* status note box */}
                        <div
                          className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs ${note.box}`}
                        >
                          <NoteIcon size={16} className="shrink-0" />
                          <span>
                            <b className="font-semibold">{c.status}</b> — {note.text}
                          </span>
                        </div>

                        {requestMessage && !awaitingMyResponse && (
                          // read-only view of admin's past request
                          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-800">
                            <p className="mb-1 text-[11px] font-bold tracking-wide text-amber-500 uppercase">
                              What admin asked for
                            </p>
                            {requestMessage}
                          </div>
                        )}

                        {c.resolutionNote && (
                          // resolution/rejection note box
                          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
                            <p className="mb-1 font-bold text-slate-700">
                              {c.status === "Rejected" ? "Rejection Note" : "Resolution Note"}
                            </p>
                            {c.resolutionNote}
                          </div>
                        )}

                        {awaitingMyResponse && (
                          // inline reply form
                          <ResponseForm complaint={c} />
                        )}

                        {historyOpen && (
                          // status history timeline
                          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-4">
                            <OrderTrackingTimeline history={c.history} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </DataTable>
        )}
      </div>

      {/* delete confirm modal */}
      {deletingComplaint && (
        // overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          {/* modal card */}
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              {/* modal title */}
              <h3 className="text-base font-bold text-slate-800">Delete Complaint</h3>
              {/* modal warning text */}
              <p className="mt-0.5 text-xs text-slate-600">
                Are you sure you want to delete {deletingComplaint.id}? This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4">
              {deleteError && (
                // delete error text
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  {deleteError}
                </p>
              )}
              {/* confirm/cancel buttons */}
              <div className="flex gap-3">
                {/* keep complaint button */}
                <button
                  type="button"
                  onClick={() => setDeletingComplaint(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Keep Complaint
                </button>
                {/* confirm delete button */}
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
    </div>
  );
};

export default ComplaintsTab;
