import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react"; // tone icons + dismiss
import toast from "react-hot-toast";

// one look per tone, so every notification in the app reads the same way
const TONES = {
  success: { Icon: CheckCircle2, chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  error: { Icon: XCircle, chip: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  warning: { Icon: AlertTriangle, chip: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  info: { Icon: Info, chip: "bg-sky-50 text-sky-600", bar: "bg-sky-500" },
  loading: { Icon: Loader2, chip: "bg-slate-100 text-slate-500", bar: "bg-slate-400", spin: true },
};

// compact notification card rendered behind every notify.* call
const Toast = ({ t, tone = "info", message }) => {
  // Icon and colours for this tone
  const { Icon, chip, bar, spin } = TONES[tone] || TONES.info;
  const showBar = Number.isFinite(t.duration) && tone !== "loading"; // no countdown on pending toasts

  return (
    <div
      {...t.ariaProps}
      className={`pointer-events-auto relative flex w-full max-w-xs items-center gap-2.5 overflow-hidden rounded-2xl bg-white px-3 py-2.5 shadow-lg ring-1 ring-black/5 ${
        t.visible
          ? "animate-[toast-in_180ms_ease-out]"
          : "animate-[toast-out_140ms_ease-in_forwards]"
      }`}
    >
      {/* tone icon chip */}
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${chip}`}>
        <Icon size={16} strokeWidth={2.5} className={spin ? "animate-spin" : undefined} />
      </span>

      {/* the message, capped at two lines to keep notifications glanceable */}
      <p className="line-clamp-2 flex-1 text-[13px] font-semibold leading-snug text-slate-800">
        {message}
      </p>

      {/* manual dismiss */}
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      {/* time-remaining bar, matches the auto-dismiss delay */}
      {showBar && (
        <span
          className={`absolute bottom-0 left-0 h-0.5 ${bar} animate-[toast-progress_linear_forwards]`}
          style={{ animationDuration: `${t.duration}ms` }}
        />
      )}
    </div>
  );
};

export default Toast;
