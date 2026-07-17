import { Camera, Clock, Send } from "lucide-react";
import { useState } from "react";
import { ORDERS, RETURN_REQUESTS } from "./data";
import StatusBadge from "./StatusBadge";

const RETURN_REASONS = [
  "Damaged Packaging",
  "Wrong Item Delivered",
  "Item Expired",
  "Missing Item",
  "Quality Not As Expected",
  "Other",
];

const ReturnsTab = () => {
  const [selectedOrder, setSelectedOrder] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Return request submitted!");
    setSelectedOrder("");
    setReason("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-5 text-base font-bold text-slate-800">
          Submit Return Request
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Select Order *
            </label>
            <select
              required
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Choose an order...</option>
              {ORDERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} - {o.date} - {o.total}TK
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Return Reason *
            </label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Select reason...</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Description *
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              className="min-h-[100px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Upload Photos *
            </label>
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-colors hover:border-orange-300">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                <Camera size={22} strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Upload Product Photos
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Required: At least 1 clear photo showing the issue
              </p>
              <button
                type="button"
                className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
              >
                + Add Photo
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-700">
            <p className="mb-1.5 font-semibold">Photo Guideline</p>
            <ul className="space-y-0.5 text-blue-600/90">
              <li>✓ Take clear, well-lit photos</li>
              <li>✓ Show the product defect or damage clearly</li>
              <li>✓ Include product label/packaging if applicable</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <Send size={16} /> Submit Request
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOrder("");
                setReason("");
                setDescription("");
              }}
              className="rounded-xl border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <div>
        <h3 className="mb-3 text-base font-bold text-slate-800">
          My Return Requests
        </h3>
        <div className="space-y-4">
          {RETURN_REQUESTS.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {req.id}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Order {req.orderId} · {req.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Return Amount
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {req.amount}TK
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                    Product
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {req.product}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                    Reason
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {req.reason}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  Description
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{req.description}</p>
              </div>

              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
                <Clock size={16} className="shrink-0" />
                <span>
                  <b className="font-semibold">Under Review</b> — Our team is
                  reviewing your return request. You&apos;ll receive an update
                  within 24-48 hours.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReturnsTab;
