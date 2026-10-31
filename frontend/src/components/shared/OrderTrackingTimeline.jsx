import { CheckCircle2, PackageCheck, RefreshCcw, Wallet } from "lucide-react";
import { formatDateTime } from "../../utils/formatDate";
import { PhotoStrip } from "./PhotoViewer"; // shared thumbnails + full-screen viewer

// who-performed-the-change label lookup
const ACTOR_LABEL = {
  customer: "Customer",
  admin: "Admin",
  delivery: "Delivery Man",
  system: "System",
};

// format timestamp for display, day-month-year plus the clock time
const formatAt = (iso) => formatDateTime(iso);

// Timeline of an order's status changes, refund and replacement
const OrderTrackingTimeline = ({
  history = [],
  refund,
  replacementOrder,
  replacementForOrderNumber,
}) => {
  return (
    <div className="space-y-5">
      {/* replacement order notice */}
      {replacementForOrderNumber && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-gray-900">
          <RefreshCcw size={13} /> This is a replacement order for{" "}
          {replacementForOrderNumber}
        </div>
      )}

      {/* status history timeline */}
      <div>
        {/* section label */}
        <p className="mb-2 text-xs font-bold tracking-wide text-gray-900 uppercase">
          Order Timeline
        </p>
        {history.length === 0 ? (
          // empty state
          <p className="text-xs text-gray-800">No status updates yet.</p>
        ) : (
          <ol className="space-y-0">
            {/* timeline step */}
            {history.map((h, idx) => (
              <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                {/* connecting line to next step */}
                {idx !== history.length - 1 && (
                  <span className="absolute top-4 left-[7px] h-full w-px bg-slate-200" />
                )}
                {/* step dot icon */}
                <span className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                  <CheckCircle2 size={14} />
                </span>
                <div className="min-w-0">
                  {/* status label */}
                  <p className="text-sm font-semibold text-gray-900">
                    {h.status}
                  </p>
                  {/* timestamp + who made the change */}
                  <p className="text-xs text-gray-800">
                    {formatAt(h.at)} · {ACTOR_LABEL[h.by] || h.by}
                    {h.byName ? ` (${h.byName})` : ""}
                  </p>
                  {/* optional note */}
                  {h.note && (
                    <p className="mt-0.5 text-xs text-gray-900">{h.note}</p>
                  )}
                  {/*  */}
                  {h.photos && h.photos.length > 0 && (
                    <div className="mt-2">
                      <PhotoStrip photos={h.photos} label={null} size="h-16 w-16" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* automatic refund status */}
      {refund && (
        <div>
          {/* section label */}
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-900 uppercase">
            <Wallet size={13} /> Refund Status
          </p>
          {/* settled refunds show as Refunded; a request still awaiting the admin's decision must not claim the money is already back */}
          {refund.status === "Refunded" ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 size={16} className="text-green-700" />
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-900">Refunded</p>
                <p className="text-[11px] text-gray-800">
                  Automatic Gateway Refund
                  {refund.completedAt ? ` · ${formatAt(refund.completedAt)}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Wallet size={16} className="text-amber-600" />
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-900">
                  Refund Requested
                </p>
                <p className="text-[11px] text-gray-800">
                  Awaiting review — the refund is issued automatically once approved
                </p>
              </div>
            </div>
          )}
          {/* refund amount, if known */}
          {refund.amount != null && (
            <p className="mt-2 text-xs text-gray-900">
              Refund amount: {refund.amount}TK
            </p>
          )}
        </div>
      )}

      {/* linked replacement order */}
      {replacementOrder && (
        <div>
          {/* section label */}
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-900 uppercase">
            <PackageCheck size={13} /> Replacement Order
          </p>
          {/* replacement order summary card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-gray-900">
            A replacement order{" "}
            <span className="font-semibold">
              {replacementOrder.orderNumber}
            </span>{" "}
            was created for this order — current status:{" "}
            <span className="font-semibold">{replacementOrder.status}</span>.
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
