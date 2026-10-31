import { Bell, CheckCircle2, Plus, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  useActivateSelfMutation,
  useCreateDeliveryRequestMutation,
  useDeleteMyDeliveryRequestMutation,
  useGetDeliveryDashboardQuery,
  useGetDeliveryRequestsQuery,
} from "../../../features/delivery/deliveryApi";
import ConfirmDialog from "../../../components/shared/ConfirmDialog";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../../utils/formatDate";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell

// request table columns
const COLUMNS = [
  { label: "#" },
  { label: "Type" },
  { label: "Reason" },
  { label: "Date" },
  { label: "Request Code" },
  { label: "Status" },
  { label: "Action" },
];

// Requests tab: send a day-off request and see past requests
const DeliveryRequestsTab = () => {
  const { data: requests = [], isLoading } = useGetDeliveryRequestsQuery();
  const { data: dashboard } = useGetDeliveryDashboardQuery();
  const [createDeliveryRequest, { isLoading: isCreating }] = useCreateDeliveryRequestMutation();
  const [deleteDeliveryRequest, { isLoading: isDeleting }] = useDeleteMyDeliveryRequestMutation();
  const [activateSelf, { isLoading: isActivating }] = useActivateSelfMutation();

  const [showForm, setShowForm] = useState(false); // new request form toggle
  const [message, setMessage] = useState(""); // request reason text
  const [deletingRequest, setDeletingRequest] = useState(null); // request pending delete confirm

  const riderStatus = dashboard?.rider?.status; // current rider status label

  // reactivate rider account
  const handleActivate = async () => {
    await activateSelf();
  };

  // clear and close the request form
  const resetForm = () => {
    setMessage("");
    setShowForm(false);
  };

  // submit new delivery request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await createDeliveryRequest({ message });
    resetForm();
  };

  // confirm and run request delete
  const confirmDelete = async () => {
    if (!deletingRequest) return;
    await deleteDeliveryRequest(deletingRequest.id);
    setDeletingRequest(null);
  };

  return (
    // page wrapper
    <div className="space-y-5">
      {/* page header + new request button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* page title */}
          <h1 className="text-lg font-bold text-slate-800">
            Delivery Requests
          </h1>
          {/* page subtitle */}
          <p className="text-sm text-slate-600">
            Submit and manage your requests
          </p>
        </div>
        {!showForm && (
          // open new request form button
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
          >
            <Plus size={15} /> New Request
          </button>
        )}
      </div>

      {/* rider status card */}
      {riderStatus && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              {/* status label */}
              <span className="text-sm font-bold text-slate-800">
                My Status
              </span>
              <StatusBadge status={riderStatus} />
            </div>
            {/* status explanation text */}
            <p className="mt-0.5 text-sm text-slate-700">
              {riderStatus === "Inactive"
                ? "You're marked inactive from an approved day off. Activate yourself when you're ready to receive orders again."
                : riderStatus === "Blocked"
                ? "Your account is blocked by the admin. Contact admin to resolve this."
                : "You're active and available to be assigned orders."}
            </p>
          </div>
          {riderStatus === "Inactive" && (
            // reactivate button
            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
            >
              <CheckCircle2 size={15} />
              {isActivating ? "Activating..." : "Activate Myself"}
            </button>
          )}
        </div>
      )}

      {/* new request form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            {/* form title */}
            <h3 className="text-sm font-bold text-slate-800">New Request</h3>
            {/* close form button */}
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-600 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              {/* request type label */}
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                Request Type
              </label>
              {/* fixed request type value */}
              <p className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                Day Off
              </p>
            </div>
            <div>
              {/* reason label */}
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                Reason
              </label>
              {/* reason textarea */}
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the reason for taking a day off..."
                className="min-h-22.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* submit/cancel row */}
          <div className="mt-4 flex gap-3">
            {/* submit request button */}
            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={15} /> {isCreating ? "Submitting..." : "Submit Request"}
            </button>
            {/* cancel button */}
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

      {/* requests table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">My Requests</h3>
        <DataTable
          columns={COLUMNS}
          isLoading={isLoading}
          loadingText="Loading requests..."
          isEmpty={requests.length === 0}
          emptyText="No requests yet."
        >
          {requests.map((req, idx) => (
            // request row
            <tr key={req.id} className="align-top hover:bg-slate-50">
              {/* row number cell */}
              <td className={`${TD} text-slate-600`}>{idx + 1}</td>
              {/* request type cell */}
              <td className={TD}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Bell size={13} />
                  </span>
                  <span className="font-semibold whitespace-nowrap text-slate-800">
                    {req.type}
                  </span>
                </div>
              </td>
              {/* request message cell */}
              <td className={`${TD} max-w-xs text-slate-700`}>{req.message}</td>
              {/* date cell */}
              <td className={`${TD} text-slate-700`}>
                {formatDate(req.date)}
              </td>
              {/* request code cell */}
              <td className={`${TD} text-xs text-slate-600`}>{req.code}</td>
              {/* status badge cell */}
              <td className={TD}>
                <StatusBadge status={req.status} />
              </td>
              {/* delete request button cell */}
              <td className={TD}>
                <button
                  onClick={() => setDeletingRequest(req)}
                  title="Delete"
                  className="rounded-lg bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>

      {/* delete confirm dialog */}
      <ConfirmDialog
        open={!!deletingRequest}
        title="Delete Request"
        message={`Are you sure you want to delete ${deletingRequest?.code ?? "this request"}? This cannot be undone.`}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRequest(null)}
      />
    </div>
  );
};

export default DeliveryRequestsTab;
