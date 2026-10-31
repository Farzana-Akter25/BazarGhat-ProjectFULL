import { CheckCircle2, Loader2, RefreshCw, X, XCircle } from "lucide-react"; // loading, decision, gateway re-check and close icons
import { useState } from "react";
import { StatusBadge } from "./AdminUI"; // shared status pill
import { formatDate } from "../../utils/formatDate";
import {
  useApproveRefundMutation,
  useGetRefundQuery,
  useRejectRefundMutation,
  useSyncRefundMutation,
} from "../../features/admin/refundApi";

// one label/value pair in the detail grid
const Field = ({ label, value, mono = false }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
      {label}
    </p>
    <p
      className={`mt-0.5 text-sm break-words text-slate-700 ${mono ? "font-mono text-xs" : "font-medium"}`}
    >
      {value || "—"}
    </p>
  </div>
);


// One "label ... amount" row in the payment breakdown
const MoneyRow = ({ label, amount, hint, strong = false }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs text-slate-700">
      {label}
      {hint && (
        <span className="ml-1 text-[11px] text-slate-500">({hint})</span>
      )}
    </span>
    <span
      className={`shrink-0 text-sm tabular-nums ${strong ? "font-extrabold text-slate-900" : "font-semibold text-slate-800"}`}
    >
      ৳{amount ?? 0}
    </span>
  </div>
);


// Popup with the full details and timeline of one refund, plus approve/reject actions
const RefundDetailsModal = ({ refundId, onClose }) => {
  const { data: refund, isLoading } = useGetRefundQuery(refundId, {
    skip: !refundId,
  });
  const [syncRefund, { isLoading: isSyncing }] = useSyncRefundMutation();
  const [approveRefund, { isLoading: isApproving }] = useApproveRefundMutation();
  const [rejectRefund, { isLoading: isRejecting }] = useRejectRefundMutation();

  // Error from approve/reject
  const [decisionError, setDecisionError] = useState("");
  const [rejecting, setRejecting] = useState(false); // rejection reason form open
  const [rejectReason, setRejectReason] = useState("");

  // Refund still pending or processing?
  const isOpenStatus = ["PENDING", "PROCESSING"].includes(refund?.status);
  // Only a post-delivery refund waits on a decision; a cancellation refund is already moving by the time it is looked at.
  const awaitsApproval = Boolean(refund?.awaitsApproval);

  // Approving is what actually releases the money.
  const approve = async () => {
    setDecisionError("");
    try {
      await approveRefund({ id: refundId }).unwrap();
    } catch (err) {
      setDecisionError(
        err?.data?.message || "Could not approve this refund. Please try again.",
      );
    }
  };

  // Rejecting refuses it.
  const reject = async () => {
    if (!rejectReason.trim()) return;
    setDecisionError("");
    try {
      await rejectRefund({ id: refundId, reason: rejectReason.trim() }).unwrap();
      setRejecting(false);
      setRejectReason("");
    } catch (err) {
      setDecisionError(
        err?.data?.message || "Could not reject this refund. Please try again.",
      );
    }
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      {/* dialog card */}
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        {/* modal header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800">
              Refund Details
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              {refund?.refundNumber ?? "Loading..."}
            </p>
          </div>
          {/* close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoading || !refund ? (
            // loading state
            <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" />
              Loading refund...
            </div>
          ) : (
            <>
              {/* headline: amount + current status */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    Refund Amount
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900">
                    ৳{refund.amount}
                  </p>
                </div>
                <StatusBadge status={refund.statusLabel} />
              </div>

              {/* the fields an admin needs to reconcile a refund */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Order ID" value={refund.orderNumber} />
                <Field label="Customer" value={refund.customer} />
                <Field
                  label="Order Amount"
                  value={refund.orderAmount != null ? `৳${refund.orderAmount}` : null}
                />
                <Field label="Refund Amount" value={`৳${refund.amount}`} />
                <Field
                  label="Original Payment Method"
                  value={refund.paymentMethod}
                />
                <Field label="Refund Method" value={refund.refundMethodLabel} />
                <Field
                  label="Manual Fallback"
                  value={refund.isManualFallback ? "Yes" : "No"}
                />
                <Field label="Payment Gateway" value={refund.paymentGateway} />
                <Field label="Refund Status" value={refund.statusLabel} />
                <Field
                  label="Original Transaction ID"
                  value={refund.originalTransactionId}
                  mono
                />
                <Field
                  label="Gateway Transaction ID"
                  value={refund.gatewayTransactionId}
                  mono
                />
                <Field
                  label="SSLCommerz Refund ID"
                  value={refund.sslcommerzRefundId}
                  mono
                />
                <Field label="Requested" value={formatDate(refund.date)} />
                <Field
                  label="Approved"
                  value={
                    refund.approvedAt
                      ? `${formatDate(refund.approvedAt)}${refund.approvedBy ? ` by ${refund.approvedBy}` : ""}`
                      : null
                  }
                />
                <Field
                  label="Completed"
                  value={refund.completedAt ? formatDate(refund.completedAt) : null}
                />
                <Field
                  label="Last Gateway Check"
                  value={
                    refund.lastCheckedAt
                      ? new Date(refund.lastCheckedAt).toLocaleString()
                      : null
                  }
                />
              </div>

              {refund.paymentBreakdown && (
                
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    Payment Breakdown
                  </p>
                  <div className="space-y-1.5">
                    <MoneyRow
                      label="Order Total"
                      amount={refund.paymentBreakdown.orderTotal}
                    />
                    <MoneyRow
                      label="Wallet Paid"
                      amount={refund.paymentBreakdown.walletPaid}
                    />
                    <MoneyRow
                      label="Online Paid"
                      amount={refund.paymentBreakdown.onlinePaid}
                    />
                    <MoneyRow
                      label="COD Paid"
                      amount={refund.paymentBreakdown.codPaid}
                    />
                    <MoneyRow
                      label="COD Unpaid"
                      amount={refund.paymentBreakdown.codUnpaid}
                      hint={
                        refund.paymentBreakdown.codUnpaid > 0
                          ? "not collected, not refundable"
                          : undefined
                      }
                    />
                    <div className="mt-1 border-t border-slate-200 pt-1.5">
                      <MoneyRow
                        label="Actual Paid"
                        amount={refund.paymentBreakdown.actualPaid}
                        strong
                      />
                    </div>
                    {refund.paymentBreakdown.walletReturned > 0 && (
                      <MoneyRow
                        label="Balance Returned"
                        amount={refund.paymentBreakdown.walletReturned}
                        hint="unpaid order, returned outside refunds"
                      />
                    )}
                    <MoneyRow
                      label="Already Refunded"
                      amount={refund.paymentBreakdown.refunded}
                    />
                    <MoneyRow
                      label="Refund In Progress"
                      amount={refund.paymentBreakdown.refundInProgress}
                    />
                    <MoneyRow
                      label="Still Refundable"
                      amount={refund.paymentBreakdown.refundableRemaining}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-3 sm:grid-cols-2">
                    <Field
                      label="Payment Status"
                      value={refund.paymentBreakdown.paymentStatus}
                    />
                    <Field
                      label="Gateway Transaction ID"
                      
                      value={
                        refund.paymentBreakdown.gatewayTransactionId || "Missing"
                      }
                      mono
                    />
                  </div>

                  {refund.isManualFallback && (
                    // why this refund could not take the route it should have
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed font-semibold text-amber-800">
                      Manual fallback refund
                      {refund.fallbackReason
                        ? `: ${refund.fallbackReason}.`
                        : "."}{" "}
                      This amount was credited to the customer's Refund Wallet
                      instead of the original payment method.
                    </p>
                  )}
                </div>
              )}

              {(refund.failureReason || refund.rejectionReason) && (
                // why the gateway refused, or why an admin did
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  {refund.failureReason || refund.rejectionReason}
                </p>
              )}

              {refund.returnRequest && (
                // what came back and why — the context for judging a post-delivery refund without leaving this screen
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    Return Request {refund.returnRequest.requestNumber}
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Product"
                      value={refund.returnRequest.product}
                    />
                    <Field
                      label="Quantity"
                      value={refund.returnRequest.quantity}
                    />
                    <Field label="Reason" value={refund.returnRequest.reason} />
                    <Field
                      label="Request Status"
                      value={refund.returnRequest.status}
                    />
                  </div>
                  {refund.returnRequest.note && (
                    <p className="mt-3 text-xs text-slate-700">
                      {refund.returnRequest.note}
                    </p>
                  )}
                </div>
              )}

              {awaitsApproval && (
                // the decision that releases the money — nothing has moved yet
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-800">
                    This refund is waiting for your approval.
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                    Nothing has been paid yet.{" "}
                    {refund.refundMethod === "ORIGINAL_PAYMENT"
                      ? "Approving sends it to SSLCommerz, which may take up to 3 days to reach the customer."
                      : "Approving adds it to the customer's Refund Wallet."}
                  </p>

                  {decisionError && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      {decisionError}
                    </p>
                  )}

                  {rejecting ? (
                    <div className="mt-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Why is this refund being rejected? The customer sees this."
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 outline-none focus:border-red-400"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={isRejecting || !rejectReason.trim()}
                          onClick={reject}
                          className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejecting(false)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={isApproving}
                        onClick={approve}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-700 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} /> Approve Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={13} /> Reject Refund
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* audit trail: every status change and gateway call, in order */}
              <h4 className="mt-6 mb-3 text-sm font-bold text-slate-800">
                Refund History
              </h4>
              <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
                {(refund.timeline ?? []).map((entry) => (
                  <li key={entry.id} className="relative">
                    {/* timeline dot */}
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">
                      {entry.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {entry.event}
                      {entry.from !== entry.to && entry.to
                        ? ` · ${entry.from} → ${entry.to}`
                        : ""}
                      {entry.at
                        ? ` · ${new Date(entry.at).toLocaleString()}`
                        : ""}
                    </p>
                  </li>
                ))}
                {(refund.timeline ?? []).length === 0 && (
                  <li className="text-xs text-slate-600">
                    No history recorded yet.
                  </li>
                )}
              </ol>
            </>
          )}
        </div>

        {/* footer actions */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          {isOpenStatus &&
            !awaitsApproval &&
            refund?.refundMethod === "ORIGINAL_PAYMENT" && (
            // ask SSLCommerz where this refund has got to
            <button
              type="button"
              onClick={() => syncRefund(refundId)}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Checking..." : "Check gateway status"}
            </button>
          )}
          {/* close the drawer */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundDetailsModal;
