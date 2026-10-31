import { X } from "lucide-react"; // close icon
import { useEffect, useState } from "react";
import RefundMethodChoice from "../shared/RefundMethodChoice"; // shared refund route picker
import RefundPolicyTerms from "../shared/RefundPolicyTerms"; // policy terms + agreement checkbox
import {
  REFUND_POLICY_METHOD_COPY,
  REFUND_POLICY_TITLE,
  policyMethodOrder,
} from "../../utils/refundPolicy"; // shared policy wording


// Popup that shows the refund policy and asks the customer to confirm the request
const RefundRequestConfirmModal = ({
  requestType, // "Return" (after delivery) or "Refund" (cancelled order)
  methods = [],
  value,
  onChange,
  gateway, // "SSLCommerz (bKash)"
  deliveryCharge = 0, // held back on a post-delivery refund
  estimatedAmount, // most this request can refund, when known
  walletPaid = 0, // part of the order paid from the BazarGhat Wallet
  isSubmitting = false,
  onConfirm,
  onClose,
}) => {
  const [step, setStep] = useState("policy"); // "policy" -> "method"
  const [agreed, setAgreed] = useState(false); // policy checkbox

  // lock the page behind the dialog while it is open
  useEffect(() => {
    // Stop the page scrolling while the popup is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Methods in display order, and whether this is an after-delivery return
  const ordered = policyMethodOrder(methods);
  const afterDelivery = requestType === "Return";
  const onPolicyStep = step === "policy";

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      {/* dialog card */}
      <div className="my-auto w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* modal header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {onPolicyStep ? REFUND_POLICY_TITLE : "Select Refund Method"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {onPolicyStep
                ? "Please read and accept the policy before requesting a refund."
                : "Choose how you want to receive your refund."}
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

        <div className="max-h-[80vh] space-y-3 overflow-y-auto px-5 py-3">
          {onPolicyStep ? (
            // step 1 — the policy has to be accepted first
            <RefundPolicyTerms agreed={agreed} onAgreedChange={setAgreed} />
          ) : (
            <>
              {/* what the policy means for this request */}
              <div className="rounded-xl bg-green-50 px-3.5 py-2.5">
                {estimatedAmount != null && (
                  <>
                    <p className="text-xs font-semibold tracking-wide text-green-700 uppercase">
                      Refundable Amount
                    </p>
                    <p className="text-xl leading-tight font-bold text-slate-900">
                      Up to ৳{estimatedAmount}
                    </p>
                  </>
                )}
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  {afterDelivery
                    ? deliveryCharge > 0
                      ? `Refund after delivery — the delivery charge of ৳${deliveryCharge} is deducted from the refundable amount.`
                      : "Refund after delivery — no delivery charge was paid on this order, so nothing is deducted."
                    : "Cancelled before delivery assignment — the full paid amount is refundable, no delivery charge is deducted."}
                </p>
              </div>

              {ordered.length > 0 ? (
                <RefundMethodChoice
                  compact
                  methods={ordered}
                  value={value}
                  onChange={onChange}
                  gateway={gateway}
                  copy={REFUND_POLICY_METHOD_COPY}
                />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
                  No refund method is available for this order right now. Your
                  request will still be reviewed by our team.
                </p>
              )}

              {walletPaid > 0 && ordered.includes("ORIGINAL_PAYMENT") && (
                // the wallet-paid part never travels to SSLCommerz
                <p className="text-xs leading-relaxed text-slate-600">
                  The ৳{walletPaid} paid from your BazarGhat Wallet always goes
                  back to your Wallet.
                </p>
              )}

              {/* the request is a request — approval comes first */}
              <p className="text-xs leading-relaxed text-slate-600">
                Your request goes to our team for review first. Nothing is
                refunded until it is approved.
              </p>
            </>
          )}
        </div>

        {/* footer buttons */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row">
          {onPolicyStep ? (
            <>
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
                onClick={() => setStep("method")}
                disabled={!agreed}
                className="flex-1 rounded-xl bg-green-700 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Agree & Continue
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("policy")}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Back
              </button>
              {/* a method must be picked whenever one is on offer */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={!agreed || isSubmitting || (ordered.length > 0 && !value)}
                className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Confirm Refund"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundRequestConfirmModal;
