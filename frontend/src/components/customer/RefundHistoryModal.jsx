import { RotateCcw, X } from "lucide-react"; // empty-state and close icons
import { Fragment } from "react";
import { formatDate } from "../../utils/formatDate";
import { shortId } from "../../utils/shortId";
import DataTable, { TD } from "../shared/DataTable"; // shared table shell
import { useGetMyRefundsQuery } from "../../features/customer/refundApi";
import { useGetWalletTransactionsQuery } from "../../features/customer/walletApi";
import { refundMethodNote } from "../../utils/refundMethods"; // shared refund wording
import StatusBadge from "../../pages/customer/CustomerDashboard/StatusBadge"; // shared pill styling

// refund history table columns
const REFUND_COLUMNS = [
  { label: "Order / Refund No." },
  { label: "Date" },
  { label: "Refund Method" },
  { label: "Payment Method" },
  { label: "Status" },
  { label: "Amount", align: "right" },
];

// grey pulsing placeholder shown while the list loads
const SkeletonBar = ({ className = "w-24" }) => (
  <div className={`h-3 animate-pulse rounded bg-slate-200 ${className}`} />
);


// List of wallet credits and debits
const BalanceActivity = () => {
  // Load wallet transactions
  const { data, isLoading } = useGetWalletTransactionsQuery();
  const entries = data?.transactions ?? [];

  return (
    <div className="mt-6">
      {/* section heading + the balance held right now */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">Balance Activity</h4>
        <p className="text-xs font-medium text-slate-600">
          Current balance:{" "}
          <span className="font-bold text-slate-800">
            ৳{(data?.balance ?? 0).toFixed(2)}
          </span>
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200">
        {isLoading ? (
          // placeholder rows while the ledger loads
          <div className="space-y-2 p-4">
            <SkeletonBar className="w-48" />
            <SkeletonBar className="w-32" />
          </div>
        ) : entries.length === 0 ? (
          // empty state
          <p className="px-4 py-8 text-center text-xs text-slate-600">
            No balance activity yet. Refunds credited to your balance, and
            orders you pay for with it, will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              // Money in or out?
              const isCredit = entry.type === "CREDIT";

              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    {/* signed amount — green in, red out */}
                    <p
                      className={`text-sm font-bold ${isCredit ? "text-green-700" : "text-red-600"}`}
                    >
                      {isCredit ? "+" : "-"} ৳{Number(entry.amount).toFixed(2)}
                    </p>
                    {/* what moved the money, naming the order behind it */}
                    <p className="mt-0.5 text-xs break-words text-slate-600">
                      {entry.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="Completed" />
                    {/* balance left after this movement */}
                    <p className="mt-1 text-[11px] whitespace-nowrap text-slate-600">
                      Balance: ৳{Number(entry.balanceAfter).toFixed(2)}
                    </p>
                    <p className="text-[11px] whitespace-nowrap text-slate-600">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};


// List of the customer's refunds with their status
export const RefundHistoryContent = () => {
  const { data: refunds = [], isLoading } = useGetMyRefundsQuery();

  return (
    <>
      {isLoading ? (
        // placeholder rows while loading
        <div className="space-y-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-2 rounded-xl border border-slate-200 p-4">
              <SkeletonBar className="w-40" />
              <SkeletonBar className="w-24" />
            </div>
          ))}
        </div>
      ) : refunds.length === 0 ? (
        // empty state
        <div className="px-4 py-12 text-center">
          <RotateCcw size={28} className="mx-auto mb-2 text-slate-500" />
          <p className="text-sm font-semibold text-slate-600">
            No refunds yet.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Refunds from cancelled orders will appear here.
          </p>
        </div>
      ) : (
        // one row per refund, with any gateway/failure note underneath it
        <DataTable columns={REFUND_COLUMNS}>
          {refunds.map((refund) => {
            // Extra note shown under a refund depending on its state
            const note = refund.awaitsApproval
              ? {
                  // a post-delivery request nobody has decided on yet
                  tone: "bg-amber-50 text-amber-700",
                  text: "Pending review by our team. Nothing has been refunded yet — you will be notified as soon as it is decided.",
                }
              : refund.status === "PROCESSING"
                ? {
                    // gateway refunds are not instant — say so plainly
                    tone: "bg-amber-50 text-amber-700",
                    text:
                      refund.method === "ORIGINAL_PAYMENT"
                        ? // the refund row carries the channel the original
                          // payment came through, e.g. "SSLCommerz (bKash)"
                          refundMethodNote(
                            "ORIGINAL_PAYMENT",
                            refund.paymentMethod,
                          )
                        : "Your refund is currently being processed.",
                  }
                : refund.status === "REJECTED"
                  ? {
                      // why it was refused, in the admin's own words
                      tone: "bg-slate-100 text-slate-700",
                      text:
                        refund.rejectionReason ||
                        "This refund request was not approved. Please contact support if you need more information.",
                    }
                  : refund.status === "FAILED"
                    ? {
                        // failure detail, so the customer knows to contact support
                        tone: "bg-red-50 text-red-600",
                        text:
                          refund.failureReason ||
                          "This refund could not be completed. Please contact support.",
                      }
                    : null;
            return (
              <Fragment key={refund.id}>
                <tr className="align-top hover:bg-slate-50">
                  {/* order number + refund number cell */}
                  <td className={TD}>
                    <p
                      className="font-semibold whitespace-nowrap text-slate-800"
                      title={refund.orderNumber}
                    >
                      {shortId(refund.orderNumber)}
                    </p>
                    <p
                      className="mt-0.5 text-xs text-slate-600"
                      title={refund.refundNumber}
                    >
                      {shortId(refund.refundNumber)}
                    </p>
                  </td>
                  {/* refund date cell */}
                  <td className={`${TD} text-slate-700`}>
                    {formatDate(refund.date)}
                  </td>
                  {/* refund method cell */}
                  <td className={`${TD} font-medium text-slate-600`}>
                    {refund.methodLabel}
                  </td>
                  {/* original payment method cell */}
                  <td className={`${TD} font-medium text-slate-600`}>
                    {refund.paymentMethod || "—"}
                  </td>
                  {/* status pill cell — approval comes before any movement */}
                  <td className={TD}>
                    <StatusBadge
                      status={
                        refund.awaitsApproval
                          ? "Pending Approval"
                          : refund.statusLabel
                      }
                    />
                  </td>
                  {/* refund amount cell */}
                  <td
                    className={`${TD} text-right font-bold text-slate-800`}
                  >
                    ৳{refund.amount}
                  </td>
                </tr>
                {note && (
                  // gateway / failure note row
                  <tr>
                    <td colSpan={REFUND_COLUMNS.length} className="px-4 pb-3">
                      <p
                        className={`rounded-lg px-3 py-2 text-[11px] font-medium ${note.tone}`}
                      >
                        {note.text}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </DataTable>
      )}

      {/* where the balance came from and what has been spent from it */}
      <BalanceActivity />
    </>
  );
};

// The same history in a dialog, opened from the refund wallet summary card.
const RefundHistoryModal = ({ onClose }) => (
  // modal overlay
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
    {/* dialog card */}
    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
      {/* modal header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Refund History</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Refunds from your cancelled orders
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <RefundHistoryContent />
      </div>
    </div>
  </div>
);

export default RefundHistoryModal;
