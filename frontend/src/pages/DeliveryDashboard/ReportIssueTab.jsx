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

const CONDITIONS = [
  { key: "Good", label: "Good", icon: CheckCircle2, tone: "good" },
  { key: "Minor Issue", label: "Minor Issue", icon: AlertTriangle, tone: "warn" },
  { key: "Major Issue", label: "Major Issue", icon: AlertTriangle, tone: "warn" },
  { key: "Damaged", label: "Damaged", icon: XCircle, tone: "bad" },
];

const CONDITION_STYLES = {
  active: {
    good: "border-emerald-400 bg-emerald-50 text-emerald-700",
    warn: "border-amber-400 bg-amber-50 text-amber-700",
    bad: "border-red-400 bg-red-50 text-red-700",
  },
  inactive:
    "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
};

const INSTRUCTIONS = [
  "Report any product issues immediately upon delivery",
  "Take photos if there are visible problems",
  "Get customer confirmation before submitting",
  "This report will be visible only to admin for verification",
  "Helps protect both customer and company interests",
];

const InfoField = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
    <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const ReportIssueTab = ({ order, onBack }) => {
  const [condition, setCondition] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!condition || !comment.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Back to Dashboard
        </button>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500">
            <CheckCircle2 size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Report Submitted</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Your product issue report for {order.id} has been sent to admin
            for verification.
          </p>
          <button
            onClick={onBack}
            className="mt-6 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        ← Back to Dashboard
      </button>

      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-700 p-5 text-white shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold">Report Product Issue</h1>
          <p className="text-sm text-white/80">
            Document any product issues during delivery
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500">
            <ClipboardList size={13} />
          </span>
          Delivery Information
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoField label="Order ID" value={order.id} />
          <InfoField label="Product" value={order.product} />
          <InfoField label="Customer" value={order.customer} />
          <InfoField label="Delivery Date" value={order.date} />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
          <ShieldAlert size={16} /> Important Instructions
        </h3>
        <ul className="space-y-1.5 text-xs font-medium text-amber-700">
          {INSTRUCTIONS.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Info size={13} />
          </span>
          Product Condition Report
        </h3>

        <label className="mb-2 block text-xs font-semibold text-slate-600">
          Product Condition <span className="text-red-500">*</span>
        </label>
        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CONDITIONS.map((c) => {
            const isActive = condition === c.key;
            return (
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

        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          Detailed Comment <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe the product condition in detail. Include any observations about packaging, freshness, quality, etc."
          className="min-h-[110px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-1 text-xs text-slate-400">{comment.length} characters</p>

        <label className="mt-4 mb-1.5 block text-xs font-semibold text-slate-600">
          Upload Photos (Optional)
        </label>
        <p className="mb-2 text-xs text-slate-400">
          If there are visible issues, take photos as evidence
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center transition-colors hover:bg-slate-100">
          {photo ? (
            <img
              src={photo}
              alt="Uploaded evidence"
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <Upload size={22} className="text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-700">
            {photo ? "Change Photo" : "Click to Upload Photo"}
          </span>
          <span className="text-xs text-slate-400">
            Take photos of any visible issues
          </span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoUpload}
          />
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!condition || !comment.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-emerald-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} /> Submit Report
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssueTab;
