import { Loader2, X } from "lucide-react"; // loading spinner, close icon
import { useEffect, useState } from "react";
import {
  useCancelOrderMutation,
  useLazyGetRefundOptionsQuery,
} from "../../features/customer/orderApi";
import RefundMethodChoice from "../shared/RefundMethodChoice"; // shared refund route picker
import RefundPolicyTerms from "../shared/RefundPolicyTerms"; // policy terms + agreement checkbox
import {
  REFUND_POLICY_METHOD_COPY,
  REFUND_POLICY_TITLE,
  policyMethodOrder,
} from "../../utils/refundPolicy"; // shared policy wording

 
// Popup for cancelling an order and choosing where the refund goes
const CancelOrderModal = ({ order, onClose, onCancelled }) => {
  const [fetchOptions, { data: options, isFetching }] =
    useLazyGetRefundOptionsQuery();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [step, setStep] = useState("policy"); // "policy" -> "confirm"
  const [agreed, setAgreed] = useState(false); // policy checkbox
  const [chosenMethod, setChosenMethod] = useState(null); // customer's pick, once they make one
  const [error, setError] = useState("");

  // Load the refund options for this order when the popup opens
  useEffect(() => {
    if (order?.orderId) fetchOptions(order.orderId);
  }, [order?.orderId, fetchOptions]);

  
  // Stop the page scrolling while the popup is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!order) return null;

  // Refund methods available (original payment first) and whether a refund applies
  const methods = policyMethodOrder(options?.methods ?? []);
  const refundable = options?.refundable && methods.length > 0;
  
  // Whether the order can still be cancelled
  const cancellable = options ? options.cancellable !== false : true;
  
  // The policy step is shown only when a refund will be made
  const needsPolicy = cancellable && refundable;
  const onPolicyStep = needsPolicy && step === "policy";

  
  // How the payment was split between wallet and gateway
  const walletPortion = options?.walletPortion ?? 0;
  const gatewayPortion = options?.gatewayPortion ?? 0;
  const isSplit = walletPortion > 0 && gatewayPortion > 0;
  
  // Wallet money returned for an unpaid order
  const walletReturnAmount = options?.walletReturnAmount ?? 0;
  
  // Cash on delivery amount not collected yet
  const codUnpaidAmount = options?.codUnpaidAmount ?? 0;
  
  // Name of the gateway/channel shown in the text
  const gatewayLabel =
    options?.paymentGateway === "SSLCOMMERZ"
      ? options?.paymentChannel
        ? `SSLCommerz (${options.paymentChannel})`
        : "SSLCommerz"
      : (options?.paymentGateway ?? "the original payment method");
  // The customer has to pick a method themselves — nothing is preselected.
  const method = methods.includes(chosenMethod) ? chosenMethod : null;

  // Cancel the order (and start the refund) when the customer confirms
  const confirm = async () => {
    if (needsPolicy && !agreed) return; // never cancel a paid order without the policy accepted
    setError("");
    try {
      const response = await cancelOrder({
        id: order.orderId,
        refundMethod: refundable ? method : undefined,
      }).unwrap();
      onCancelled?.(response);
      onClose();
    } catch (err) {
      setError(
        err?.data?.message || "Could not cancel this order. Please try again.",
      );
    }
  };

  // Popup title for the current step
  const title = onPolicyStep
    ? REFUND_POLICY_TITLE
    : cancellable && refundable
      ? "Select Refund Method"
      : "Cancel Order";

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      {/* dialog card — scrolls internally on short screens */}
      <div className="my-auto w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* modal header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {!cancellable
                ? `Order ${order.id} can no longer be cancelled here.`
                : onPolicyStep
                  ? `Please read and accept the policy before cancelling ${order.id}.`
                  : refundable
                    ? `Your order ${order.id} will be cancelled and your eligible payment amount will be refunded.`
                    : `Are you sure you want to cancel ${order.id}? This cannot be undone.`}
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

        {/* sized to fit without scrolling; the cap only catches very short windows */}
        <div className="max-h-[80vh] overflow-y-auto px-5 py-3">
          {isFetching ? (
            // loading the refund options
            <div className="flex items-center gap-2 py-6 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" />
              Checking what can be refunded...
            </div>
          ) : !cancellable ? (
            // past the cancellation window — nothing left to confirm
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
              This order can no longer be cancelled from here — it is either
              already cancelled, or a delivery man has been assigned to it. Contact
              support if it still needs to be stopped; any refund on it is tracked
              in Refund History.
            </p>
          ) : onPolicyStep ? (
            // step 1 — the policy has to be accepted before anything else
            <RefundPolicyTerms agreed={agreed} onAgreedChange={setAgreed} />
          ) : refundable ? (
            <>
              {/* refundable amount, calculated on the server */}
              <div className="mb-3 rounded-xl bg-green-50 px-3.5 py-2.5">
                <p className="text-xs font-semibold tracking-wide text-green-700 uppercase">
                  Refund Amount
                </p>
                <p className="text-xl leading-tight font-bold text-slate-900">
                  ৳{options.refundableAmount}
                </p>
                {/* cancelled before assignment — the policy's full-refund case */}
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  Cancelled before delivery assignment — the full paid amount is
                  refunded, no delivery charge is deducted.
                </p>
                {isSplit && (
                  // split payment: what came from where, and which part is a choice
                  <div className="mt-2 space-y-1.5 border-t border-green-200 pt-2 text-xs text-slate-700">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>Paid from Refund Wallet</span>
                      <span className="font-bold text-slate-900">
                        ৳{walletPortion}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-600">
                      Returned to your Refund Wallet automatically.
                    </p>
                    <div className="flex items-baseline justify-between gap-2">
                      <span>Paid through {gatewayLabel}</span>
                      <span className="font-bold text-slate-900">
                        ৳{gatewayPortion}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-600">
                      You choose where this part goes.
                    </p>
                  </div>
                )}
              </div>

              {/* refund route choice, with what the chosen route means */}
              <RefundMethodChoice
                compact
                methods={methods}
                value={method}
                onChange={setChosenMethod}
                gateway={gatewayLabel}
                copy={REFUND_POLICY_METHOD_COPY}
                hint={
                  isSplit
                    ? `Choose where the ৳${gatewayPortion} paid through ${gatewayLabel} goes:`
                    : undefined
                }
                soleMethodNote={
                  gatewayPortion === 0
                    ? "This order was paid from your Refund Wallet, so the refund goes back there."
                    : undefined
                }
              />
            </>
          ) : walletReturnAmount > 0 || codUnpaidAmount > 0 ? (
            // No refund is raised, but the money on this order still has to be accounted for.
            <div className="space-y-2.5">
              {walletReturnAmount > 0 && (
                <div className="rounded-xl bg-green-50 px-3.5 py-2.5">
                  <p className="text-xs font-semibold tracking-wide text-green-700 uppercase">
                    Refund to Account Balance
                  </p>
                  <p className="text-xl leading-tight font-bold text-slate-900">
                    ৳{walletReturnAmount}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    Returned to your Refund Wallet automatically when this
                    order is cancelled.
                  </p>
                </div>
              )}

              {codUnpaidAmount > 0 && (
                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    Cash on Delivery
                  </p>
                  <p className="text-xl leading-tight font-bold text-slate-900">
                    ৳{codUnpaidAmount}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    Not refundable — this amount is paid at the door and you
                    have not paid it.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // nothing to refund — Cash on Delivery, or an unpaid order
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
              {options?.note ||
                "There is no payment on this order, so nothing will be refunded."}
            </p>
          )}

          {error && (
            // cancel error message
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* footer buttons */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row">
          {!cancellable ? (
            // nothing to do but close
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          ) : onPolicyStep ? (
            <>
              {/* dismiss modal, keep order */}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              {/* stays disabled until the policy checkbox is ticked */}
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!agreed || isFetching}
                className="flex-1 rounded-xl bg-green-700 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Agree & Continue
              </button>
            </>
          ) : (
            <>
              {/* back to the policy — or, for a Cash on Delivery order that had no policy step, keep the order */}
              <button
                type="button"
                onClick={needsPolicy ? () => setStep("policy") : onClose}
                disabled={isCancelling}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {needsPolicy ? "Back" : "Keep Order"}
              </button>
              {/* confirm cancellation (and refund, when there is one) */}
              <button
                type="button"
                onClick={confirm}
                disabled={
                  (needsPolicy && !agreed) ||
                  isCancelling ||
                  isFetching ||
                  (refundable && !method)
                }
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling
                  ? "Cancelling..."
                  : refundable
                    ? "Confirm Refund"
                    : "Confirm Cancellation"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
