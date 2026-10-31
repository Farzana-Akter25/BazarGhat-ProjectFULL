import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Info,
  Send,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useCreateIssueReportMutation } from "../../../features/delivery/deliveryApi";
import { formatDate } from "../../../utils/formatDate";

// product condition options
const CONDITIONS = [
  { key: "Good", label: "Good", icon: CheckCircle2, tone: "good" },
  { key: "Minor Issue", label: "Minor Issue", icon: AlertTriangle, tone: "warn" },
  { key: "Major Issue", label: "Major Issue", icon: AlertTriangle, tone: "warn" },
  { key: "Damaged", label: "Damaged", icon: XCircle, tone: "bad" },
];

// active/inactive button styles
const CONDITION_STYLES = {
  active: {
    good: "border-green-700 bg-green-50 text-green-700",
    warn: "border-amber-400 bg-amber-50 text-amber-700",
    bad: "border-red-400 bg-red-50 text-red-700",
  },
  inactive:
    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

// reporting guideline bullets — the first one names the moment the rider is reporting from, which is the doorstep on a delivery and the collection on a return pickup.
const INSTRUCTIONS = (isReturn) => [
  isReturn
    ? "Report any problem with the returned goods as soon as you collect them"
    : "Report any product issues immediately upon delivery",
  "Take photos if there are visible problems",
  "Get customer confirmation before submitting",
  "This report will be visible only to admin for verification",
  "Helps protect both customer and company interests",
];

// labeled read-only field
const InfoField = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
    {/* field label */}
    <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
      {label}
    </p>
    {/* field value */}
    <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
  </div>
);

// Form for reporting a problem with an order
const ReportIssueTab = ({ order, onBack }) => {
  // Report API call
  const [createIssueReport, { isLoading }] = useCreateIssueReportMutation();
  const [condition, setCondition] = useState(""); // chosen product condition
  const [comment, setComment] = useState(""); // detailed comment text
  const [photo, setPhoto] = useState(null); // uploaded evidence photo (data url)
  const [submitted, setSubmitted] = useState(false); // shows success view after submit
  const [error, setError] = useState(""); // submit error text
  // a collection run is reported on in the same form, only worded for goods coming back rather than going out
  const isReturn = order.type === "Return Pickup";

  // read uploaded photo file as a data url
  const handlePhotoUpload = (e) => {
    // Read the chosen photo as a data URL for preview and upload
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  // submit the condition report
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condition || !comment.trim()) return;
    setError("");
    try {
      await createIssueReport({
        delivery_assignment_id: order.assignmentId,
        condition,
        comment,
        photo,
      }).unwrap();
      setSubmitted(true);
    } catch (err) {
      setError(err?.data?.message || "Failed to submit report. Please try again.");
    }
  };

  if (submitted) {
    return (
      // success confirmation view
      <div className="space-y-4">
        {/* back link */}
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-700 hover:text-slate-700"
        >
          ← Back to Dashboard
        </button>
        {/* success card */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-green-100 bg-white px-6 py-16 text-center shadow-sm">
          {/* check icon badge */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700">
            <CheckCircle2 size={28} className="text-white" />
          </div>
          {/* success title */}
          <h2 className="text-lg font-bold text-slate-800">Report Submitted</h2>
          {/* success description */}
          <p className="mt-2 max-w-sm text-sm text-slate-600">
            Your product issue report for {order.id} has been sent to admin
            for verification.
          </p>
          {/* back to dashboard button */}
          <button
            onClick={onBack}
            className="mt-6 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    // page wrapper
    <div className="space-y-5">
      {/* back link */}
      <button
        onClick={onBack}
        className="text-sm font-semibold text-slate-700 hover:text-slate-700"
      >
        ← Back to Dashboard
      </button>

      {/* page header banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-green-700 p-5 text-white shadow-sm">
        {/* warning icon badge */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <AlertTriangle size={24} />
        </div>
        <div>
          {/* banner title */}
          <h1 className="text-lg font-bold">Report Product Issue</h1>
          {/* banner subtitle */}
          <p className="text-sm text-white/80">
            {isReturn
              ? "Document any problem with the goods you collected back"
              : "Document any product issues during delivery"}
          </p>
        </div>
      </div>

      {/* delivery / return pickup info card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* card title with icon */}
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500">
            <ClipboardList size={13} />
          </span>
          {isReturn ? "Return Pickup Information" : "Delivery Information"}
        </h3>
        {/* order detail fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoField label="Order ID" value={order.id} />
          <InfoField label="Product" value={order.product} />
          <InfoField label="Customer" value={order.customer} />
          <InfoField
            label={isReturn ? "Pickup Date" : "Delivery Date"}
            value={formatDate(order.date)}
          />
        </div>
      </div>

      {/* instructions notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        {/* notice title */}
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
          <ShieldAlert size={16} /> Important Instructions
        </h3>
        {/* guideline bullet list */}
        <ul className="space-y-1.5 text-xs font-medium text-amber-700">
          {INSTRUCTIONS(isReturn).map((line) => (
            // single guideline bullet
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* condition report form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {/* form title with icon */}
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Info size={13} />
          </span>
          Product Condition Report
        </h3>

        {error && (
          // submit error text
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        {/* condition field label */}
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          Product Condition <span className="text-red-500">*</span>
        </label>
        {/* condition toggle buttons */}
        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CONDITIONS.map((c) => {
            const isActive = condition === c.key; // is this condition selected
            return (
              // single condition toggle button
              <button
                key={c.key}
                type="button"
                onClick={() => setCondition(c.key)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? CONDITION_STYLES.active[c.tone]
                    : CONDITION_STYLES.inactive
                }`}
              >
                <c.icon size={16} /> {c.label}
              </button>
            );
          })}
        </div>

        {/* comment field label */}
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          Detailed Comment <span className="text-red-500">*</span>
        </label>
        {/* comment textarea */}
        <textarea
          required
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe the product condition in detail. Include any observations about packaging, freshness, quality, etc."
          className="min-h-[110px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-100"
        />
        {/* character count */}
        <p className="mt-1 text-xs text-slate-600">{comment.length} characters</p>

        {/* photo upload label */}
        <label className="mt-4 mb-1.5 block text-xs font-semibold text-slate-600">
          Upload Photos (Optional)
        </label>
        {/* photo upload hint */}
        <p className="mb-2 text-xs text-slate-600">
          If there are visible issues, take photos as evidence
        </p>
        {/* photo upload dropzone */}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center transition-colors hover:bg-slate-100">
          {photo ? (
            // uploaded photo preview
            <img
              src={photo}
              alt="Uploaded evidence"
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            // upload placeholder icon
            <Upload size={22} className="text-slate-600" />
          )}
          {/* upload button text, changes once a photo exists */}
          <span className="text-sm font-semibold text-slate-700">
            {photo ? "Change Photo" : "Click to Upload Photo"}
          </span>
          {/* upload hint text */}
          <span className="text-xs text-slate-600">
            Take photos of any visible issues
          </span>
          {/* hidden file input */}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoUpload}
          />
        </label>

        {/* cancel/submit buttons */}
        <div className="mt-6 flex gap-3">
          {/* cancel button */}
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          {/* submit report button */}
          <button
            type="submit"
            disabled={!condition || !comment.trim() || isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-green-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} /> {isLoading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssueTab;
