import { Check, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  useCreateReturnReasonMutation,
  useDeleteReturnReasonMutation,
  useGetReturnReasonsQuery,
  useUpdateReturnReasonMutation,
} from "../../features/admin/returnSettingsApi";
import DataTable, { TD } from "../shared/DataTable"; // shared table shell

// which request types a reason shows up for
const APPLIES_TO = ["Both", "Return", "Refund"];

// reason table columns
const REASON_COLUMNS = [
  { label: "#" },
  { label: "Reason" },
  { label: "Applies To" },
  { label: "Visibility" },
  { label: "Actions" },
];

// CRUD over the reason list customers pick from when raising a return or refund request.
const ManageReasonsModal = ({ onClose }) => {
  const { data: reasons = [], isLoading } = useGetReturnReasonsQuery();
  const [createReason, { isLoading: isCreating }] = useCreateReturnReasonMutation();
  // API calls to update and delete a reason
  const [updateReason] = useUpdateReturnReasonMutation();
  const [deleteReason] = useDeleteReturnReasonMutation();

  const [newLabel, setNewLabel] = useState(""); // new reason text
  const [newAppliesTo, setNewAppliesTo] = useState("Both"); // new reason scope
  const [editingId, setEditingId] = useState(null); // reason row in edit mode
  const [editLabel, setEditLabel] = useState(""); // draft label while editing
  const [error, setError] = useState(""); // server-side validation message

  // read the first validation message the API returned, whatever field it was on
  const firstError = (err, fallback) =>
    err?.data?.errors?.label?.[0] || err?.data?.message || fallback;

  // add a reason to the bottom of the list
  const handleAdd = async () => {
    // Trimmed text of the new reason; do nothing if empty
    const label = newLabel.trim();
    if (!label) return;
    setError("");
    try {
      await createReason({ label, applies_to: newAppliesTo }).unwrap();
      setNewLabel("");
      setNewAppliesTo("Both");
    } catch (err) {
      setError(firstError(err, "Could not add this reason."));
    }
  };

  // begin renaming a reason
  const startEdit = (reason) => {
    setEditingId(reason.id);
    setEditLabel(reason.label);
    setError("");
  };

  // save the renamed reason
  const saveEdit = async (reason) => {
    // Trimmed edited text; just close the editor if empty or unchanged
    const label = editLabel.trim();
    if (!label || label === reason.label) {
      setEditingId(null);
      return;
    }
    setError("");
    try {
      await updateReason({ id: reason.id, label }).unwrap();
      setEditingId(null);
    } catch (err) {
      setError(firstError(err, "Could not rename this reason."));
    }
  };

  // show/hide a reason in the customer form without deleting it
  const toggleActive = async (reason) => {
    setError("");
    try {
      await updateReason({ id: reason.id, is_active: !reason.isActive }).unwrap();
    } catch (err) {
      setError(firstError(err, "Could not update this reason."));
    }
  };

  // change which request types a reason appears for
  const changeAppliesTo = async (reason, appliesTo) => {
    setError("");
    try {
      await updateReason({ id: reason.id, applies_to: appliesTo }).unwrap();
    } catch (err) {
      setError(firstError(err, "Could not update this reason."));
    }
  };

  // remove a reason from the picker
  const handleDelete = async (reason) => {
    if (!window.confirm(`Remove "${reason.label}" from the reason list?`)) return;
    setError("");
    try {
      await deleteReason(reason.id).unwrap();
    } catch (err) {
      setError(firstError(err, "Could not delete this reason."));
    }
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal panel */}
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <ListChecks size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Manage Reasons</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                These are the options customers choose from when raising a request.
              </p>
            </div>
          </div>
          {/* close button */}
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* add-new row */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* new reason text */}
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              type="text"
              placeholder="Add a new reason..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
            {/* new reason scope */}
            <select
              value={newAppliesTo}
              onChange={(e) => setNewAppliesTo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
            >
              {APPLIES_TO.map((a) => (
                <option key={a} value={a}>
                  {a === "Both" ? "Return & Refund" : `${a} only`}
                </option>
              ))}
            </select>
            {/* add button */}
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || isCreating}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              {isCreating ? "Adding..." : "Add"}
            </button>
          </div>
          {/* validation error */}
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}
        </div>

        {/* reason table */}
        <div className="scrollbar-overlay flex-1 overflow-y-auto px-6 py-4">
          <DataTable
            columns={REASON_COLUMNS}
            isLoading={isLoading}
            loadingText="Loading reasons..."
            isEmpty={reasons.length === 0}
            emptyText="No reasons yet — add the first one above."
          >
            {reasons.map((reason, idx) => (
              // reason row, greyed out while hidden from customers
              <tr
                key={reason.id}
                className={reason.isActive ? "hover:bg-slate-50" : "bg-slate-50"}
              >
                {/* row number cell */}
                <td className={`${TD} text-slate-600`}>{idx + 1}</td>
                {/* label cell, editable inline */}
                <td className={TD}>
                  {editingId === reason.id ? (
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(reason);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-lg border border-green-700 px-2 py-1.5 text-sm outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-slate-700">{reason.label}</p>
                  )}
                </td>
                {/* which request types it applies to */}
                <td className={TD}>
                  <select
                    value={reason.appliesTo}
                    onChange={(e) => changeAppliesTo(reason, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-green-700"
                  >
                    {APPLIES_TO.map((a) => (
                      <option key={a} value={a}>
                        {a === "Both" ? "Return & Refund" : `${a} only`}
                      </option>
                    ))}
                  </select>
                </td>
                {/* show/hide in the customer form */}
                <td className={TD}>
                  <button
                    onClick={() => toggleActive(reason)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      reason.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                    title={reason.isActive ? "Visible to customers" : "Hidden from customers"}
                  >
                    {reason.isActive ? "Active" : "Hidden"}
                  </button>
                </td>
                {/* rename + delete cell */}
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    {/* rename / save */}
                    {editingId === reason.id ? (
                      <button
                        onClick={() => saveEdit(reason)}
                        className="rounded-lg bg-green-50 p-1.5 text-green-700 hover:bg-green-100"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(reason)}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-500 hover:bg-blue-100"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    {/* delete */}
                    <button
                      onClick={() => handleDelete(reason)}
                      className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        {/* modal footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageReasonsModal;
