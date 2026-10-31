import { Calendar, MapPin, Package, Search, Truck } from "lucide-react"; // icons for meta row, search, header
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OrderTrackingTimeline from "../../components/shared/OrderTrackingTimeline"; // step-by-step tracking timeline
import useAuth from "../../hooks/useAuth";
import { formatDate } from "../../utils/formatDate";
import {
  useGetMyOrdersQuery,
  useLazyGetMyOrderQuery,
} from "../../features/customer/orderApi";
import StatusBadge from "./CustomerDashboard/StatusBadge"; // colored status pill

// total item count across an order's line items
const itemCount = (order) => order.items.reduce((sum, i) => sum + i.qty, 0);

// Rule: a customer can only ever see the tracking timeline for orders that belong to them.
const TrackOrder = ({ asModal = false, onClose }) => {
  const { isAuthenticated, user } = useAuth(); // auth state + current user
  const [search, setSearch] = useState(""); // search box text
  const [toggledOrderId, setToggledOrderId] = useState(undefined); // undefined until a card is clicked
  const [searchParams, setSearchParams] = useSearchParams(); // ?order=… deep link
  // set by the order confirmation popup's Track Order button: show only that order
  const focusOrderNumber = searchParams.get("order");

  const isCustomer = isAuthenticated && user?.role === "customer"; // gate: only customers can track

  // fetch this customer's orders, skipped if not a customer
  const { data: orders = [], isLoading } = useGetMyOrdersQuery(undefined, {
    skip: !isCustomer,
  });
  // lazy fetch of a single order's tracking detail
  const [fetchOrder, { data: trackedOrder, isFetching: isTracking }] =
    useLazyGetMyOrderQuery();

  // orders filtered by search text (id or item name), narrowed to the single order first when the page was opened for one specific order
  const filtered = useMemo(() => {
    // Only the requested order when one was given, otherwise all orders
    const base = focusOrderNumber
      ? orders.filter((order) => order.id === focusOrderNumber)
      : orders;
    // Filter by the search text
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (order) =>
        order.id.toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [orders, search, focusOrderNumber]);

  // the order this page was opened for, once its data has arrived
  const focusOrder = useMemo(
    () =>
      focusOrderNumber
        ? orders.find((order) => order.id === focusOrderNumber)
        : undefined,
    [orders, focusOrderNumber],
  );

  // that order starts expanded, so the customer lands straight on its timeline; whatever they click afterwards takes over
  const expandedOrderId =
    toggledOrderId !== undefined ? toggledOrderId : (focusOrder?.orderId ?? null);

  // load the deep-linked order's tracking detail as soon as it is known
  useEffect(() => {
    if (focusOrder) fetchOrder(focusOrder.orderId);
  }, [focusOrder, fetchOrder]);

  // toggle expanded tracking panel, fetch detail on open
  const handleTrack = (order) => {
    if (expandedOrderId === order.orderId) {
      setToggledOrderId(null);
      return;
    }
    setToggledOrderId(order.orderId);
    fetchOrder(order.orderId);
  };

  // not logged in: show sign-in prompt
  if (!isAuthenticated) {
    return (
      <div
        className={`mx-auto max-w-sm text-center ${asModal ? "py-4" : "px-4 py-14"}`}
      >
        {/* truck badge */}
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-green-700 text-white shadow-md shadow-green-200">
          <Truck size={22} />
        </span>
        {/* page heading */}
        <h1 className="text-lg font-extrabold text-gray-800">
          Track Your Order
        </h1>
        {/* helper text */}
        <p className="mt-1 text-sm text-gray-400">
          Please sign in to see the tracking status of your own orders.
        </p>
        {/* sign in link, closes the popup when shown as one */}
        <Link
          to="/login"
          onClick={onClose}
          className="mt-4 inline-block rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // logged in but not a customer role: block access
  if (!isCustomer) {
    return (
      <div
        className={`mx-auto max-w-sm text-center ${asModal ? "py-4" : "px-4 py-14"}`}
      >
        {/* truck badge */}
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-green-700 text-white shadow-md shadow-green-200">
          <Truck size={22} />
        </span>
        {/* page heading */}
        <h1 className="text-lg font-extrabold text-gray-800">
          Track Your Order
        </h1>
        {/* helper text */}
        <p className="mt-1 text-sm text-gray-400">
          Order tracking is available for customer accounts only.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        asModal ? "w-full" : "mx-auto max-w-2xl px-3 py-3 sm:px-4"
      }
    >
      {/* page heading + search, side by side on wider screens */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* green truck badge */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-700 text-white shadow-sm shadow-green-200">
            <Truck size={14} />
          </span>
          <div className="min-w-0">
            <h1 className="text-base leading-tight font-extrabold text-gray-800">
              Track Your Order
            </h1>
            {/* helper text */}
            <p className="text-[10px] leading-tight font-medium text-gray-400">
              Only your own account&apos;s orders are shown here
            </p>
          </div>
        </div>

        {focusOrderNumber ? (
          // single-order view, with a way back to the full list
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2 py-1">
            <span className="text-[11px] font-bold text-gray-900">
              Order {focusOrderNumber}
            </span>
            <button
              type="button"
              onClick={() => {
                setToggledOrderId(undefined); // back to the untouched list
                setSearchParams({}, { replace: true });
              }}
              className="text-[11px] font-bold text-green-700 underline underline-offset-2 transition-colors hover:text-green-800"
            >
              View all
            </button>
          </div>
        ) : (
          // search box
          <div className="relative w-full sm:w-56">
            {/* search icon inside input */}
            <Search
              size={13}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or product..."
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-2.5 pl-7.5 text-[12px] outline-none transition-all focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        // loading state
        <p className="py-6 text-center text-[12px] text-gray-400">
          Loading your orders...
        </p>
      ) : filtered.length === 0 ? (
        // empty state
        <div className="rounded-lg border border-dashed border-gray-200 bg-white py-5 text-center">
          <Package size={18} className="mx-auto mb-1 text-gray-300" />
          <p className="text-[12px] text-gray-400">
            {focusOrderNumber
              ? "That order was not found in your account."
              : "No orders found."}
          </p>
        </div>
      ) : (
        // orders as one organised list, rows split by dividers
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {filtered.map((order) => (
            // single order row
            <div key={order.orderId} className="px-3 py-2">
              {/* order id + status + total + track button, all on one row */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0 flex-1">
                  {/* order id + status pill row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-gray-800">
                      {order.id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  {/* date + item count meta row */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] leading-tight font-medium text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(order.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={10} /> {itemCount(order)} items
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {/* total amount */}
                  <p className="text-[13px] leading-tight font-extrabold text-orange-600 tabular-nums">
                    ৳{order.total}
                  </p>
                  {/* track/hide toggle button */}
                  <button
                    onClick={() => handleTrack(order)}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-green-800"
                  >
                    <Truck size={11} />
                    {expandedOrderId === order.orderId ? "Hide" : "Track"}
                  </button>
                </div>
              </div>

              {/* expanded tracking panel */}
              {expandedOrderId === order.orderId && (
                <div className="mt-2 rounded-md border border-green-100 bg-green-50/50 p-2">
                  {isTracking || !trackedOrder ? (
                    // tracking loading state
                    <span className="text-[11px] text-gray-900">
                      Loading tracking info...
                    </span>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-0.5 text-[11px] leading-snug text-gray-900">
                        {/* current status line */}
                        <p className="font-bold">
                          Current Status: {trackedOrder.tracking.currentStatus}
                        </p>
                        {trackedOrder.tracking.rider ? (
                          // assigned rider info
                          <p className="flex items-center gap-1">
                            <MapPin size={10} className="shrink-0" />
                            Rider: {trackedOrder.tracking.rider.name} (
                            {trackedOrder.tracking.rider.phone}) —{" "}
                            {trackedOrder.tracking.rider.area}
                          </p>
                        ) : (
                          // no rider yet
                          <p>No delivery rider assigned yet.</p>
                        )}
                      </div>
                      {/* step-by-step tracking history */}
                      <OrderTrackingTimeline
                        history={trackedOrder.tracking.history}
                        refund={trackedOrder.tracking.refund}
                        replacementOrder={
                          trackedOrder.tracking.replacementOrder
                        }
                        replacementForOrderNumber={
                          trackedOrder.isReplacement
                            ? trackedOrder.replacementForOrderNumber
                            : null
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackOrder;
