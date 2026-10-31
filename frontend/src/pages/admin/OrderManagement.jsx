import {
  CircleCheck,
  ClipboardList,
  Eye,
  FileText,
  LoaderCircle,
  Search as SearchIcon,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, StatCard, StatusBadge } from "../../components/admin/AdminUI";
import CustomerOrderHistoryModal from "../../components/admin/CustomerOrderHistoryModal";
import RefundDetailsModal from "../../components/admin/RefundDetailsModal";
import InvoiceModal from "../../components/shared/InvoiceModal";
import OrderTrackingTimeline from "../../components/shared/OrderTrackingTimeline";
import { useLazyGetInvoiceQuery } from "../../features/admin/invoiceApi";
import {
  useGetOrdersQuery,
  useLazyGetOrderQuery,
  useUpdateOrderStatusMutation,
} from "../../features/admin/orderApi";
import { useGetReturnsQuery } from "../../features/admin/returnApi";
import { formatDate } from "../../utils/formatDate";
import { shortId } from "../../utils/shortId";
import { TH } from "../../components/shared/DataTable";
import AdminLayout from "../../layouts/AdminLayout";
import {
  ADMIN_STATUS_FILTERS,
  canAdminCancelOrder,
  toAdminStatus,
} from "../../utils/orderStatus";

const NEXT_STATUS = { Pending: "Processing", Processing: "Confirmed" };

const REFUND_FILTERS = ["All", "Pending", "Processing", "Completed", "Failed"];
const REFUND_PILL = {
  PENDING: "bg-orange-50 text-orange-600",
  PROCESSING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-50 text-red-600",
};
const refundLabel = (status) =>
  status ? status.charAt(0) + status.slice(1).toLowerCase() : "";

const ACTION_BTN =
  "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
const StatusCell = ({ order }) => {
  const rawStatus = order.status;
  const isDoorstepReview = rawStatus === "Customer Rejected at Doorstep";
  const isRiderRejected =
    rawStatus === "Confirmed" &&
    order.rejectionReason === "Rejected by Delivery Man";

  return (
    <>
      <StatusBadge status={toAdminStatus(rawStatus)} />
      {rawStatus === "Cancelled" && order.cancelledBy && (
        <p className="mt-1.5 text-[11px] text-black">
          By {order.cancelledBy === "admin" ? "Admin" : "Customer"}
        </p>
      )}
      {isDoorstepReview && order.rejectionReason && (
        <p className="mt-1.5 text-[11px] leading-relaxed break-words text-red-500">
          "{order.rejectionReason}"
        </p>
      )}
      {isRiderRejected && (
        <p className="mt-1.5 text-[11px] leading-relaxed break-words text-red-500">
          {order.rejectionReason}
        </p>
      )}
    </>
  );
};

const AmountCell = ({ order, onRefundDetails }) => (
  <>
    <p className="font-bold text-black">{order.paymentMethod}</p>

    {order.paymentMethod && (
      <p className="mt-0.5 text-xs text-black">{order.amount}</p>
    )}

    {order.refund ? (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => onRefundDetails?.(order.refund.id)}
          title="View refund details"
          className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold hover:opacity-80 ${
            REFUND_PILL[order.refund.status] ||
            "bg-slate-100 text-black"
          }`}
        >
          Refund: {refundLabel(order.refund.status)}
        </button>

        <p className="mt-1 text-[11px] text-black">
          ৳{order.refund.amount} · {order.refund.methodLabel}
        </p>

        {order.refund.sslcommerzRefundId && (
          <p className="mt-0.5 font-mono text-[10px] break-all text-black">
            {order.refund.sslcommerzRefundId}
          </p>
        )}
      </div>
    ) : (
      order.paymentStatus === "Paid" && (
        <div className="mt-2">
          <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
            Paid
          </span>
        </div>
      )
    )}
  </>
);
const OrderActions = ({
  order,
  align = "justify-end",
  onAdvance,
  onCancel,
  onTrack,
  onHistory,
  onInvoice,
}) => {
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${align}`}>
      {nextStatus && (
        <button
          onClick={() => onAdvance(order.orderId, nextStatus)}
          title={`Move this order to ${nextStatus}`}
          className={`${ACTION_BTN} bg-green-50 text-green-700 hover:bg-green-100 focus-visible:ring-green-600`}
        >
          Move to {nextStatus}
        </button>
      )}
      {canAdminCancelOrder(order.status) && (
        <button
          onClick={() => onCancel(order.orderId)}
          title="Cancel this order"
          className={`${ACTION_BTN} bg-red-50 text-red-500 hover:bg-red-100 focus-visible:ring-red-500`}
        >
          Cancel
        </button>
      )}
      <button
        onClick={() => onTrack(order)}
        title="View tracking timeline"
        aria-label="View tracking timeline"
        className={`${ICON_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-100 focus-visible:ring-indigo-500`}
      >
        <Truck size={15} />
      </button>
      <button
        onClick={() => onHistory(order)}
        title="View customer order history"
        aria-label="View customer order history"
        className={`${ICON_BTN} bg-orange-50 text-orange-500 hover:bg-orange-100 focus-visible:ring-orange-500`}
      >
        <Eye size={15} />
      </button>
      <button
        onClick={() => onInvoice(order)}
        title="View & download invoice"
        aria-label="View and download invoice"
        className={`${ICON_BTN} bg-blue-50 text-blue-500 hover:bg-blue-100 focus-visible:ring-blue-500`}
      >
        <FileText size={15} />
      </button>
    </div>
  );
};

const SkeletonBar = ({ className = "w-24" }) => (
  <div className={`h-3 animate-pulse rounded bg-slate-200 ${className}`} />
);

const EmptyState = ({ onReset }) => (
  <div className="px-4 py-12 text-center">
    <ClipboardList size={28} className="mx-auto mb-2 text-black" />
    <p className="text-sm font-semibold text-black">
      No orders match your search.
    </p>
    <p className="mt-1 text-xs text-black">
      Try a different Order ID, customer name or status.
    </p>
    <button
      onClick={onReset}
      className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-100 px-4 text-xs font-semibold text-black transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      Clear filters
    </button>
  </div>
);

const OrderManagement = () => {
  const { data: orders = [], isLoading } = useGetOrdersQuery();
  const { data: returns = [] } = useGetReturnsQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [fetchInvoice, { data: invoice, isLoading: isInvoiceLoading, error: invoiceError }] =
    useLazyGetInvoiceQuery();
  const [fetchOrder, { data: trackedOrder, isFetching: isTracking }] =
    useLazyGetOrderQuery();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [refundFilter, setRefundFilter] = useState("All");
  const [refundDetailsId, setRefundDetailsId] = useState(null);

  const counts = useMemo(
    () => ({
      total: orders.length,
      delivered: orders.filter((o) => toAdminStatus(o.status) === "Delivered")
        .length,
      processing: orders.filter((o) => toAdminStatus(o.status) === "Processing")
        .length,
      assigned: orders.filter((o) => toAdminStatus(o.status) === "Assigned")
        .length,
    }),
    [orders],
  );

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const matchesQuery =
          !query ||
          o.id.toLowerCase().includes(query.toLowerCase()) ||
          o.customer.toLowerCase().includes(query.toLowerCase());
        const matchesStatus =
          status === "All Status" || toAdminStatus(o.status) === status;
        const matchesRefund =
          refundFilter === "All" ||
          refundLabel(o.refund?.status) === refundFilter;
        return matchesQuery && matchesStatus && matchesRefund;
      }),
    [orders, query, status, refundFilter],
  );

  const advanceOrder = (orderId, nextStatus) => {
    updateOrderStatus({ id: orderId, status: nextStatus });
  };

  const cancelOrder = (orderId) => {
    if (
      window.confirm(
        "Cancel this order? Stock will be restored. If it was paid: the wallet part is refunded to the customer's wallet instantly, and the SSLCommerz part is refunded to the original payment method within 3 days. Unpaid orders get no refund.",
      )
    ) {
      updateOrderStatus({ id: orderId, status: "Cancelled" });
    }
  };

  const viewCustomerHistory = (order) => {
    setHistoryCustomer({ name: order.customer, phone: order.phone });
  };

  const viewInvoice = (order) => {
    setInvoiceOrderId(order.orderId);
    fetchInvoice(order.orderId);
  };

  const viewTracking = (order) => {
    setTrackingOrderId(order.orderId);
    fetchOrder(order.orderId);
  };

  const resetFilters = () => {
    setQuery("");
    setStatus("All Status");
    setRefundFilter("All");
  };

  const customerHistoryOrders = useMemo(() => {
    if (!historyCustomer) return [];
    return orders.filter(
      (o) =>
        o.phone === historyCustomer.phone &&
        o.customer === historyCustomer.name,
    );
  }, [orders, historyCustomer]);

  const customerHistoryReturns = useMemo(() => {
    if (!historyCustomer) return [];
    return returns.filter(
      (r) =>
        r.phone === historyCustomer.phone &&
        r.customer === historyCustomer.name,
    );
  }, [returns, historyCustomer]);

  return (
    <AdminLayout
      title="Order Management"
      subtitle="View and manage all customer orders"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          iconBg="bg-slate-700"
          label="Total Orders"
          value={counts.total}
        />
        <StatCard
          icon={CircleCheck}
          iconBg="bg-green-700"
          label="Delivered"
          value={counts.delivered}
        />
        <StatCard
          icon={LoaderCircle}
          iconBg="bg-orange-500"
          label="Processing"
          value={counts.processing}
        />
        <StatCard
          icon={Truck}
          iconBg="bg-blue-500"
          label="Assigned"
          value={counts.assigned}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by Order ID or Customer Name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-black hover:bg-slate-200 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-green-700"
          >
            {ADMIN_STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-black">
          <span className="font-medium">
            Showing {filtered.length} of {orders.length} orders
          </span>
          {query && (
            <button
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-black hover:bg-slate-200"
            >
              Search: "{query}"
              <X size={12} />
            </button>
          )}
          {refundFilter !== "All" && (
            <button
              onClick={() => setRefundFilter("All")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-black hover:bg-slate-200"
            >
              Refund: {refundFilter}
              <X size={12} />
            </button>
          )}
          {status !== "All Status" && (
            <button
              onClick={() => setStatus("All Status")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-black hover:bg-slate-200"
            >
              Status: {status}
              <X size={12} />
            </button>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Order ID</th>
                <th className={TH}>Customer</th>
                <th className={TH}>Date</th>
                <th className={`${TH} text-center`}>Items</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="align-top transition-colors hover:bg-slate-50"
                >
                  <td className="px-3 py-4 break-words font-semibold text-blue-600" title={o.id}>
                    {shortId(o.id)}
                  </td>
                  <td className="px-3 py-4 break-words">
                    <p className="font-semibold break-words text-black">
                      {o.customer}
                    </p>
                    <p className="mt-0.5 text-xs text-black">{o.phone}</p>
                    {o.area && (
                      <p className="mt-0.5 text-xs break-words text-black">{o.area}</p>
                    )}
                  </td>
                  <td className="px-3 py-4 break-words text-black">{formatDate(o.date)}</td>
                  <td className="px-3 py-4 break-words text-center">
                    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-black">
                      {o.items} items
                    </span>
                  </td>
                  <td className="px-3 py-4 break-words">
                    <StatusCell order={o} />
                  </td>
                  <td className="px-3 py-4 break-words text-right break-words">
                    <AmountCell order={o} onRefundDetails={setRefundDetailsId} />
                  </td>
                  <td className="px-3 py-4 break-words">
                    <OrderActions
                      order={o}
                      onAdvance={advanceOrder}
                      onCancel={cancelOrder}
                      onTrack={viewTracking}
                      onHistory={viewCustomerHistory}
                      onInvoice={viewInvoice}
                    />
                  </td>
                </tr>
              ))}
              {isLoading &&
                [0, 1, 2, 3].map((row) => (
                  <tr key={`skeleton-${row}`}>
                    {[
                      "w-20",
                      "w-32",
                      "w-24",
                      "w-14",
                      "w-20",
                      "w-16",
                      "w-28",
                    ].map((w, cell) => (
                      <td key={cell} className="px-4 py-5">
                        <SkeletonBar className={w} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState onReset={resetFilters} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 lg:hidden">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-600" title={o.id}>
                    {shortId(o.id)}
                  </p>
                  <p className="mt-0.5 text-xs text-black">{formatDate(o.date)}</p>
                </div>
                <div className="text-right">
                  <StatusCell order={o} />
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-black">
                  {o.customer}
                </p>
                <p className="text-xs text-black">{o.phone}</p>
                {o.area && <p className="text-xs break-words text-black">{o.area}</p>}
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-black">
                  {o.items} items
                </span>
                <div className="text-right text-sm">
                  <AmountCell order={o} onRefundDetails={setRefundDetailsId} />
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <OrderActions
                  order={o}
                  align="justify-start"
                  onAdvance={advanceOrder}
                  onCancel={cancelOrder}
                  onTrack={viewTracking}
                  onHistory={viewCustomerHistory}
                  onInvoice={viewInvoice}
                />
              </div>
            </div>
          ))}
          {isLoading &&
            [0, 1, 2].map((card) => (
              <div
                key={`skeleton-card-${card}`}
                className="space-y-3 rounded-xl border border-slate-200 p-4"
              >
                <SkeletonBar className="w-24" />
                <SkeletonBar className="w-40" />
                <SkeletonBar className="w-20" />
              </div>
            ))}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-xl border border-slate-200">
              <EmptyState onReset={resetFilters} />
            </div>
          )}
        </div>
      </Card>

      {historyCustomer && (
        <CustomerOrderHistoryModal
          customer={historyCustomer}
          orders={customerHistoryOrders}
          returns={customerHistoryReturns}
          onClose={() => setHistoryCustomer(null)}
        />
      )}

      {refundDetailsId && (
        <RefundDetailsModal
          refundId={refundDetailsId}
          onClose={() => setRefundDetailsId(null)}
        />
      )}

      {invoiceOrderId && (
        <InvoiceModal
          invoice={invoice}
          isLoading={isInvoiceLoading}
          error={invoiceError}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}

      {trackingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-black">
                Order Tracking
              </h3>
              <button
                onClick={() => setTrackingOrderId(null)}
                className="rounded-lg p-1.5 text-black hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            {isTracking || !trackedOrder ? (
              <p className="text-sm text-black">Loading tracking info...</p>
            ) : (
              <OrderTrackingTimeline
                history={trackedOrder.tracking.history}
                replacementOrder={trackedOrder.tracking.replacementOrder}
                replacementForOrderNumber={
                  trackedOrder.tracking.replacementForOrderNumber
                }
              />
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default OrderManagement;
