import { Check, Wallet } from "lucide-react"; // method icons
import {
  REFUND_METHOD_COPY,
  refundMethodNote,
} from "../../utils/refundMethods"; // shared wording, same rules as the policy page

// Icon per route.
const METHOD_ICON = { WALLET: Wallet, ORIGINAL_PAYMENT: Check };

// one selectable refund method card
const RefundMethodOption = ({ method, selected, onSelect, gateway, compact, copyMap }) => {
  // Title/description and icon for this method
  const copy = copyMap[method];
  if (!copy) return null;
  const Icon = METHOD_ICON[method] ?? Wallet;

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      aria-pressed={selected}
      className={`flex w-full items-start text-left transition-all ${
        compact ? "gap-2.5 rounded-xl border-2 p-3" : "gap-3 rounded-2xl border-2 p-4"
      } ${
        selected
          ? "border-green-700 bg-green-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* method icon badge */}
      <span
        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-xl ${
          compact ? "h-8 w-8" : "h-9 w-9"
        } ${
          selected ? "bg-green-700 text-white" : "bg-orange-50 text-orange-500"
        }`}
      >
        <Icon size={compact ? 16 : 18} />
      </span>
      <span className="min-w-0">
        {/* method title */}
        <span className="block text-sm font-bold text-slate-800">
          {copy.title}
        </span>
        {/* supporting line */}
        <span
          className={`mt-0.5 block text-xs text-slate-700 ${compact ? "leading-snug" : "leading-relaxed"}`}
        >
          {copy.detail}
        </span>
        {method === "ORIGINAL_PAYMENT" && gateway && (
          // which gateway the money travels back through
          <span className="mt-1 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
            Payment Gateway: {gateway}
          </span>
        )}
      </span>
    </button>
  );
};

// "Choose how you want to receive your refund" — the card list plus the note explaining what the current choice means.
const RefundMethodChoice = ({
  methods = [],
  value,
  onChange,
  gateway,
  label = "Refund Method",
  hint = "Choose how you want to receive your refund:",
  
  soleMethodNote = "This order cannot be refunded to an online payment method, so the refund can only be added to your Refund Wallet.",
  // tighter spacing for the cancel dialog, so the whole thing fits without scrolling
  compact = false,
  // option titles/details — defaults to the shared refund wording; the refund policy dialog passes its own
  copy = REFUND_METHOD_COPY,
}) => {
  if (methods.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {label}
      </p>
      {hint && <p className="mb-2 text-xs text-slate-600">{hint}</p>}

      <div className={compact ? "space-y-2" : "space-y-3"}>
        {methods.map((m) => (
          <RefundMethodOption
            key={m}
            method={m}
            selected={value === m}
            onSelect={onChange}
            gateway={gateway}
            compact={compact}
            copyMap={copy}
          />
        ))}
      </div>

      {value && (
        // what the chosen route actually means for the customer
        <p
          className={`rounded-xl bg-blue-50 px-3 text-xs text-blue-800 ${compact ? "mt-2 py-2 leading-snug" : "mt-3 py-2.5 leading-relaxed"}`}
        >
          {refundMethodNote(value, gateway)}
        </p>
      )}

      {methods.length === 1 && methods[0] === "WALLET" && soleMethodNote && (
        // the gateway route is not available for this order
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {soleMethodNote}
        </p>
      )}
    </div>
  );
};

export default RefundMethodChoice;
