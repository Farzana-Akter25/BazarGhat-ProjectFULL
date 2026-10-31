import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  ELIGIBLE_REASONS,
  NOT_ELIGIBLE_REASONS,
  TIME_WINDOWS,
} from "../../utils/returnPolicy"; // shared policy rules

// The return & refund policy body, shared by the customer dashboard tab and the admin quick-action modal so both always show exactly the same rules.
const ReturnPolicyContent = ({ showHeader = true }) => {
  return (
    // stacked policy sections
    <div className="space-y-6">
      {/* policy header card */}
      {showHeader && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            {/* orange return icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <RotateCcw size={20} strokeWidth={2.25} />
            </div>
            <div>
              {/* card title */}
              <h3 className="text-base font-bold text-slate-800">
                Return Policy
              </h3>
              {/* card subtitle */}
              <p className="text-xs font-medium text-slate-600">
                Please review these rules before submitting a return request
              </p>
            </div>
          </div>
        </div>
      )}

      {/* eligible vs not eligible columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* eligible reasons card */}
        <div className="rounded-2xl border border-green-100 bg-green-50/40 p-5">
          {/* green heading row */}
          <div className="mb-3 flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} strokeWidth={2.25} />
            <h4 className="text-sm font-bold">Eligible for Return</h4>
          </div>
          {/* eligible reasons list */}
          <ul className="space-y-2">
            {ELIGIBLE_REASONS.map((reason) => (
              // eligible reason row
              <li
                key={reason}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                {/* check icon */}
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-green-700"
                />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* not eligible reasons card */}
        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
          {/* red heading row */}
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <XCircle size={18} strokeWidth={2.25} />
            <h4 className="text-sm font-bold">Not Eligible for Return</h4>
          </div>
          {/* not eligible reasons list */}
          <ul className="space-y-2">
            {NOT_ELIGIBLE_REASONS.map((reason) => (
              // not eligible reason row
              <li
                key={reason}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                {/* x icon */}
                <XCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* cancelled order refund note */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        {/* blue heading row */}
        <div className="mb-2 flex items-center gap-2 text-blue-700">
          <Wallet size={18} strokeWidth={2.25} />
          <h4 className="text-sm font-bold">Refund for Cancelled Orders</h4>
        </div>
        {/* refund explanation text */}
        <p className="text-sm text-slate-600">
          If an order is cancelled before shipment and payment was already
          confirmed at the time of order, a full refund will be provided.
        </p>
      </div>

      {/* time window rules card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* heading row with clock icon */}
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <Clock size={18} strokeWidth={2.25} />
          <h4 className="text-sm font-bold">Return Request Time Window</h4>
        </div>
        {/* time window entries */}
        <div className="space-y-3">
          {TIME_WINDOWS.map((w) => (
            // single time window rule box
            <div
              key={w.title}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              {/* category title */}
              <p className="text-sm font-semibold text-slate-800">
                {w.title}
              </p>
              {/* rule text */}
              <p className="mt-1 text-sm text-slate-600">{w.rule}</p>
              {/* warning note with icon */}
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

export default ReturnPolicyContent;
