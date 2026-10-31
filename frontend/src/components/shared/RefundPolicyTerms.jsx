import { CheckCircle2 } from "lucide-react"; // bullet icon
import {
  REFUND_POLICY_AGREEMENT,
  REFUND_POLICY_POINTS,
} from "../../utils/refundPolicy"; // shared policy wording

// The Refund & Cancellation Policy terms plus the agreement checkbox.
const RefundPolicyTerms = ({ agreed, onAgreedChange }) => {
  return (
    <div>
      {/* policy points */}
      <ul className="space-y-2 rounded-xl bg-slate-50 px-3.5 py-3">
        {REFUND_POLICY_POINTS.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
          >
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-700" />
            {point}
          </li>
        ))}
      </ul>

      {/* agreement checkbox */}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-green-700"
        />
        {REFUND_POLICY_AGREEMENT}
      </label>
    </div>
  );
};

export default RefundPolicyTerms;
