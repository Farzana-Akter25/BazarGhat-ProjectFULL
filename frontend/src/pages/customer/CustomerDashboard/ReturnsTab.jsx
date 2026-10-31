import { AlertCircle, Camera, CheckCircle2, Clock, Info, RotateCcw, Search, Send, Trash2, Wallet, XCircle, ZoomIn } from "lucide-react"; // status/action icons
import { Fragment, useEffect, useState } from "react";
import {
  useCreateReturnMutation,
  useGetMyReturnsQuery,
  useGetReturnRefundOptionsQuery,
  useGetReturnReasonOptionsQuery,
} from "../../../features/customer/returnApi";
import RefundRequestConfirmModal from "../../../components/customer/RefundRequestConfirmModal"; // refund policy + refund method dialog
import {
  REFUND_METHOD_COPY,
  refundMethodNote,
} from "../../../utils/refundMethods"; // shared refund wording
import { isRefundEligible } from "../../../utils/orderStatus";
import { formatDate } from "../../../utils/formatDate";
import { shortId } from "../../../utils/shortId";
import DataTable, { TD } from "../../../components/shared/DataTable"; // shared table shell
import {
  ELIGIBLE_REASONS,
  NOT_ELIGIBLE_REASONS,
  REFUND_ELIGIBLE_CASES,
  REFUND_NOT_ELIGIBLE_CASES,
} from "../../../utils/returnPolicy"; // same rules as the policy tab
import PhotoViewer, { PhotoStrip } from "../../../components/shared/PhotoViewer"; // shared full-screen photo viewer
import StatusBadge from "./StatusBadge"; // colored status pill

// Fallback reason list, used only if the reasons endpoint is unreachable.
const FALLBACK_REASONS = [
  "Damaged Packaging",
  "Wrong Item Delivered",
  "Item Expired",
  "Missing Item",
  "Quality Not As Expected",
  "Other",
];

// Plain-English wording for how far the refund itself has actually got.
const REFUND_STAGE_TEXT = {
  "Pending Approval": "Pending admin review — nothing has been refunded yet.",
  Processing: "Being processed.",
  Refunded: "Completed.",
  Completed: "Completed.",
  Failed: "Could not be completed. Please contact support.",
  Rejected: "Not approved.",
};

// What the request is asking for, named the way the admin screen names it.
const requestKind = (req) => {
  if (req.type === "Refund") return "refund";
  // What the customer wants: replacement means return, otherwise refund
  const wants = req.resolution || req.requestedResolution;
  return wants === "Replacement" ? "return" : "refund";
};

// per-status icon, box color, and helper text shown on each request card; `text` takes the request kind ("return" / "refund")
const STATUS_NOTE = {
  Pending: {
    icon: Clock,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: (kind) =>
      `Our team is reviewing your ${kind} request. You'll receive an update within 24-48 hours.`,
  },
  "In Review": {
    icon: Clock,
    box: "border-amber-100 bg-amber-50/60 text-amber-700",
    text: (kind) => `Your ${kind} request is currently being reviewed.`,
  },
  Approved: {
    icon: CheckCircle2,
    box: "border-green-100 bg-green-50/60 text-green-700",
    text: (kind) => `Your ${kind} request has been approved.`,
  },
  Rejected: {
    icon: XCircle,
    box: "border-red-100 bg-red-50/60 text-red-700",
    text: (kind) => `Your ${kind} request was rejected.`,
  },
  Completed: {
    icon: CheckCircle2,
    box: "border-green-100 bg-green-50/60 text-green-700",
    // Deliberately not "your refund is complete".
    text: () => "Your request has been completed.",
  },
};

// return request table columns
const RETURN_COLUMNS = [
  { label: "Request ID" },
  { label: "Order" },
  { label: "Product" },
  { label: "Reason" },
  { label: "Date" },
  { label: "Status" },
  { label: "Amount", align: "right" },
  { label: "Details" },
];

// The two rulebooks the form judges a request by, in the order the customer meets them.
const RULE_SETS = [
  {
    type: "Return",
    icon: RotateCcw,
    blurb: "Delivered orders · one request per order",
    accepted: ELIGIBLE_REASONS,
    rejected: NOT_ELIGIBLE_REASONS,
    note: "Fresh vegetables, meat and fish: request within 2 hours of delivery. All other products: within 7 days.",
  },
  {
    type: "Refund",
    icon: Wallet,
    blurb: "Orders you cancelled that were paid online",
    accepted: REFUND_ELIGIBLE_CASES,
    rejected: REFUND_NOT_ELIGIBLE_CASES,
    note: null,
  },
];

const MAX_PHOTOS = 3; // cap on uploaded evidence photos

// Returns tab: request a return/refund and see past requests
const ReturnsTab = ({ orders = [], presetOrderId, onConsumePreset }) => {
  // An order is asked about once, whichever kind of request it is, so an order that already carries a request is not offered again.
  const unaskedOrders = orders.filter((o) => !o.returnRequest);
  const deliveredOrders = unaskedOrders.filter((o) => o.status === "Delivered"); // eligible for return
  const refundEligibleOrders = unaskedOrders.filter(isRefundEligible); // eligible for refund
  // One picker for both kinds.
  const eligibleOrders = [...deliveredOrders, ...refundEligibleOrders];

  const [selectedOrderId, setSelectedOrderId] = useState(""); // chosen order in form
  const [orderSearch, setOrderSearch] = useState(""); // order id search text
  // Collapsed to start: the accepted/not-accepted lists are reference material a customer reads once, and open by default they pushed every field of the form below the fold.
  const [showEligibility, setShowEligibility] = useState(false); // accepted/not accepted panel
  const [selectedItemId, setSelectedItemId] = useState(""); // chosen line item (return only)
  const [resolution, setResolution] = useState("Refund"); // what the customer wants: Replacement or Refund
  const [reason, setReason] = useState(""); // chosen reason in form
  const [description, setDescription] = useState(""); // free-text issue description
  const [photos, setPhotos] = useState([]); // attached evidence files
  const [preferredRefundMethod, setPreferredRefundMethod] = useState(null); // where the customer would like the money, if a refund is granted
  const [photoPreviews, setPhotoPreviews] = useState([]); // local preview urls
  const [banner, setBanner] = useState(null); // success/error banner after submit
  const [photoError, setPhotoError] = useState(null); // missing-photo error, shown at the upload box itself
  const [previewIndex, setPreviewIndex] = useState(null); // attached photo open full screen, null = closed
  const [openRequestId, setOpenRequestId] = useState(null); // request row whose details are expanded

  // The chosen order
  const selectedOrder = eligibleOrders.find(
    (o) => String(o.orderId) === String(selectedOrderId)
  ); // full order object for the item picker

  // Which kind of request this is follows the order the customer picked.
  const requestType =
    selectedOrder && refundEligibleOrders.includes(selectedOrder)
      ? "Refund"
      : "Return";

  // reason options for this kind of request, kept in sync with the admin-managed list
  const { data: reasonOptions } = useGetReturnReasonOptionsQuery(requestType);
  // Reason options from the server, or built-in ones as a fallback
  const reasons = reasonOptions?.length ? reasonOptions : FALLBACK_REASONS;

  // build/cleanup preview urls whenever photos change
  useEffect(() => {
    // Preview URLs for the chosen photos
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  // append newly selected photo files, capped at max
  const handlePhotoSelect = (e) => {
    // Add the chosen files, up to the maximum
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
    setPhotoError(null); // the requirement is met the moment a photo is attached
    e.target.value = "";
  };

  // remove one attached photo by index
  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex(null); // the viewer's index no longer lines up with the list
  };

  const { data: returns = [], isLoading: returnsLoading } = useGetMyReturnsQuery();
  const [createReturn, { isLoading: isSubmitting }] = useCreateReturnMutation();

  // Which refund destinations this order could support.
  const { data: refundOptions } = useGetReturnRefundOptionsQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });
  // Refund methods available for the chosen order
  const refundMethods = refundOptions?.methods ?? [];
  // Derived rather than stored, so switching order can never leave a route selected that the new order does not offer.
  const chosenRefundMethod = refundMethods.includes(preferredRefundMethod)
    ? preferredRefundMethod
    : null;

  // pre-fill the form when navigated here with an order already picked
  useEffect(() => {
    if (presetOrderId) {
      setSelectedOrderId(String(presetOrderId));
      onConsumePreset?.();
    }
  }, [presetOrderId, onConsumePreset]);

  // order id search, tolerant of case, spaces and dashes so "rcrgmz" or "20260904 rcrgmz" both find ORD-20260904-RCRGMZ
  const normaliseId = (value) => String(value ?? "").toLowerCase().replace(/[\s-]/g, "");
  // Filter orders by the typed order number
  const orderQuery = normaliseId(orderSearch);
  const filteredOrders = orderQuery
    ? eligibleOrders.filter((o) => normaliseId(o.id).includes(orderQuery))
    : eligibleOrders;

  // Keep the already-picked order in the list even when the search text no longer matches it.
  const visibleOrders =
    selectedOrder && !filteredOrders.includes(selectedOrder)
      ? [selectedOrder, ...filteredOrders]
      : filteredOrders; // dropdown options



  // clear the request form fields
  const resetForm = () => {
    setSelectedOrderId("");
    setOrderSearch("");
    setSelectedItemId("");
    setResolution("Refund");
    setReason("");
    setDescription("");
    setPhotos([]);
    setPhotoError(null);
    setPreviewIndex(null);
    setPreferredRefundMethod(null);
  };

  const [showRefundPolicy, setShowRefundPolicy] = useState(false); // refund policy + refund method dialog

  // A request that asks for money back goes through the Refund & Cancellation Policy first.
  const asksForRefund = requestType === "Refund" || resolution === "Refund";

  // The most this request could refund, for the dialog.
  const selectedItem = selectedOrder?.items.find(
    (item) => String(item.id) === String(selectedItemId),
  );
  // Estimated refund, capped at what the server says is refundable
  const refundableCap = refundOptions?.refundableAmount;
  const refundEstimate =
    refundableCap == null
      ? null
      : requestType === "Return" && selectedItem
        ? Math.min(selectedItem.lineTotal, refundableCap)
        : refundableCap;

  // submit new return/refund request
  const handleSubmit = (e) => {
    e.preventDefault();
    setBanner(null);
    setPhotoError(null);
    if (requestType === "Return" && photos.length === 0) {
      // Returns require at least one photo of the issue.
      setPhotoError("Please upload at least one photo of the issue.");
      document
        .getElementById("return-photo-upload")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (asksForRefund) {
      setShowRefundPolicy(true); // the dialog calls submitRequest once agreed
      return;
    }
    submitRequest();
  };

  // send the request — straight from the form, or from the refund policy dialog
  const submitRequest = async () => {
    try {
      // Build the form data for the request
      const formData = new FormData();
      formData.append("order_id", Number(selectedOrderId));
      if (requestType === "Return") {
        formData.append("order_item_id", Number(selectedItemId));
      }
      formData.append("reason", reason);
      formData.append("note", description);
      formData.append("type", requestType);
      // What the customer wants out of it.
      formData.append("resolution", requestType === "Return" ? resolution : "Refund");
      if (chosenRefundMethod) {
        // A preference only — nothing is refunded until an admin approves it.
        formData.append("preferred_refund_method", chosenRefundMethod);
      }
      photos.forEach((file) => formData.append("photos[]", file));

      await createReturn(formData).unwrap();
      setShowRefundPolicy(false);
      setBanner({
        type: "success",
        message:
          requestType === "Refund"
            ? "Refund request submitted. It is now pending admin review — nothing is refunded until it is approved."
            : resolution === "Replacement"
              ? "Return request submitted. It is now pending admin review — a replacement is sent only once it is approved."
              : "Return request submitted. It is now pending admin review — any refund is issued only once it is approved.",
      });
      resetForm();
    } catch (err) {
      setShowRefundPolicy(false); // close the dialog so the error banner is visible
      setBanner({
        type: "error",
        message:
          err?.data?.message ||
          `Failed to submit ${requestType.toLowerCase()} request. Please try again.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* return/refund request form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* form title — one form for both kinds of request; the order picked below decides which of the two this one is */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-800">
            Submit Return / Refund Request
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Pick an order and the form follows it: a delivered order is returned,
            a cancelled online-paid order is refunded.
          </p>
        </div>

        {/* Both rulebooks, side by side: one form takes both kinds of request, so a customer should not have to pick an order to find out what the other one is judged on. */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5">
          {/* panel heading with show/hide toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-slate-700">
              <Info size={16} className="shrink-0 text-orange-500" />
              <p className="truncate text-xs font-bold">
                When is a request accepted or rejected?
                <span className="ml-1.5 font-medium text-slate-600">
                  Returns and refunds
                </span>
              </p>
            </div>
            {/* collapse/expand button */}
            <button
              type="button"
              onClick={() => setShowEligibility((v) => !v)}
              className="shrink-0 text-[11px] font-bold text-orange-600 hover:text-orange-700"
            >
              {showEligibility ? "Hide" : "Show"}
            </button>
          </div>

          {showEligibility && (
            // one card per kind; the one the chosen order falls under is lifted
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {RULE_SETS.map((set) => {
                const isCurrent = selectedOrderId && requestType === set.type;

                return (
                  // one rulebook card
                  <div
                    key={set.type}
                    className={`rounded-xl border bg-white p-3.5 transition-colors ${
                      isCurrent
                        ? "border-orange-300 ring-2 ring-orange-100"
                        : "border-slate-200"
                    }`}
                  >
                    {/* card header: which kind, and whether it is this request */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <set.icon size={14} strokeWidth={2.25} />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            {set.type}
                          </h4>
                          <p className="text-[11px] text-slate-600">{set.blurb}</p>
                        </div>
                      </div>
                      {isCurrent && (
                        // the order picked below falls under these rules
                        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-orange-700 uppercase">
                          Your request
                        </span>
                      )}
                    </div>

                    {/* accepted list */}
                    <p className="mt-3 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-green-700 uppercase">
                      <CheckCircle2 size={12} strokeWidth={2.5} /> Accepted
                    </p>
                    <ul className="space-y-1">
                      {set.accepted.map((c) => (
                        // one accepted case row
                        <li
                          key={c}
                          className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-500" />
                          {c}
                        </li>
                      ))}
                    </ul>

                    {/* rejected list */}
                    <p className="mt-3 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-red-600 uppercase">
                      <XCircle size={12} strokeWidth={2.5} /> Not accepted
                    </p>
                    <ul className="space-y-1">
                      {set.rejected.map((c) => (
                        // one rejected case row
                        <li
                          key={c}
                          className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                          {c}
                        </li>
                      ))}
                    </ul>

                    {set.note && (
                      // the deadline, which only the return side has
                      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700">
                        <Clock size={12} className="mt-0.5 shrink-0" />
                        {set.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {banner && (
          // success/error banner
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              banner.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            {banner.message}
          </div>
        )}

        {/* Two columns from lg up. */}
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
          {/* left column: which order, which item, and what the customer wants */}
          <div className="space-y-4">
            <div>
              {/* order select label */}
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Select Order *
              </label>
              {/* order id search box */}
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  placeholder="Search by order ID..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              {/* order dropdown, filtered by eligibility and the search text */}
              <select
                required
                value={selectedOrderId}
                onChange={(e) => {
                  setSelectedOrderId(e.target.value);
                  setSelectedItemId("");
                }}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Choose an order...</option>
                {visibleOrders.map((o) => (
                  // the kind of request is named on the option, so the customer knows what the form below will ask for before picking
                  <option key={o.orderId} value={o.orderId}>
                    {o.id} - {formatDate(o.date)} - {o.total}TK ·{" "}
                    {refundEligibleOrders.includes(o) ? "Refund" : "Return"}
                  </option>
                ))}
              </select>
              {eligibleOrders.length === 0 ? (
                // no eligible orders helper text
                <p className="mt-1.5 text-xs text-slate-600">
                  Delivered orders can be returned, and orders paid online that
                  you cancelled can be refunded.{" "}
                  {/* the rule that most often empties this list once a customer has already been through the form for their orders */}
                  Each order can be requested once, so orders you have already
                  submitted a return or refund for are not listed here.
                </p>
              ) : (
                // search result count / no match helper text
                <p className="mt-1.5 text-xs text-slate-600">
                  {orderQuery && filteredOrders.length === 0
                    ? "No eligible order matches that order ID."
                    : orderQuery
                      ? filteredOrders.length + " of " + eligibleOrders.length + " orders match"
                      : eligibleOrders.length + " eligible order(s)"}
                </p>
              )}
            </div>

            {selectedOrder && requestType === "Return" && (
              <div>
                {/* item select label */}
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Select Item *
                </label>
                {/* line item dropdown for chosen order */}
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Choose an item...</option>
                  {selectedOrder.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Qty {item.qty}) - {item.lineTotal}TK
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              {/* reason select label */}
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {requestType === "Refund" ? "Refund" : "Return"} Reason *
              </label>
              {/* reason dropdown */}
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select reason...</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* What the customer wants out of the return. */}
            {requestType === "Return" && (
              <div>
                {/* resolution label */}
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  What would you like? *
                </label>
                {/* replacement vs refund choice */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: "Replacement",
                      title: "Replacement",
                      hint: "Send me the same item again.",
                    },
                    {
                      value: "Refund",
                      title: "Refund",
                      hint: "Give me my money back.",
                    },
                  ].map((option) => (
                    // one resolution option
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                        resolution === option.value
                          ? "border-orange-400 bg-orange-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="return-resolution"
                        value={option.value}
                        checked={resolution === option.value}
                        onChange={() => setResolution(option.value)}
                        className="mt-0.5 accent-orange-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          {option.title}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* where the refund goes is chosen in the Refund & Cancellation Policy dialog that opens on submit */}
          </div>

          {/* right column: the evidence — what went wrong and the photos of it */}
          <div className="space-y-4">
            <div>
              {/* description label */}
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Description *
              </label>
              {/* free-text issue description */}
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                className="min-h-[100px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div id="return-photo-upload">
              {/* photo upload label */}
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Upload Photos {requestType === "Return" ? "*" : "(Optional)"}
              </label>

              {photoError && (
                // Missing-photo error, deliberately here beside the upload box rather than in the page banner at the top of the form.
                <p className="mb-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  {photoError}
                </p>
              )}

              {/* Attached photos, as thumbnails: three tiles at the old 208px cost more height than the rest of the form put together. */}
              {photoPreviews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2.5">
                  {photoPreviews.map((url, index) => (
                    // one attached photo preview tile
                    <div
                      key={url}
                      className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-28 sm:w-28"
                    >
                      {/* open this preview in the full-screen viewer */}
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(index)}
                        title="Click to enlarge"
                        className="block h-full w-full"
                      >
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {/* zoom affordance on hover */}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
                          <ZoomIn size={20} />
                        </span>
                      </button>
                      {/* remove photo button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        title="Remove photo"
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < MAX_PHOTOS && (
                // small add-photo control, wraps hidden file input
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {/* compact upload button */}
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3.5 py-2 text-xs font-semibold transition-colors ${
                      photoError
                        ? "border-red-300 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
                    <Camera size={15} strokeWidth={2.25} />
                    {photos.length ? "Add another photo" : "Upload product photos"}
                  </label>
                  {/* helper text, kept beside the button rather than inside it */}
                  <p className="text-xs text-slate-600">
                    {requestType === "Return"
                      ? "Required — show the issue clearly."
                      : "Optional — add photos if you'd like."}{" "}
                    {photos.length}/{MAX_PHOTOS} added.
                  </p>
                </div>
              )}

              {previewIndex !== null && (
                // full-screen look at the photos about to be submitted
                <PhotoViewer
                  photos={photoPreviews}
                  startIndex={previewIndex}
                  onClose={() => setPreviewIndex(null)}
                />
              )}
            </div>

            {/* photo guideline note — three short rules, set on one line each and wrapping rather than forced into their own stacked block */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold">Photo Guideline</p>
              <p className="mt-1 leading-relaxed">
                ✓ Clear, well-lit photos · ✓ Show the defect or damage clearly · ✓
                Include the product label/packaging if applicable
              </p>
            </div>
          </div>

          {/* submit / cancel buttons, across the full width under both columns */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row lg:col-span-2">
            {/* submit request button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />{" "}
              {isSubmitting
                ? "Submitting..."
                : selectedOrderId
                  ? `Submit ${requestType} Request`
                  : "Submit Request"}
            </button>
            {/* clear form button */}
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {showRefundPolicy && (
        // Refund & Cancellation Policy, then refund method — the request is only sent once the customer has agreed and confirmed
        <RefundRequestConfirmModal
          requestType={requestType}
          methods={refundMethods}
          value={chosenRefundMethod}
          onChange={setPreferredRefundMethod}
          // the server's full label, e.g. "SSLCommerz (bKash)"
          gateway={refundOptions?.paymentMethod}
          deliveryCharge={refundOptions?.deliveryCharge ?? 0}
          estimatedAmount={refundEstimate}
          walletPaid={selectedOrder?.walletAmount ?? 0}
          isSubmitting={isSubmitting}
          onConfirm={submitRequest}
          onClose={() => setShowRefundPolicy(false)}
        />
      )}

      {/* return requests list */}
      <div>
        {/* section title */}
        <h3 className="mb-3 text-base font-bold text-slate-800">
          My Return Requests
        </h3>
        {returnsLoading ? (
          // loading state
          <p className="py-6 text-center text-sm text-slate-600">
            Loading return requests...
          </p>
        ) : returns.length === 0 ? (
          // empty state
          <p className="py-6 text-center text-sm text-slate-600">
            You haven&apos;t submitted any return requests yet.
          </p>
        ) : (
          // return requests table: one row each, notes expand underneath
          <DataTable columns={RETURN_COLUMNS}>
            {returns.map((req) => {
              const note = STATUS_NOTE[req.status] || STATUS_NOTE.Pending; // status box content
              const NoteIcon = note.icon; // icon for status box
              const detailsOpen = openRequestId === req.requestId; // is this row expanded
              return (
                // request summary row + its detail row
                <Fragment key={req.requestId}>
                  <tr className="align-top hover:bg-slate-50">
                    {/* request id cell */}
                    <td className={`${TD} font-bold text-slate-800`} title={req.id}>
                      {shortId(req.id)}
                    </td>
                    {/* related order cell */}
                    <td className={`${TD} font-semibold text-blue-600`} title={req.orderId}>
                      {shortId(req.orderId)}
                    </td>
                    {/* product cell */}
                    <td className={`${TD} font-semibold text-slate-700`}>{req.product}</td>
                    {/* reason cell */}
                    <td className={`${TD} text-slate-700`}>{req.reason}</td>
                    {/* submitted date cell */}
                    <td className={`${TD} text-slate-700`}>
                      {formatDate(req.date)}
                    </td>
                    {/* status badge cell */}
                    <td className={TD}>
                      <StatusBadge status={req.status} />
                    </td>
                    {/* return amount cell */}
                    <td className={`${TD} text-right font-bold text-slate-900`}>
                      {req.amount}TK
                    </td>
                    {/* details toggle cell */}
                    <td className={TD}>
                      <button
                        type="button"
                        onClick={() => setOpenRequestId(detailsOpen ? null : req.requestId)}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-200"
                      >
                        <Info size={13} />
                        {detailsOpen ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {detailsOpen && (
                    // detail row: description, admin note, status explanation
                    <tr className="bg-slate-50/60">
                      <td colSpan={RETURN_COLUMNS.length} className="px-4 py-4">
                        {req.note && (
                          // customer's own description
                          <div>
                            <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                              Description
                            </p>
                            <p className="mt-0.5 text-sm text-slate-700">{req.note}</p>
                          </div>
                        )}

                        {req.requestedResolution && (
                          // what they asked for, so the decision they get back can be read against it
                          <div className="mt-3">
                            <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                              You Asked For
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-700">
                              {req.requestedResolution}
                            </p>
                          </div>
                        )}

                        {req.photos?.length > 0 && (
                          // the photos submitted with this request, at a size the product's condition can actually be judged from
                          <div className="mt-3">
                            <PhotoStrip photos={req.photos} label="Photos You Submitted" />
                          </div>
                        )}

                        {req.adminNote && (
                          // admin's note on the request
                          <div className="mt-3">
                            <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                              Admin Note
                            </p>
                            <p className="mt-0.5 text-sm text-slate-700">{req.adminNote}</p>
                          </div>
                        )}

                        {/* status explanation box */}
                        <div
                          className={`mt-3 flex items-center gap-2.5 rounded-xl border p-3 text-xs ${note.box}`}
                        >
                          <NoteIcon size={16} className="shrink-0" />
                          <span>
                            <b className="font-semibold">{req.status}</b> — {note.text(requestKind(req))}
                          </span>
                        </div>

                        {/* where the refund itself has actually reached */}
                        {req.refundStatus &&
                          req.refundStatus !== "Not Applicable" && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                                Refund
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {REFUND_STAGE_TEXT[req.refundStatus] ||
                                  req.refundStatus}
                              </p>
                              {req.refundMethod && (
                                // where the money is going
                                <p className="mt-0.5 text-xs text-slate-700">
                                  {REFUND_METHOD_COPY[req.refundMethod]?.title ||
                                    req.refundMethod}
                                </p>
                              )}
                              {req.refundStatus === "Processing" &&
                                req.refundMethod === "ORIGINAL_PAYMENT" && (
                                  <p className="mt-1.5 text-xs leading-relaxed text-blue-800">
                                    {/* req.payment is the label the order was paid with, "SSLCommerz (bKash)" */}
                                    {refundMethodNote(
                                      "ORIGINAL_PAYMENT",
                                      req.payment,
                                    )}
                                  </p>
                                )}
                            </div>
                          )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
};

export default ReturnsTab;
