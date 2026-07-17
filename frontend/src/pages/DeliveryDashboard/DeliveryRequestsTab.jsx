import { Bell, Plus, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { DELIVERY_REQUESTS, REQUEST_TYPES } from "./data";
import StatusBadge from "./StatusBadge";

const DeliveryRequestsTab = () => {
  const [showForm, setShowForm] = useState(true);
  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState(DELIVERY_REQUESTS);

  const resetForm = () => {
    setRequestType(REQUEST_TYPES[0]);
    setMessage("");
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setRequests((prev) => [
      {
        id: `REQ-${String(prev.length + 1).padStart(3, "0")}`,
        type: requestType,
        status: "Pending",
        message,
        date: "Today",
      },
      ...prev,
    ]);
    resetForm();
  };

  const handleDelete = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Delivery Requests
          </h1>
          <p className="text-sm text-slate-400">
            Submit and manage your requests
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            <Plus size={15} /> New Request
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">New Request</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Request Type
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Message
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your request..."
                className="min-h-[46px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <Send size={15} /> Submit Request
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Bell size={15} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {req.type}
                  </span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{req.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {req.date} · {req.id}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(req.id)}
              className="text-slate-300 transition-colors hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
            No requests yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryRequestsTab;
