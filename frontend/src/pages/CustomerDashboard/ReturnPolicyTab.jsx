import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react";

const ELIGIBLE_REASONS = [
  "Wrong product delivered",
  "Damaged or leaking product",
  "Expired product",
  "Missing item",
  "Incorrect quantity or weight",
  "Product quality significantly below the advertised standard",
];

const NOT_ELIGIBLE_REASONS = [
  "Customer simply changed their mind",
  "Product has been consumed or partially used",
  "Product was stored improperly after delivery",
  "Complaint submitted after the allowed time",
  "Minor natural variations in size, color, or shape of fresh produce",
];

const TIME_WINDOWS = [
  {
    title: "Fresh Vegetables, Meat & Fish",
    rule: "Return request must be submitted within 2 hours of delivery.",
    note: "Requests made after this window will not be accepted.",
  },
  {
    title: "All Other Products",
    rule: "Return request must be submitted within 7 days of delivery, only if there is a genuine problem with the product.",
    note: "Requests made after this window will not be accepted.",
  },
];

const ReturnPolicyTab = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <RotateCcw size={20} strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Return Policy
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Please review these rules before submitting a return request
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} strokeWidth={2.25} />
            <h4 className="text-sm font-bold">Eligible for Return</h4>
          </div>
          <ul className="space-y-2">
            {ELIGIBLE_REASONS.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <XCircle size={18} strokeWidth={2.25} />
            <h4 className="text-sm font-bold">Not Eligible for Return</h4>
          </div>
          <ul className="space-y-2">
            {NOT_ELIGIBLE_REASONS.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <XCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="mb-2 flex items-center gap-2 text-blue-700">
          <Wallet size={18} strokeWidth={2.25} />
          <h4 className="text-sm font-bold">Refund for Cancelled Orders</h4>
        </div>
        <p className="text-sm text-slate-600">
          If an order is cancelled before shipment and payment was already
          confirmed at the time of order, a full refund will be provided.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <Clock size={18} strokeWidth={2.25} />
          <h4 className="text-sm font-bold">Return Request Time Window</h4>
        </div>
        <div className="space-y-3">
          {TIME_WINDOWS.map((w) => (
            <div
              key={w.title}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-800">
                {w.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">{w.rule}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle size={13} /> {w.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicyTab;
