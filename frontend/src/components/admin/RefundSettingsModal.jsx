import { RotateCcw, Settings2, X } from "lucide-react";
import { useState } from "react";
import {
  useGetRefundSettingsQuery,
  useUpdateRefundSettingsMutation,
} from "../../features/admin/returnSettingsApi";

// Editable defaults for how the Return & Refund screens present a request.
const FIELDS = [
  {
    key: "refund_sla_days",
    label: "Refund payout target",
    unit: "days",
    hint: "Used to show a target payout date on requests waiting for a refund, and to mark overdue ones.",
    min: 1,
    max: 90,
  },
  {
    key: "high_value_threshold",
    label: "High-value threshold",
    unit: "৳",
    hint: "Requests at or above this refund total are flagged in the table for extra scrutiny.",
    min: 0,
    max: 1000000,
  },
  {
    key: "auto_flag_repeat_requests",
    label: "Repeat-request flag",
    unit: "requests",
    hint: "A customer with this many requests or more gets a repeat-requester flag on their rows.",
    min: 2,
    max: 50,
  },
];

// Popup for editing the return & refund settings
const RefundSettingsModal = ({ onClose }) => {
  // Load the saved settings and prepare the save call
  const { data, isLoading } = useGetRefundSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateRefundSettingsMutation();

  const [draft, setDraft] = useState(null); // admin's unsaved edits, null until they touch something
  const [error, setError] = useState(""); // save failure message
  const [saved, setSaved] = useState(false); // shows the saved confirmation

  // the server values until the admin edits, their draft from then on
  const form = draft ?? data?.settings ?? null;

  // update one field in the draft
  const setField = (key, value) => {
    setSaved(false);
    setDraft({ ...form, [key]: value });
  };

  // push the draft to the server
  const handleSave = async () => {
    if (!form) return;
    setError("");
    try {
      await updateSettings({
        shipping_refundable: !!form.shipping_refundable,
        refund_sla_days: Number(form.refund_sla_days),
        high_value_threshold: Number(form.high_value_threshold),
        auto_flag_repeat_requests: Number(form.auto_flag_repeat_requests),
      }).unwrap();
      // drop the draft so the panel shows the freshly saved server values
      setDraft(null);
      setSaved(true);
    } catch (err) {
      setError(err?.data?.message || "Could not save these settings. Please try again.");
    }
  };

  // load the shipped defaults into the draft (still needs Save to take effect)
  const handleReset = () => {
    if (!data?.defaults) return;
    setSaved(false);
    setDraft(data.defaults);
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal panel */}
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-500">
              <Settings2 size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Refund Settings</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Defaults for how refund requests are presented and flagged.
              </p>
            </div>
          </div>
          {/* close button */}
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* settings form */}
        <div className="scrollbar-overlay flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading || !form ? (
            <p className="py-8 text-center text-sm text-slate-600">Loading settings...</p>
          ) : (
            <>
              {/* shipping toggle */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Include shipping in refund total</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Controls whether the shipping fee is added to the refund figure shown on requests,
                    summaries and exports.
                  </p>
                </div>
                {/* on/off switch */}
                <button
                  onClick={() => setField("shipping_refundable", !form.shipping_refundable)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.shipping_refundable ? "bg-green-700" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={!!form.shipping_refundable}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      form.shipping_refundable ? "left-5.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* numeric settings */}
              {FIELDS.map((field) => (
                <div key={field.key} className="rounded-xl border border-slate-100 p-4">
                  <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={form[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-700"
                    />
                    <span className="text-xs font-medium text-slate-600">{field.unit}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{field.hint}</p>
                </div>
              ))}

              {/* save error */}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
              )}
              {/* save confirmation */}
              {saved && !error && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  Settings saved.
                </p>
              )}
            </>
          )}
        </div>

        {/* modal footer */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          {/* restore defaults */}
          <button
            onClick={handleReset}
            disabled={!form}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Defaults
          </button>
          {/* cancel */}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          {/* save */}
          <button
            onClick={handleSave}
            disabled={!form || isSaving}
            className="flex-1 rounded-xl bg-green-700 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundSettingsModal;
