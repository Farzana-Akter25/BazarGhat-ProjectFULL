import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Package,
  Star,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";
import { useGetDeliveryDashboardQuery } from "../../../features/delivery/deliveryApi";
import { toDeliveryStatus } from "../../../utils/orderStatus";
import { shortId } from "../../../utils/shortId";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell
import StatusBadge from "./StatusBadge";

// today's orders table columns
const TODAY_COLUMNS = [
  { label: "Order ID" },
  { label: "Customer" },
  { label: "Area" },
  { label: "Status" },
  { label: "Amount", align: "right" },
];

// today summary card definitions
const SUMMARY_CARDS = [
  { key: "assigned", label: "Assigned", icon: Package, tint: "bg-blue-50 text-blue-600" },
  { key: "onTheWay", label: "Out for Delivery", icon: Truck, tint: "bg-purple-50 text-purple-600" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, tint: "bg-green-50 text-green-700" },
  { key: "failed", label: "Rejected", icon: XCircle, tint: "bg-red-50 text-red-600" },
];

// Delivery man home tab: today's orders, summary, earnings and performance
const DashboardTab = ({ onViewAllOrders }) => {
  // Load the dashboard data
  const { data, isLoading, isError } = useGetDeliveryDashboardQuery();

  if (isLoading) {
    // loading state
    return <p className="text-sm text-slate-600">Loading dashboard...</p>;
  }

  if (isError || !data) {
    // error state
    return (
      <p className="text-sm text-red-500">
        Failed to load dashboard. Please try again.
      </p>
    );
  }

  // Sections from the response
  const { rider, todayOrders, todaySummary, earnings, performance } = data;
  const firstName = rider.name.split(" ")[0]; // greeting name
  // Share of the weekly target reached
  const earningsProgress = Math.round(
    (earnings.successfulDeliveries / earnings.weeklyTarget) * 100,
  ); // % of weekly target hit

  // Metric rows for the performance progress bars. Nothing in the app records a promised delivery
  // time yet, so on-time delivery only appears once it carries a real percentage instead of
  // sitting at a permanent 0% the rider cannot move.
  const performanceMetrics = [
    ...(performance.onTimeDelivery > 0
      ? [{ label: "On-time delivery", value: performance.onTimeDelivery }]
      : []),
    { label: "Delivery success rate", value: performance.successRate },
  ];

  return (
    // page wrapper
    <div className="space-y-5">
      {/* greeting header */}
      <div>
        {/* greeting title with rider name */}
        <h1 className="text-lg font-bold text-slate-800">
          Good Morning, {firstName}! 👋
        </h1>
        {/* greeting subtitle */}
        <p className="text-sm text-slate-600">
          Here is your delivery summary for today.
        </p>
      </div>

      {/* summary stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_CARDS.map((c) => (
          // single stat card
          <div
            key={c.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              {/* card label */}
              <p className="text-xs font-medium text-slate-600">{c.label}</p>
              {/* tinted icon badge */}
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${c.tint}`}>
                <c.icon size={15} strokeWidth={2.25} />
              </div>
            </div>
            {/* stat count */}
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {todaySummary[c.key]}
            </p>
          </div>
        ))}
      </div>

      {/* report issue banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {/* warning icon badge */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <AlertCircle size={17} />
          </div>
          <div>
            {/* banner title */}
            <p className="text-sm font-bold text-slate-800">
              Report Product Issue
            </p>
            {/* banner description */}
            <p className="text-xs text-slate-700">
              Found a problem during delivery? Report it immediately so admin
              can review.
            </p>
          </div>
        </div>
        {/* report issue button */}
        <button
          onClick={onViewAllOrders}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Camera size={15} /> Report Issue Now
        </button>
      </div>

      {/* orders + earnings/performance columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* today's orders list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            {/* list title */}
            <h3 className="text-sm font-bold text-slate-800">
              Today&apos;s Orders
            </h3>
            {/* view all link */}
            <button
              onClick={onViewAllOrders}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              View all →
            </button>
          </div>
          {/* today's orders table */}
          <DataTable
            columns={TODAY_COLUMNS}
            isEmpty={todayOrders.length === 0}
            emptyText="No orders yet."
          >
            {todayOrders.map((order) => (
              // order row
              <tr key={order.assignmentId} className="hover:bg-slate-50">
                {/* order id cell */}
                <td
                  className={`${TD} font-semibold text-blue-600`}
                  title={order.id}
                >
                  {shortId(order.id)}
                </td>
                {/* customer name cell */}
                <td className={`${TD} font-semibold text-slate-800`}>
                  {order.customer}
                </td>
                {/* delivery area cell */}
                <td className={`${TD} text-slate-600`}>{order.area}</td>
                {/* status badge cell */}
                <td className={TD}>
                  <StatusBadge status={toDeliveryStatus(order.status)} />
                </td>
                {/* amount cell */}
                <td
                  className={`${TD} text-right font-bold text-slate-800`}
                >
                  {order.amount} BDT
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div className="space-y-4">
          {/* weekly earnings card */}
          <div className="rounded-2xl bg-green-700 p-5 text-white shadow-sm">
            {/* card label */}
            <p className="text-xs font-semibold tracking-wide text-green-200 uppercase">
              This Week&apos;s Earnings
            </p>
            {/* earnings total */}
            <p className="mt-1 text-2xl font-bold">
              {earnings.weekTotal} <span className="text-sm font-medium">BDT</span>
            </p>
            {/* deliveries count note */}
            <p className="text-xs text-green-200">
              From {earnings.successfulDeliveries} successful deliveries
            </p>
            {/* progress bar track */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
              {/* progress bar fill, capped at 100% */}
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: `${Math.min(earningsProgress, 100)}%` }}
              />
            </div>
            {/* weekly target note */}
            <p className="mt-2 text-[11px] text-green-100">
              Weekly target: {earnings.weeklyTarget} deliveries
            </p>
          </div>

          {/* performance rating card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              {/* card title */}
              <h3 className="text-sm font-bold text-slate-800">Performance</h3>
              <TrendingUp size={16} className="text-green-700" />
            </div>
            {/* star rating display */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                // single star, filled if within rounded rating
                <Star
                  key={i}
                  size={14}
                  className={
                    i < Math.round(performance.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }
                />
              ))}
              {/* numeric rating */}
              <span className="ml-1 text-sm font-bold text-slate-800">
                {performance.rating}
              </span>
            </div>
            {/* rating basis note — customers cannot rate a delivery yet, so an unrated rider says
                so instead of showing a 0 that reads as a bad score. */}
            <p className="mb-3 text-[11px] text-slate-600">
              {performance.rating > 0 ? "Based on customer ratings" : "Not rated yet"} ·{" "}
              {performance.totalDeliveries} total deliveries
            </p>
            {/* metric progress bars */}
            <div className="space-y-2.5">
              {performanceMetrics.map((m) => (
                // single metric row
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-700">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  {/* progress bar track */}
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    {/* progress bar fill */}
                    <div
                      className="h-1.5 rounded-full bg-green-700"
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
