import { CheckCircle2, Clock, Gift, TrendingUp, Truck } from "lucide-react";
import { itemCount, ORDERS } from "./data";
import StatusBadge from "./StatusBadge";

const ACTIVITY_ICON = {
  Delivered: { icon: CheckCircle2, bg: "bg-emerald-50 text-emerald-600" },
  "In Transit": { icon: Truck, bg: "bg-blue-50 text-blue-600" },
  Processing: { icon: Clock, bg: "bg-amber-50 text-amber-600" },
};

const OverviewTab = ({ onViewAllOrders }) => {
  const recent = ORDERS.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
          <button
            onClick={onViewAllOrders}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
          >
            View All →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recent.map((order) => {
            const { icon: Icon, bg } = ACTIVITY_ICON[order.status];
            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {order.id}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {itemCount(order)} items · {order.date}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-800">
                  {order.total}TK
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <TrendingUp size={18} strokeWidth={2.25} />
          </div>
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            This Month
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">2,550TK</p>
          <p className="text-xs font-medium text-slate-400">
            3 orders completed
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Gift size={18} strokeWidth={2.25} />
          </div>
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Saved Money
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">1,250TK</p>
          <p className="text-xs font-medium text-slate-400">
            From offers & discounts
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
