import { AlertCircle, CheckCircle2, Clock, ImagePlus, MessageSquareWarning, Send, Trash2, X, XCircle } from "lucide-react"; // status/action icons
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "../../../utils/formatDate";
import { shortId } from "../../../utils/shortId";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell
import {
  useCreateComplaintMutation,
  useDeleteComplaintMutation,
  useGetMyComplaintsQuery,
  useRespondToComplaintMutation,
} from "../../../features/customer/complaintApi";
import OrderTrackingTimeline from "../../../components/shared/OrderTrackingTimeline"; // step-by-step history view
import StatusBadge from "./StatusBadge"; // colored status pill

// dropdown options for complaint reason
const COMPLAINT_REASONS = [
  "Rude Behavior",
  "Late Delivery",
  "Package Mishandled",
  "Wrong Item Delivered",
  "Demanded Extra Money",
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

const DELETABLE_COMPLAINT_STATUSES = ["Resolved", "Rejected", "Closed"]; // only these can be deleted
const MAX_EVIDENCE_PHOTOS = 3; // cap on response photo uploads

// per-status icon, box color, and helper text shown on each complaint card
const STATUS_NOTE = {
  Pending: {
    icon: Clock,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: "Our team is reviewing your complaint. You'll receive an update within 24-48 hours.",
  },
  "Under Review": {
    icon: Clock,
    box: "border-blue-100 bg-blue-50/60 text-blue-700",
    text: "Your complaint is currently being reviewed by our support team.",
  },
  "Waiting for Response": {
    icon: AlertCircle,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: "We need more information from you to continue reviewing this complaint.",
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

// most recent admin "waiting for response" note, if any
const getRequestMessage = (complaint) => {
  if (complaint.status !== "Waiting for Response") return null;
  // Latest "Waiting for Response" note, i.e. what the admin asked
  const entry = [...(complaint.history || [])].reverse().find((h) => h.status === "Waiting for Response");
  return entry?.note || null;
};

// inline form for customer to reply when admin requests more info
const ResponseForm = ({ complaint, onSubmitted }) => {
  const [message, setMessage] = useState(""); // reply text
  const [photos, setPhotos] = useState([]); // attached evidence files
  const [error, setError] = useState(null); // submit error message
  // Respond API call
  const [respond, { isLoading }] = useRespondToComplaintMutation();
  const requestMessage = getRequestMessage(complaint); // what admin asked for
  const fileInputRef = useRef(null); // hidden file input handle

  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]); // local preview urls
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]); // cleanup blob urls

  // append newly selected files, capped at max
  const addPhotos = (files) => {
    setPhotos((prev) => [...prev, ...Array.from(files || [])].slice(0, MAX_EVIDENCE_PHOTOS));
  };

  // remove one attached photo by index
  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // submit response text + photos to backend
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
    // admin response request form
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      {/* form title */}
      <p className="text-xs font-bold text-amber-800">Admin needs more information from you</p>
      {requestMessage && (
        // what admin specifically requested
        <p className="rounded-lg bg-white/70 p-2.5 text-xs text-amber-700">{requestMessage}</p>
      )}
      {/* reply message textarea */}
      <textarea
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Provide the requested details or evidence..."
        className="w-full rounded-xl border border-amber-200 bg-white p-2.5 text-sm outline-none focus:border-orange-400"
      />
      {/* evidence photo uploader */}
      <div>
        <div className="flex flex-wrap gap-2">
          {previews.map((src, idx) => (
            // one uploaded photo preview thumbnail
            <div key={src} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-amber-200 shadow-sm">
              <img src={src} alt="Evidence preview" className="h-full w-full object-cover" />
              {/* remove photo button, shows on hover */}
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
            // add photo tile, opens hidden file input
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-amber-300 text-amber-500 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500"
            >
              <ImagePlus size={17} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
            </button>
          )}
        </div>
        {/* hidden file input for photo picker */}
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
        {/* photo count helper text */}
        <p className="mt-1.5 text-[11px] text-amber-700">
          {photos.length}/{MAX_EVIDENCE_PHOTOS} photos attached
        </p>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {/* submit response button */}
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Submitting..." : "Submit Response"}
      </button>
    </form>
  );
};

// Complaints tab: list of the customer's complaints and a form to file a new one
const ComplaintsTab = ({ orders = [] }) => {
  const riderOrders = orders.filter((o) => o.tracking?.rider); // only orders with a rider can be complained about

  const [selectedOrderId, setSelectedOrderId] = useState(""); // chosen order in form
  const [reason, setReason] = useState(""); // chosen reason in form
  const [banner, setBanner] = useState(null); // success/error banner after submit
  const [openHistoryId, setOpenHistoryId] = useState(null); // which card's timeline is open
  const [deletingComplaint, setDeletingComplaint] = useState(null); // complaint pending delete confirm
  const [deleteError, setDeleteError] = useState(""); // delete modal error text

  const { data: complaints = [], isLoading } = useGetMyComplaintsQuery();
  const [createComplaint, { isLoading: isSubmitting }] = useCreateComplaintMutation();
  const [deleteComplaint, { isLoading: isDeleting }] = useDeleteComplaintMutation();

  // clear the file-complaint form fields
  const resetForm = () => {
    setSelectedOrderId("");
    setReason("");
  };

  // submit new complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      await createComplaint({
        order_id: Number(selectedOrderId),
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

  // confirm delete of the selected complaint
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
    <div className="space-y-6">
      {/* file complaint form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* form title */}
        <h3 className="mb-5 text-base font-bold text-slate-800">
          File a Complaint Against Delivery Man
        </h3>

        {/* success/error banner */}
        {banner && (
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Select Order *
            </label>
            {/* order dropdown, only rider-assigned orders */}
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Choose an order...</option>
              {riderOrders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.id} - {formatDate(o.date)} - {o.tracking.rider.name}
                </option>
              ))}
            </select>
            {riderOrders.length === 0 && (
              // no eligible orders helper text
              <p className="mt-1.5 text-xs text-slate-600">
                Only orders with an assigned delivery man are eligible for a complaint.
              </p>
            )}
          </div>

          <div>
            {/* reason select label */}
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Reason *
            </label>
            {/* reason dropdown */}
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Select reason...</option>
              {COMPLAINT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* submit / cancel buttons */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            {/* submit complaint button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* complaints list */}
      <div>
        {/* section title */}
        <h3 className="mb-3 text-base font-bold text-slate-800">My Complaints</h3>
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
              const note = STATUS_NOTE[c.status] || STATUS_NOTE.Pending; // status box content
              const NoteIcon = note.icon; // icon for status box
              const awaitingMyResponse = c.status === "Waiting for Response" && c.waitingOn === "customer"; // response form gate
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
                          // delete button, only for finished complaints
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
                        {/* status explanation box */}
                        <div
                          className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs ${note.box}`}
                        >
                          <NoteIcon size={16} className="shrink-0" />
                          <span>
                            <b className="font-semibold">{c.status}</b> — {note.text}
                          </span>
                        </div>

                        {requestMessage && !awaitingMyResponse && (
                          // admin's past request, shown after customer already responded
                          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-800">
                            <p className="mb-1 text-[11px] font-bold tracking-wide text-amber-500 uppercase">
                              What admin asked for
                            </p>
                            {requestMessage}
                          </div>
                        )}

                        {c.resolutionNote && (
                          // final resolution/rejection note
                          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
                            <p className="mb-1 font-bold text-slate-700">
                              {c.status === "Rejected" ? "Rejection Note" : "Resolution Note"}
                            </p>
                            {c.resolutionNote}
                          </div>
                        )}

                        {awaitingMyResponse && (
                          // reply form, only when admin is waiting on customer
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            {/* modal header */}
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Delete Complaint</h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Are you sure you want to delete {deletingComplaint.id}? This cannot be undone.
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
                {/* cancel delete */}
                <button
                  type="button"
                  onClick={() => setDeletingComplaint(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Keep Complaint
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
    </div>
  );
};

export default ComplaintsTab;
