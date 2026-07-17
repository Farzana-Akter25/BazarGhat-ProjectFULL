import { Calendar, Download, Package, RotateCcw, Search, SlidersHorizontal, Truck } from "lucide-react";
import { itemCount, ORDERS } from "./data";
import StatusBadge from "./StatusBadge";

const OrdersTab = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search orders by ID, product name..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <SlidersHorizontal size={16} /> Filter
        </button>
      </div>

      <div className="space-y-4">
        {ORDERS.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {order.id}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {order.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package size={12} /> {itemCount(order)} items
                  </span>
                  {order.deliveredOn && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Truck size={12} /> Delivered on {order.deliveredOn}
                    </span>
                  )}
                  {order.estDelivery && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Truck size={12} /> Est. delivery {order.estDelivery}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Total Amount
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {order.total}TK
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {order.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
                      {item.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item.price}TK
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                <Truck size={15} /> Track Order
              </button>
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                <Download size={15} /> Invoice
              </button>
              {order.status === "Delivered" && (
                <button className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                  <RotateCcw size={15} /> Return
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersTab;
