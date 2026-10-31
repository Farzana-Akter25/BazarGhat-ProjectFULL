import {
  AlertTriangle,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileBarChart2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Flag,
  ImageOff,
  ListChecks,
  ListFilter,
  MessageSquareText,
  Package,
  PackageCheck,
  Phone,
  RefreshCcw,
  Search as SearchIcon,
  Settings2,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // jump to Delivery Assignment
import { Card, StatusBadge } from "../../components/admin/AdminUI";
import ManageReasonsModal from "../../components/admin/ManageReasonsModal";
import RefundSettingsModal from "../../components/admin/RefundSettingsModal";
import PhotoViewer, { PhotoStrip } from "../../components/shared/PhotoViewer"; // shared full-screen photo viewer
import ReturnPolicyContent from "../../components/shared/ReturnPolicyContent";
import {
  useDeleteDeliveryIssueReportMutation,
  useGetDeliveryIssueReportsQuery,
} from "../../features/admin/deliveryIssueReportApi";
import {
  useDeleteReturnMutation,
  useGetReturnRefundOptionsQuery,
  useGetReturnsQuery,
  useReceiveReturnItemsMutation,
  useResolveReturnMutation,
  useUpdateReturnStatusMutation,
} from "../../features/admin/returnApi";
import {
  useApproveRefundMutation,
  useRejectRefundMutation,
  useSyncRefundMutation,
} from "../../features/admin/refundApi";
import { useGetRefundSettingsQuery } from "../../features/admin/returnSettingsApi";
import AdminLayout from "../../layouts/AdminLayout";
import { formatDate } from "../../utils/formatDate";
import { toDeliveryStatus } from "../../utils/orderStatus"; // "Failed" reads as "Rejected" on a rider row
import { TH } from "../../components/shared/DataTable"; // shared table header cell style
import {
  buildRefundReport,
  describeFilters,
  downloadRefundReportExcel,
  downloadRefundReportPdf,
  downloadReturnRequestsExcel,
  downloadReturnRequestsPdf,
  refundTotalOf,
} from "../../utils/returnReport";

// Refunds are processed automatically via payment gateway No manual multi-step progression needed

// type filter chip options
const TYPE_FILTERS = ["All Types", "Return", "Refund"];
// status filter chip options
const STATUS_FILTERS = [
  "All Status",
  "Pending",
  "In Review",
  "Approved",
  "Rejected",
  "Completed",
];

// Which of the two a request is actually asking for.
const requestKind = (request) => {
  if (request.type === "Refund") return "Refund";
  // What the customer asked for decides whether it is shown as a return or a refund
  const wants = request.resolution || request.requestedResolution;
  return wants === "Replacement" ? "Return" : "Refund";
};

// How far the goods on an approved replacement have actually got, read off the order's own return branch.
const RETURN_BRANCH_LABEL = {
  "Return Approved": "Return Request Accepted",
  "Return Pickup Assigned": "Return Assigned",
  Returned: "Return Successful",
};

// A request's status, spelled with the kind of request it is: "Refund Pending", "Return Assigned".
const requestStatusLabel = (request) => {
  // Return or refund?
  const kind = requestKind(request);

  // The order's branch wins once a replacement has been accepted.
  const branch = RETURN_BRANCH_LABEL[request.orderStatus];
  if (kind === "Return" && branch && ["Approved", "Completed"].includes(request.status)) {
    return branch;
  }

  // "Approved" is the admin accepting the request.
  if (request.status === "Approved") return `${kind} Request Accepted`;

  return `${kind} ${request.status}`;
};

// Where the returned goods themselves have got to, in one line: who is fetching them and how far that trip got.
const collectionSummary = (request) => {
  if (request.type !== "Return") return null;

  if (request.receivedAt) {
    return { tone: "text-green-700", text: "Product received by admin" };
  }

  // Rider run collecting the goods, if any
  const pickup = request.pickup;

  if (pickup) {
    if (pickup.riderStatus === "Return Picked Up") {
      return { tone: "text-green-700", text: `Collected by ${pickup.rider}` };
    }
    // The order is back on "Return Approved" — the run is over, the goods are not collected, and someone else has to be sent.
    if (pickup.riderStatus === "Failed") {
      return {
        tone: "text-red-600",
        text: `${pickup.rider} could not collect — reassign`,
        // `assign` marks the states whose next step is a trip to Delivery Assignment, so the line itself can take the admin there.
        assign: true,
      };
    }
    return { tone: "text-purple-600", text: `${pickup.rider} assigned to collect` };
  }

  if (request.orderStatus === "Return Approved") {
    return { tone: "text-amber-600", text: "Awaiting rider assignment", assign: true };
  }

  return null;
};

// badge color per photo condition rating
const CONDITION_BADGE = {
  Good: "bg-green-50 text-green-700",
  "Minor Issue": "bg-amber-50 text-amber-600",
  "Major Issue": "bg-orange-50 text-orange-600",
  Damaged: "bg-red-50 text-red-600",
};

// quick action shortcuts list — `key` selects which panel the button opens
const QUICK_ACTIONS = [
  {
    key: "policy",
    label: "Return & Refund Policy",
    icon: ShieldCheck,
    bg: "bg-blue-50",
    fg: "text-blue-500",
  },
  {
    key: "reasons",
    label: "Manage Reasons",
    icon: ListChecks,
    bg: "bg-orange-50",
    fg: "text-orange-500",
  },
  {
    key: "settings",
    label: "Refund Settings",
    icon: Settings2,
    bg: "bg-purple-50",
    fg: "text-purple-500",
  },
  {
    key: "report",
    label: "Generate Refund Report",
    icon: FileBarChart2,
    bg: "bg-green-50",
    fg: "text-green-700",
  },
];

// advanced filter dropdown options
const RESOLUTION_FILTERS = [
  "All Resolutions",
  "Replacement",
  "Refund",
  "Unresolved",
];
// Refunds are settled automatically by the payment gateway, so a request is either refunded or has no payout at all.
const REFUND_STAGE_FILTERS = ["All Refund Stages", "Refunded", "None"];

// currency formatter
const money = (n) => `৳${n.toLocaleString()}.00`;

// Where a refund is allowed to travel, in the wording shown to the admin.
const REFUND_METHOD_LABEL = {
  WALLET: "Customer's Refund Wallet",
  ORIGINAL_PAYMENT: "Original payment method",
};

// The same wording, with the original-payment option naming the channel the order was actually settled through.
const refundMethodLabel = (method, paymentMethod) =>
  method === "ORIGINAL_PAYMENT" && paymentMethod
    ? `Original payment method (${paymentMethod})`
    : (REFUND_METHOD_LABEL[method] ?? method);

// How each refund state is coloured.
const REFUND_STATUS_TONE = {
  PENDING: { box: "border-amber-200 bg-amber-50", text: "text-amber-700" },
  PROCESSING: { box: "border-blue-200 bg-blue-50", text: "text-blue-700" },
  COMPLETED: { box: "border-green-200 bg-green-50", text: "text-green-700" },
  FAILED: { box: "border-red-200 bg-red-50", text: "text-red-700" },
  REJECTED: { box: "border-slate-200 bg-slate-50", text: "text-slate-700" },
};

// What a refund is really doing, in the admin's words.
const refundStateLabel = (refund) => {
  if (refund.awaitsApproval) return "Awaiting your approval";
  if (refund.method !== "ORIGINAL_PAYMENT") return refund.statusLabel;

  if (refund.status === "PROCESSING") return "Refund will be given by SSLCommerz";
  if (refund.status === "COMPLETED") return "SSLCommerz has completed the refund";

  return refund.statusLabel;
};

// parses the "16 Aug 2026" date the API returns into a comparable timestamp
const parseRequestDate = (value) => {
  // Turn a date into a timestamp at midnight (null if invalid)
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.setHours(0, 0, 0, 0);
};

// parses a yyyy-mm-dd date input into the same comparable form
const parseInputDate = (value, endOfDay = false) => {
  if (!value) return null;
  // Turn a yyyy-mm-dd input into a timestamp at the start (or end) of the day
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return endOfDay
    ? parsed.setHours(23, 59, 59, 999)
    : parsed.setHours(0, 0, 0, 0);
};

// donut chart widget
const Donut = ({ segments, total, centerLabel }) => {
  const totalValue = total ?? segments.reduce((s, seg) => s + seg.value, 0); // sum if no total given
  // Work out where each coloured segment of the chart ring starts and ends
  const stops = segments
    .reduce((acc, seg) => {
      const prevEnd = acc.length ? acc[acc.length - 1].end : 0; // chain from last segment
      const end = prevEnd + (seg.value / totalValue) * 360; // this segment's arc end angle
      acc.push({ color: seg.color, start: prevEnd, end });
      return acc;
    }, [])
    .map((seg) => `${seg.color} ${seg.start}deg ${seg.end}deg`)
    .join(", "); // conic-gradient stop string

  return (
    <div className="flex flex-wrap items-center gap-5">
      {/* the ring itself, drawn with conic-gradient */}
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      >
        {/* center hole showing total + label */}
        <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <p className="text-lg font-black text-slate-800">{totalValue}</p>
          <p className="text-[10px] text-slate-600">{centerLabel}</p>
        </div>
      </div>
      {/* legend list */}
      <div className="min-w-0 flex-1 space-y-2">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
          >
            {/* color dot */}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="font-medium text-slate-600">{seg.label}</span>
            {/* value + percentage */}
            <span className="font-semibold text-slate-800">
              {seg.value} ({((seg.value / totalValue) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Admin page for return and refund requests: list, filters, details, decisions and reports
const ReturnRefundManagement = () => {
  const navigate = useNavigate(); // "assign a rider" links out to Delivery Assignment
  const { data: requests = [], isLoading } = useGetReturnsQuery(); // all return/refund requests
  const [updateReturnStatus] = useUpdateReturnStatusMutation(); // approve/reject request
  const [receiveReturnItems, { isLoading: isReceiving }] =
    useReceiveReturnItemsMutation(); // confirm returned goods reached the admin
  const [resolveReturn, { isLoading: isResolving }] =
    useResolveReturnMutation(); // pick replacement/refund
  // A refund's own lifecycle: approving releases the money, rejecting refuses it, and syncing asks SSLCommerz whether a gateway refund has actually settled.
  const [approveRefund, { isLoading: isApprovingRefund }] =
    useApproveRefundMutation();
  const [rejectRefund, { isLoading: isRejectingRefund }] =
    useRejectRefundMutation();
  const [syncRefund, { isLoading: isSyncingRefund }] = useSyncRefundMutation();
  const [refundError, setRefundError] = useState(""); // refund action error text
  const [rejectingRefund, setRejectingRefund] = useState(null); // refund pending a rejection reason
  // Reject reason text
  const [rejectReason, setRejectReason] = useState("");
  const [chosenRefundMethod, setChosenRefundMethod] = useState(null); // admin's pick when resolving to a refund
  const [deleteReturn, { isLoading: isDeleting }] = useDeleteReturnMutation();
  const { data: issueReports = [], isLoading: isLoadingIssueReports } =
    useGetDeliveryIssueReportsQuery(); // reports from delivery staff
  const [deleteDeliveryIssueReport, { isLoading: isDeletingIssueReport }] =
    useDeleteDeliveryIssueReportMutation();
  const [resolveError, setResolveError] = useState(""); // resolve action error text
  const [type, setType] = useState("All Types"); // active type filter
  const [status, setStatus] = useState("All Status"); // active status filter
  const [query, setQuery] = useState(""); // search box text
  const [selectedId, setSelectedId] = useState(null); // request open in side panel
  const [action, setAction] = useState(""); // chosen admin action
  const [actionMenuOpen, setActionMenuOpen] = useState(false); // action dropdown open state
  const [actionError, setActionError] = useState(""); // why a decision could not be carried out
  const [receiveError, setReceiveError] = useState(""); // why the goods could not be checked in
  const [adminNote, setAdminNote] = useState(""); // note textarea value
  const [deletingReq, setDeletingReq] = useState(null); // request pending delete confirm
  const [deletingIssueReport, setDeletingIssueReport] = useState(null); // issue report pending delete confirm
  const [previewPhoto, setPreviewPhoto] = useState(null); // photo shown in lightbox

  // advanced filter panel ("Filter" button)
  const [showAdvanced, setShowAdvanced] = useState(false); // panel open state
  const [fromDate, setFromDate] = useState(""); // request date lower bound
  const [toDate, setToDate] = useState(""); // request date upper bound
  const [minAmount, setMinAmount] = useState(""); // refund total lower bound
  const [maxAmount, setMaxAmount] = useState(""); // refund total upper bound
  const [resolution, setResolution] = useState("All Resolutions"); // replacement/refund filter
  const [refundStage, setRefundStage] = useState("All Refund Stages"); // refund progress filter

  const [exportMenuOpen, setExportMenuOpen] = useState(false); // export format dropdown
  const [quickPanel, setQuickPanel] = useState(null); // open quick-action panel key
  const [reportMenuOpen, setReportMenuOpen] = useState(false); // refund report format dropdown

  const tableRef = useRef(null); // scroll target for the stat card "View" buttons

  // admin-configured presentation defaults (shipping in totals, flag thresholds)
  const { data: refundSettingsData } = useGetRefundSettingsQuery();
  // Refund settings, with defaults
  const settings = refundSettingsData?.settings;
  const shippingRefundable = settings?.shipping_refundable ?? true;
  const highValueThreshold = settings?.high_value_threshold ?? 5000;
  const repeatRequestThreshold = settings?.auto_flag_repeat_requests ?? 3;
  // refund_sla_days is not read here: the gateway settles refunds instantly, so a payout can never run past its SLA.

  // total actually owed on a request, honouring the shipping setting
  const refundTotal = (r) => refundTotalOf(r, shippingRefundable);

  // customers at or above the repeat-request threshold, flagged in the table
  const repeatCustomers = useMemo(() => {
    // Count requests per customer (to flag repeat requesters)
    const tally = {};
    requests.forEach((r) => {
      const key = r.customerCode || r.customer;
      tally[key] = (tally[key] || 0) + 1;
    });
    return new Set(
      Object.entries(tally)
        .filter(([, count]) => count >= repeatRequestThreshold)
        .map(([key]) => key),
    );
  }, [requests, repeatRequestThreshold]);

  // stat counts by status
  const counts = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "Pending").length,
      inReview: requests.filter((r) => r.status === "In Review").length,
      approved: requests.filter((r) => r.status === "Approved").length,
      rejected: requests.filter((r) => r.status === "Rejected").length,
      completed: requests.filter((r) => r.status === "Completed").length,
    }),
    [requests],
  );

  // donut data: request status breakdown
  const overviewSegments = useMemo(
    () => [
      { label: "Pending", value: counts.pending, color: "#f97316" },
      { label: "In Review", value: counts.inReview, color: "#3b82f6" },
      { label: "Approved", value: counts.approved, color: "#10b981" },
      { label: "Rejected", value: counts.rejected, color: "#ef4444" },
      { label: "Completed", value: counts.completed, color: "#64748b" },
    ],
    [counts],
  );

  // donut data: return vs refund split
  const returnVsRefund = useMemo(
    () => [
      {
        label: "Return",
        value: requests.filter((r) => r.type === "Return").length,
        color: "#3b82f6",
      },
      {
        label: "Refund",
        value: requests.filter((r) => r.type === "Refund").length,
        color: "#10b981",
      },
    ],
    [requests],
  );

  // sum of approved refund amounts (+ shipping when the setting includes it)
  const totalRefundAmount = useMemo(
    () =>
      requests
        .filter((r) => r.status === "Approved")
        .reduce((sum, r) => sum + refundTotalOf(r, shippingRefundable), 0),
    [requests, shippingRefundable],
  );

  // requests after search/type/status filters plus the advanced filter panel
  const filtered = useMemo(() => {
    // Advanced filter values as numbers / timestamps
    const fromTs = parseInputDate(fromDate);
    const toTs = parseInputDate(toDate, true);
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

    return requests.filter((r) => {
      // Keep requests matching the search text, type and status
      const matchesQuery =
        !query ||
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.orderId.toLowerCase().includes(query.toLowerCase()) ||
        r.customer.toLowerCase().includes(query.toLowerCase());
      const matchesType = type === "All Types" || r.type === type;
      const matchesStatus = status === "All Status" || r.status === status;

      // advanced: request date range
      const requestTs = parseRequestDate(r.date);
      // Request date within the chosen range
      const matchesFrom =
        fromTs === null || (requestTs !== null && requestTs >= fromTs);
      const matchesTo =
        toTs === null || (requestTs !== null && requestTs <= toTs);

      // advanced: refund total range
      const total = refundTotalOf(r, shippingRefundable);
      // Total amount within the chosen range
      const matchesMin = min === null || Number.isNaN(min) || total >= min;
      const matchesMax = max === null || Number.isNaN(max) || total <= max;

      // advanced: how the request was resolved
      const matchesResolution =
        resolution === "All Resolutions" ||
        (resolution === "Unresolved"
          ? !r.resolution
          : r.resolution === resolution);

      // advanced: where the refund payout has reached
      const stage =
        r.refundStatus && r.refundStatus !== "Not Applicable"
          ? r.refundStatus
          : "None";
      // Refund stage filter
      const matchesStage =
        refundStage === "All Refund Stages" || stage === refundStage;

      return (
        matchesQuery &&
        matchesType &&
        matchesStatus &&
        matchesFrom &&
        matchesTo &&
        matchesMin &&
        matchesMax &&
        matchesResolution &&
        matchesStage
      );
    });
  }, [
    requests,
    query,
    type,
    status,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    resolution,
    refundStage,
    shippingRefundable,
  ]);

  // how many advanced filters are currently narrowing the list
  const activeAdvancedCount = [
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    resolution !== "All Resolutions" ? resolution : "",
    refundStage !== "All Refund Stages" ? refundStage : "",
  ].filter(Boolean).length;

  // clear every advanced filter back to its default
  const resetAdvanced = () => {
    setFromDate("");
    setToDate("");
    setMinAmount("");
    setMaxAmount("");
    setResolution("All Resolutions");
    setRefundStage("All Refund Stages");
  };

  // top stat card definitions — `filterValue` is what the card's CTA applies to the status filter
  const STAT_CARDS = [
    {
      key: "total",
      filterValue: "All Status",
      label: "Total Requests",
      subtitle: "All Return & Refund Requests",
      value: counts.total,
      icon: FileText,
      bg: "bg-blue-500",
      accent: "text-blue-600",
      cta: "View All",
    },
    {
      key: "pending",
      filterValue: "Pending",
      label: "Pending",
      subtitle: "Awaiting Review",
      value: counts.pending,
      icon: Clock3,
      bg: "bg-orange-500",
      accent: "text-orange-600",
      cta: "View",
    },
    {
      key: "inReview",
      filterValue: "In Review",
      label: "In Review",
      subtitle: "Under Review",
      value: counts.inReview,
      icon: MessageSquareText,
      bg: "bg-purple-500",
      accent: "text-purple-600",
      cta: "View",
    },
    {
      key: "approved",
      filterValue: "Approved",
      label: "Approved",
      subtitle: "Return/Refund Approved",
      value: counts.approved,
      icon: CheckCircle2,
      bg: "bg-green-700",
      accent: "text-green-700",
      cta: "View",
    },
    {
      key: "rejected",
      filterValue: "Rejected",
      label: "Rejected",
      subtitle: "Return/Refund Rejected",
      value: counts.rejected,
      icon: XCircle,
      bg: "bg-red-500",
      accent: "text-red-600",
      cta: "View",
    },
    {
      key: "completed",
      filterValue: "Completed",
      label: "Completed",
      subtitle: "Return/Refund Settled",
      value: counts.completed,
      icon: CheckCircle2,
      bg: "bg-slate-500",
      accent: "text-slate-600",
      cta: "View",
    },
  ];

  const selected = requests.find((r) => r.id === selectedId) || null; // request shown in side panel
  // Is the open request asking for money, or for the item replaced?
  const isRefundRequest = selected ? requestKind(selected) === "Refund" : false;

  // What this request can actually be refunded, and where the money may go.
  const { data: refundOptions } = useGetReturnRefundOptionsQuery(
    selected?.requestId,
    { skip: !selected?.requestId },
  );
  // Refund methods available for the open request
  const refundMethods = refundOptions?.methods ?? [];
  // Derived, so opening a different request never leaves a stale route selected.
  const resolveMethod = refundMethods.includes(chosenRefundMethod)
    ? chosenRefundMethod
    : (refundOptions?.preferredMethod &&
        refundMethods.includes(refundOptions.preferredMethod)
        ? refundOptions.preferredMethod
        : (refundMethods[0] ?? null));
  // Refunds on the open request
  const selectedRefunds = selected?.refunds ?? [];
  // Where the goods on the open request have got to, and the rider errand behind that.
  const selectedCollection = selected ? collectionSummary(selected) : null;
  // Pickup run for the open request
  const selectedPickup = selected?.pickup ?? null;

  // A return request carries the refund request inside it.
  const wantsReplacement =
    selected?.type === "Return" && selected?.requestedResolution === "Replacement";
  // Button labels depend on whether the customer wants a replacement or a refund
  const decisionLabels = wantsReplacement
    ? { approve: "Approve Replacement", reject: "Reject Return" }
    : { approve: "Approve Refund", reject: "Reject Refund" };

  // An item return whose goods have not physically come back yet.
  const awaitingGoods =
    selected?.type === "Return" &&
    !selected?.receivedAt &&
    ["Approved", "Completed"].includes(selected?.status);

  // Send the admin to Delivery Assignment with this return already searched for, so the rider is picked against the request they were just looking at instead of hunting for it in the order list.
  const goAssignRider = (request) => {
    navigate(`/admin/delivery-assignment?assign=${encodeURIComponent(request.id)}`);
  };

  // stat card CTA: narrow the table to that status, then scroll it into view
  const focusStatus = (filterValue) => {
    setStatus(filterValue);
    setQuery("");
    resetAdvanced();
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // one-line description of the filters behind an export
  const exportFilterSummary = () =>
    describeFilters({
      type,
      status,
      from: fromDate,
      to: toDate,
      minAmount,
      maxAmount,
      resolution,
      refundStatus: refundStage,
      query,
    });

  // download the currently filtered request list
  const handleExport = (format) => {
    setExportMenuOpen(false);
    if (filtered.length === 0) return;
    // Export the filtered request list as PDF or Excel
    const summary = exportFilterSummary();
    if (format === "excel")
      downloadReturnRequestsExcel(filtered, summary, shippingRefundable);
    else downloadReturnRequestsPdf(filtered, summary, shippingRefundable);
  };

  // download the aggregate refund report, built from every request
  const handleRefundReport = (format) => {
    setReportMenuOpen(false);
    setQuickPanel(null);
    // Build and download the refund report
    const report = buildRefundReport(requests, shippingRefundable);
    if (format === "excel") downloadRefundReportExcel(report);
    else downloadRefundReportPdf(report);
  };

  // quick action buttons: three open a panel, the report one opens a format menu
  const runQuickAction = (key) => {
    if (key === "report") {
      setReportMenuOpen((o) => !o);
      return;
    }
    setReportMenuOpen(false);
    setQuickPanel(key);
  };

  // close the export/report dropdowns on Escape
  useEffect(() => {
    // Close the export menu on Escape
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setExportMenuOpen(false);
      setReportMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // open the details side panel for a request, reset action form
  const openDetails = (req) => {
    setSelectedId(req.id);
    setAction("");
    setAdminNote("");
    setActionMenuOpen(false);
    setResolveError("");
    setRefundError("");
    setChosenRefundMethod(null);
    setRejectingRefund(null);
    setRejectReason("");
    setActionError("");
    setReceiveError("");
  };

  // close the details side panel
  const closeDetails = () => {
    setSelectedId(null);
    setActionMenuOpen(false);
  };

  // submit approve/reject decision with note
  const submitAction = async () => {
    if (!selected || !action) return;
    setActionError("");
    // Approve or reject the request
    const nextStatus = action === decisionLabels.approve ? "Approved" : "Rejected";
    try {
      await updateReturnStatus({
        id: selected.requestId,
        status: nextStatus,
        admin_note: adminNote,
      }).unwrap();
      closeDetails();
    } catch (err) {
      // The decision itself may well have been recorded.
      setActionError(
        err?.data?.message || "Could not record this decision. Please try again.",
      );
    }
  };

  // Record that the returned goods reached the admin.
  const submitReceipt = async () => {
    if (!selected) return;
    setReceiveError("");
    try {
      await receiveReturnItems({ id: selected.requestId }).unwrap();
    } catch (err) {
      setReceiveError(
        err?.data?.message ||
          "Could not record the returned goods. Please try again.",
      );
    }
  };

  // Same confirmation straight from the table row, for the common case: the rider has handed the goods over and the admin just needs to say so.
  const confirmReceived = async (req) => {
    try {
      await receiveReturnItems({ id: req.requestId }).unwrap();
    } catch (err) {
      // Whatever refused it — already confirmed, not approved yet — is worth reading, so open the panel that has somewhere to show the reason.
      openDetails(req);
      setReceiveError(
        err?.data?.message ||
          "Could not record the returned goods. Please try again.",
      );
    }
  };

  // one-click approve/reject from the table row
  const quickDecision = (req, nextStatus) => {
    updateReturnStatus({
      id: req.requestId,
      status: nextStatus,
      admin_note: "",
    });
  };

  // Payment & Return Policy: an approved Return always attempts a Replacement first.
  const submitResolution = async (resolution) => {
    if (!selected) return;
    setResolveError("");
    try {
      await resolveReturn({
        id: selected.requestId,
        resolution,
        // Only meaningful for a refund; the server ignores it otherwise.
        refund_method: resolution === "Refund" ? resolveMethod : undefined,
      }).unwrap();
    } catch (err) {
      setResolveError(
        err?.data?.message ||
          "Could not resolve this request. Please try again.",
      );
    }
  };

  // Approve a raised refund — this is what actually releases the money, either into the customer's balance or out through SSLCommerz.
  const confirmRefund = async (refund) => {
    setRefundError("");
    try {
      await approveRefund({ id: refund.id }).unwrap();
    } catch (err) {
      setRefundError(
        err?.data?.message || "Could not approve this refund. Please try again.",
      );
    }
  };

  // Refuse a raised refund.
  const submitRefundRejection = async () => {
    if (!rejectingRefund || !rejectReason.trim()) return;
    setRefundError("");
    try {
      await rejectRefund({
        id: rejectingRefund.id,
        reason: rejectReason.trim(),
      }).unwrap();
      setRejectingRefund(null);
      setRejectReason("");
    } catch (err) {
      setRefundError(
        err?.data?.message || "Could not reject this refund. Please try again.",
      );
    }
  };

  // Ask SSLCommerz whether a gateway refund has settled yet.
  const checkRefundStatus = async (refund) => {
    setRefundError("");
    try {
      await syncRefund(refund.id).unwrap();
    } catch (err) {
      setRefundError(
        err?.data?.message ||
          "Could not check this refund with the payment gateway.",
      );
    }
  };

  // confirm deleting a return/refund request
  const confirmDelete = async () => {
    if (!deletingReq) return;
    await deleteReturn(deletingReq.requestId);
    if (selectedId === deletingReq.id) closeDetails();
    setDeletingReq(null);
  };

  // confirm deleting a delivery issue report
  const confirmDeleteIssueReport = async () => {
    if (!deletingIssueReport) return;
    await deleteDeliveryIssueReport(deletingIssueReport.id);
    setDeletingIssueReport(null);
  };

  return (
    <AdminLayout
      title="Return & Refund Management"
      subtitle="Review, approve and track return & refund requests"
    >
      {/* stat cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon; // icon for this stat card
          return (
            <div
              key={s.key}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              {/* colored icon badge */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}
              >
                <Icon size={18} className="text-white" />
              </div>
              {/* big number */}
              <p className="mt-3 text-2xl font-black text-slate-900">
                {s.value}
              </p>
              <p className="text-xs font-semibold text-slate-700">{s.label}</p>
              <p className="text-[11px] text-slate-600">{s.subtitle}</p>
              {/* view link — filters the table to this status and scrolls to it */}
              <button
                onClick={() => focusStatus(s.filterValue)}
                className={`mt-3 flex items-center gap-1 text-xs font-semibold ${s.accent} hover:underline`}
              >
                {s.cta} <Icon size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* filters bar */}
      <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* type dropdown */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {/* status dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* search box */}
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by Order ID, Request ID, Customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* filter + export buttons */}
          <div className="flex items-center gap-3">
            {/* toggles the advanced filter panel below */}
            <button
              onClick={() => setShowAdvanced((o) => !o)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                showAdvanced || activeAdvancedCount
                  ? "border-green-700 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ListFilter size={15} />
              Filter
              {/* count of advanced filters currently applied */}
              {activeAdvancedCount > 0 && (
                <span className="rounded-full bg-green-700 px-1.5 text-[10px] font-bold text-white">
                  {activeAdvancedCount}
                </span>
              )}
            </button>

            {/* export the filtered list as Excel or PDF */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={filtered.length === 0}
                title={
                  filtered.length === 0
                    ? "Nothing to export"
                    : `Export ${filtered.length} requests`
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileDown size={15} />
                Export
                <ChevronDown size={14} />
              </button>
              {exportMenuOpen && (
                <>
                  {/* click-away catcher */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExportMenuOpen(false)}
                  />
                  {/* format options */}
                  <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                    <button
                      onClick={() => handleExport("excel")}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FileSpreadsheet size={15} className="text-green-700" />
                      Export as Excel
                    </button>
                    <button
                      onClick={() => handleExport("pdf")}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FileDown size={15} className="text-red-500" />
                      Export as PDF
                    </button>
                    {/* what's being exported */}
                    <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
                      {filtered.length} request
                      {filtered.length === 1 ? "" : "s"} matching the current
                      filters
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* advanced filter panel */}
        {showAdvanced && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* request date from */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Request date from
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-700"
                />
              </div>
              {/* request date to */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Request date to
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-700"
                />
              </div>
              {/* resolution filter */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
                >
                  {RESOLUTION_FILTERS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {/* refund stage filter */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Refund stage
                </label>
                <select
                  value={refundStage}
                  onChange={(e) => setRefundStage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
                >
                  {REFUND_STAGE_FILTERS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {/* minimum refund total */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Min refund total (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-700"
                />
              </div>
              {/* maximum refund total */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Max refund total (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Any"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-700"
                />
              </div>
            </div>

            {/* panel footer: match count + reset */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600">
                {filtered.length} of {requests.length} requests match
              </p>
              <button
                onClick={resetAdvanced}
                disabled={activeAdvancedCount === 0}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* requests table — wrapper carries the scroll target for the stat card CTAs */}
      <div ref={tableRef} className="scroll-mt-6">
        <Card className="mt-6" title="Return & Refund Requests">
          <div className="rounded-xl border border-slate-200">
            <table className="w-full table-auto text-left text-sm">
              {/* Column headers. */}
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                  <th className={TH}>Request</th>
                  <th className={TH}>Customer</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Product &amp; Reason</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* table rows list */}
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === selectedId ? "bg-blue-50/50" : ""}
                  >
                    {/* the two ids and when it was raised — one identity block */}
                    <td className="px-3 py-3 break-words">
                      <p className="font-semibold text-slate-700">{r.id}</p>
                      <p className="text-xs font-semibold text-blue-500">
                        {r.orderId}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {formatDate(r.date)}, {r.time}
                      </p>
                    </td>
                    {/* customer name + code */}
                    <td className="px-3 py-3 break-words">
                      <p className="font-medium text-slate-700">{r.customer}</p>
                      <p className="text-xs text-slate-600">{r.customerCode}</p>
                      {/* repeat-requester flag, threshold set in Refund Settings */}
                      {repeatCustomers.has(r.customerCode || r.customer) && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Flag size={10} /> Repeat requester
                        </span>
                      )}
                    </td>
                    {/* type pill, over what the customer asked to get out of it */}
                    <td className="px-3 py-3 break-words">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.type === "Return"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        {r.type}
                      </span>
                      {r.requestedResolution && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          Wants {r.requestedResolution.toLowerCase()}
                        </p>
                      )}
                    </td>
                    {/* product thumb + name, with the reason underneath it */}
                    <td className="px-3 py-3 break-words">
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Package size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700">
                            {r.product}
                          </p>
                          {r.variant && (
                            <p className="text-xs text-slate-600">{r.variant}</p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-600">
                            {r.reason}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* amount + payment method */}
                    <td className="px-3 py-3 break-words">
                      <p className="font-bold text-slate-800">
                        {money(r.amount)}
                      </p>
                      <p className="text-xs text-slate-600">{r.payment}</p>
                      {/* high-value flag, threshold set in Refund Settings */}
                      {refundTotal(r) >= highValueThreshold && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          <Flag size={10} /> High value
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 break-words">
                      {/* the request's kind is named in the status itself, so a row reads "Return Pending" / "Refund Pending" rather than a bare "Pending" that says nothing about what is waiting. */}
                      <StatusBadge status={r.status} label={requestStatusLabel(r)} />
                      {/* and where the goods themselves have got to, which the request's own status stops tracking once it is decided */}
                      {(() => {
                        // Pickup/collection status line under the request
                        const collection = collectionSummary(r);
                        if (!collection) return null;
                        const line = (
                          <>
                            <Bike size={11} className="mt-0.5 shrink-0" />
                            {collection.text}
                          </>
                        );
                        // A line that says a rider is still needed is also the way to go and pick one.
                        return collection.assign ? (
                          <button
                            type="button"
                            onClick={() => goAssignRider(r)}
                            title="Open Delivery Assignment for this return"
                            className={`mt-1.5 flex items-start gap-1 text-left text-[11px] font-medium underline decoration-dotted underline-offset-2 hover:opacity-80 ${collection.tone}`}
                          >
                            {line}
                          </button>
                        ) : (
                          <p
                            className={`mt-1.5 flex items-start gap-1 text-[11px] font-medium ${collection.tone}`}
                          >
                            {line}
                          </p>
                        );
                      })()}
                    </td>
                    {/* row action buttons — stacked, so a narrow column wraps them instead of pushing the table past the page edge */}
                    <td className="px-3 py-3 break-words">
                      <div className="flex flex-col items-stretch gap-1.5">
                        {!["Approved", "Rejected", "Completed"].includes(
                          r.status,
                        ) && (
                          <>
                            {/* quick confirm */}
                            <button
                              onClick={() => quickDecision(r, "Approved")}
                              className="flex items-center justify-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                            >
                              <Check size={13} />
                              Confirm
                            </button>
                            {/* quick reject */}
                            <button
                              onClick={() => quickDecision(r, "Rejected")}
                              className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </>
                        )}
                        {/* The rider has handed the goods over: the admin says so here. */}
                        {r.type === "Return" &&
                          !r.receivedAt &&
                          r.pickup?.riderStatus === "Return Picked Up" && (
                            <button
                              disabled={isReceiving}
                              onClick={() => confirmReceived(r)}
                              className="flex items-center justify-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                            >
                              <PackageCheck size={13} />
                              Product Received
                            </button>
                          )}
                        {/* open side panel */}
                        <button
                          onClick={() => openDetails(r)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* loading row */}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-600"
                    >
                      Loading requests...
                    </td>
                  </tr>
                )}
                {/* empty state row */}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-600"
                    >
                      No requests match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* footer count */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <p className="text-xs text-slate-600">
              Showing {filtered.length} of {requests.length} entries
            </p>
          </div>
        </Card>
      </div>

      {/* delivery issue reports card */}
      <Card
        className="mt-6"
        title={
          // card title with icon
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Delivery Issue Reports
          </span>
        }
        action={
          // report count label
          <span className="text-xs font-medium text-slate-600">
            {issueReports.length} report{issueReports.length === 1 ? "" : "s"}{" "}
            from delivery staff
          </span>
        }
      >
        <div className="space-y-3">
          {/* issue report list */}
          {issueReports.map((rep) => (
            <div
              key={rep.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-start"
            >
              {/* reported photo thumb, opens the full-screen viewer */}
              <button
                onClick={() => rep.photo && setPreviewPhoto(rep.photo)}
                disabled={!rep.photo}
                title={rep.photo ? "Click to enlarge" : "No photo attached"}
                className="group relative flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 disabled:cursor-default"
              >
                {rep.photo ? (
                  <>
                    <img
                      src={rep.photo}
                      alt="Reported product"
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* zoom affordance on hover */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
                      <ZoomIn size={20} />
                    </span>
                  </>
                ) : (
                  <ImageOff size={22} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                {/* condition badge + order id */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      CONDITION_BADGE[rep.condition] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {rep.condition}
                  </span>
                  <span className="text-xs font-semibold text-blue-500">
                    {rep.orderId}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 wrap-break-word">
                  {rep.comment}
                </p>
                {/* delivery man, customer, date meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Bike size={12} /> {rep.deliveryMan} ({rep.deliveryManCode})
                  </span>
                  <span>Customer: {rep.customer}</span>
                  <span>
                    {formatDate(rep.date)}, {rep.time}
                  </span>
                </div>
              </div>
              {/* delete report */}
              <button
                onClick={() => setDeletingIssueReport(rep)}
                className="flex shrink-0 items-center gap-1 self-start rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          ))}
          {/* loading state */}
          {isLoadingIssueReports && (
            <p className="py-6 text-center text-sm text-slate-600">
              Loading issue reports...
            </p>
          )}
          {/* empty state */}
          {!isLoadingIssueReports && issueReports.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-600">
              No product issue reports from delivery staff yet.
            </p>
          )}
        </div>
      </Card>

      {/* summary cards grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* status breakdown donut */}
        <Card title="Request Overview">
          <Donut
            segments={overviewSegments}
            total={counts.total}
            centerLabel="Total"
          />
        </Card>

        {/* return vs refund donut */}
        <Card title="Return vs Refund">
          <Donut
            segments={returnVsRefund}
            total={counts.total}
            centerLabel="Total"
          />
        </Card>

        {/* total approved refunds card */}
        <Card title="Refund Summary">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600">Total Approved Refunds</p>
              <p className="text-xl font-black text-slate-900">
                {money(totalRefundAmount)}
              </p>
            </div>
          </div>
        </Card>

        {/* quick action shortcuts card */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <div key={qa.key} className="relative">
                  <button
                    onClick={() => runQuickAction(qa.key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {/* icon badge */}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${qa.bg} ${qa.fg}`}
                    >
                      <Icon size={15} />
                    </span>
                    {qa.label}
                    {/* the report action opens a format menu rather than a panel */}
                    {qa.key === "report" && (
                      <ChevronDown
                        size={14}
                        className="ml-auto text-slate-600"
                      />
                    )}
                  </button>

                  {/* refund report format menu */}
                  {qa.key === "report" && reportMenuOpen && (
                    <>
                      {/* click-away catcher */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setReportMenuOpen(false)}
                      />
                      <div className="absolute right-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                        <button
                          onClick={() => handleRefundReport("excel")}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <FileSpreadsheet
                            size={15}
                            className="text-green-700"
                          />
                          Download as Excel
                        </button>
                        <button
                          onClick={() => handleRefundReport("pdf")}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <FileDown size={15} className="text-red-500" />
                          Download as PDF
                        </button>
                        {/* scope note */}
                        <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
                          Covers all {requests.length} requests, not the current
                          filters.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* request details side panel */}
      {selected && (
        <>
          {/* dim backdrop, click to close */}
          <div
            onClick={closeDetails}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
          />
          {/* Wide enough to lay the request out in two columns, so an admin can take the whole decision in at a glance instead of scrolling. */}
          <aside className="fixed top-0 right-0 z-50 flex h-screen w-full max-w-5xl flex-col bg-white shadow-2xl">
            {/* panel header: what this request is, and where it has got to */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <p className="text-lg font-black text-slate-900">
                    {selected.id}
                  </p>
                  <span className="text-xs font-semibold text-blue-500">
                    {selected.orderId}
                  </span>
                  <StatusBadge
                    status={selected.status}
                    label={requestStatusLabel(selected)}
                  />
                </div>
                {/* where the goods are, alongside where the request is */}
                {selectedCollection && (
                  <p
                    className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${selectedCollection.tone}`}
                  >
                    <Bike size={11} />
                    {selectedCollection.text}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetails}
                className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* body: scrolls only if a screen is too short for the two columns */}
            <div className="scrollbar-overlay flex-1 overflow-y-auto p-4">
              {/* two-column layout: the request on the left, the decision on the right */}
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* left column: what was asked for */}
              <div className="space-y-3">
              {/* Order info. */}
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Request &amp; Order Information
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-slate-600">Order Date</p>
                    <p className="font-medium text-slate-700">
                      {formatDate(selected.orderDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600">Request Date</p>
                    <p className="font-medium text-slate-700">
                      {formatDate(selected.date)}, {selected.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600">Type</p>
                    <p className="font-medium text-slate-700">
                      {/* A return carries its refund request inside it, so say so rather than leaving the admin to infer it. */}
                      {selected.type === "Return" && !wantsReplacement
                        ? "Return & Refund"
                        : selected.type === "Return"
                          ? "Return & Replacement"
                          : selected.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600">Customer</p>
                    <p className="font-medium text-slate-700">
                      {selected.customer}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {selected.customerCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600">Phone</p>
                    <p className="flex items-center gap-1 font-medium text-slate-700">
                      <Phone size={12} className="shrink-0 text-slate-600" />
                      {selected.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600">Payment Method</p>
                    <p className="font-medium text-slate-700">
                      {selected.payment}
                    </p>
                  </div>
                  {selected.requestedResolution && (
                    // what the customer asked for, which is what is being decided
                    <div>
                      <p className="text-[11px] text-slate-600">Customer Wants</p>
                      <p className="font-medium text-slate-700">
                        {selected.requestedResolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* The product and why it is coming back, in one block — the two halves of the same question, and never read apart. */}
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Product &amp; Reason
                </p>
                <div className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {selected.product}
                      </p>
                      {selected.variant && (
                        <p className="text-xs text-slate-600">
                          {selected.variant}
                        </p>
                      )}
                      <p className="text-sm font-bold text-slate-700">
                        {money(selected.price)}{" "}
                        <span className="font-normal text-slate-600">
                          Qty: {selected.qty}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-sm font-semibold text-slate-700">
                    {selected.reason}
                  </p>
                  {selected.note && (
                    <p className="mt-1.5 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                      <span className="font-medium text-slate-600">
                        Customer Note:{" "}
                      </span>
                      {selected.note}
                    </p>
                  )}
                  {selected.adminNote && (
                    <p className="mt-1.5 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700">
                      <span className="font-medium">Admin Note: </span>
                      {selected.adminNote}
                    </p>
                  )}
                </div>
              </div>

              {/* customer uploaded photos — the evidence this decision rests on, so they open full screen rather than in a new browser tab */}
              {selected.photos?.length > 0 && (
                // small enough that all three sit on one row without taking a screenful of the panel; clicking one still opens it full screen
                <PhotoStrip
                  photos={selected.photos}
                  label="Customer Photos"
                  size="h-20 w-20"
                />
              )}
              </div>

              {/* right column: the money and the decision */}
              <div className="space-y-3">
              {/* resolve request: replacement vs refund choice */}
              {selected.type === "Return" &&
                selected.status === "Approved" &&
                !selected.resolution && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-500">
                      Resolve Request
                    </p>
                    <p className="mb-3 text-xs text-indigo-700">
                      Always attempt a replacement first — issue a refund only
                      if replacement can't be fulfilled (out of stock,
                      discontinued, or unavailable).
                    </p>
                    {/* resolve error message */}
                    {resolveError && (
                      <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                        {resolveError}
                      </p>
                    )}
                    {/* where a refund would go, if one is issued */}
                    {refundMethods.length > 0 && (
                      <div className="mb-3 rounded-lg border border-indigo-100 bg-white p-3">
                        <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                          Refund Destination
                        </p>
                        {selected.preferredRefundMethod && (
                          // what the customer asked for, so the admin can honour it
                          <p className="mb-2 text-[11px] text-slate-600">
                            Customer asked for:{" "}
                            <span className="font-semibold text-slate-700">
                              {refundMethodLabel(
                                selected.preferredRefundMethod,
                                refundOptions?.paymentMethod,
                              )}
                            </span>
                          </p>
                        )}
                        <div className="space-y-1.5">
                          {refundMethods.map((m) => (
                            <label
                              key={m}
                              className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"
                            >
                              <input
                                type="radio"
                                name="admin-refund-method"
                                checked={resolveMethod === m}
                                onChange={() => setChosenRefundMethod(m)}
                                className="accent-indigo-600"
                              />
                              {refundMethodLabel(m, refundOptions?.paymentMethod)}
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                          Refund amount:{" "}
                          <span className="font-bold text-slate-700">
                            {money(refundOptions?.refundableAmount ?? 0)}
                          </span>
                          {resolveMethod === "ORIGINAL_PAYMENT"
                            ? ` — the refund will be given by ${refundOptions?.paymentMethod || "SSLCommerz"} and may take up to 3 days to reach the customer.`
                            : " — added to the customer's Refund Wallet, which they can spend on a later order."}
                        </p>
                        {/* cash handed over at the door has no card or wallet transaction to reverse, so the balance is the only place it can come back to */}
                        {refundOptions?.isCod && (
                          <p className="mt-1 text-[11px] font-medium text-slate-600">
                            Paid cash on delivery — the Refund Wallet is the
                            only destination available.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {/* attempt replacement */}
                      <button
                        disabled={isResolving}
                        onClick={() => submitResolution("Replacement")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        <PackageCheck size={13} /> Attempt Replacement
                      </button>
                      {/* issue refund instead */}
                      <button
                        disabled={isResolving || refundMethods.length === 0}
                        onClick={() => submitResolution("Refund")}
                        title={
                          refundMethods.length === 0
                            ? refundOptions?.note ||
                              "There is nothing left to refund on this order."
                            : undefined
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-60"
                      >
                        <Wallet size={13} /> Issue Refund Instead
                      </button>
                    </div>
                    {refundMethods.length === 0 && refundOptions?.note && (
                      // why the refund route is closed for this request
                      <p className="mt-2 text-[11px] text-indigo-700">
                        {refundOptions.note}
                      </p>
                    )}
                  </div>
                )}

              {/* replacement order confirmation */}
              {selected.resolution === "Replacement" &&
                selected.replacementOrderId && (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">
                    <RefreshCcw size={14} /> Replacement order{" "}
                    {selected.replacementOrderId} was created for this request.
                  </div>
                )}

              {/* the real refunds behind this request, and what can be done to them */}
              {selectedRefunds.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-600 uppercase">
                    <Wallet size={12} /> Refund Status
                  </p>

                  {refundError && (
                    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      {refundError}
                    </p>
                  )}

                  <div className="space-y-2">
                    {selectedRefunds.map((refund) => {
                      // Colour for this refund's status
                      const tone =
                        REFUND_STATUS_TONE[refund.status] ||
                        REFUND_STATUS_TONE.PENDING;

                      return (
                        <div
                          key={refund.id}
                          className={`rounded-xl border px-4 py-3 ${tone.box}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {/* what state the money is genuinely in — a gateway refund is never reported as arrived until SSLCommerz says it has */}
                              <p className={`text-xs font-bold ${tone.text}`}>
                                {refundStateLabel(refund)}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {refund.refundNumber} · {refund.methodLabel} ·{" "}
                                {money(refund.amount)}
                              </p>
                              {refund.sslcommerzRefundId && (
                                // the gateway's own handle on this refund
                                <p className="mt-0.5 text-[11px] text-slate-600">
                                  SSLCommerz ref: {refund.sslcommerzRefundId}
                                </p>
                              )}
                              {(refund.failureReason ||
                                refund.rejectionReason) && (
                                <p className="mt-0.5 text-[11px] text-red-600">
                                  {refund.failureReason ||
                                    refund.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {refund.awaitsApproval && (
                            // the decision that actually releases the money
                            <div className="mt-3">
                              {/* Approving a gateway refund does not pay it — it hands the payment to SSLCommerz, who do. */}
                              {refund.method === "ORIGINAL_PAYMENT" && (
                                <p className="mb-2 text-[11px] leading-relaxed text-slate-600">
                                  Approving sends this to SSLCommerz — the refund
                                  will be given by SSLCommerz and may take up to 3
                                  days to reach the customer.
                                </p>
                              )}
                              <div className="flex gap-2">
                              <button
                                disabled={isApprovingRefund}
                                onClick={() => confirmRefund(refund)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-700 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-60"
                              >
                                <CheckCircle2 size={13} /> Approve Refund
                              </button>
                              <button
                                disabled={isRejectingRefund}
                                onClick={() => {
                                  setRejectingRefund(refund);
                                  setRejectReason("");
                                }}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle size={13} /> Reject Refund
                              </button>
                              </div>
                            </div>
                          )}

                          {rejectingRefund?.id === refund.id && (
                            // a rejection has to say why — the customer is told
                            <div className="mt-3">
                              <textarea
                                value={rejectReason}
                                onChange={(e) =>
                                  setRejectReason(e.target.value)
                                }
                                rows={2}
                                placeholder="Why is this refund being rejected? The customer sees this."
                                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 outline-none focus:border-red-400"
                              />
                              <div className="mt-2 flex gap-2">
                                <button
                                  disabled={
                                    isRejectingRefund || !rejectReason.trim()
                                  }
                                  onClick={submitRefundRejection}
                                  className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  Confirm Rejection
                                </button>
                                <button
                                  onClick={() => setRejectingRefund(null)}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {refund.status === "PROCESSING" &&
                            refund.method === "ORIGINAL_PAYMENT" && (
                              // only SSLCommerz can complete this one
                              <div className="mt-3">
                                <p className="mb-2 text-[11px] leading-relaxed text-slate-600">
                                  The refund will be given by SSLCommerz to the
                                  customer's original payment method. It may take
                                  up to 3 days, and is only complete once
                                  SSLCommerz confirms it.
                                </p>
                                <button
                                  disabled={isSyncingRefund}
                                  onClick={() => checkRefundStatus(refund)}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  <RefreshCcw size={12} /> Check status with
                                  gateway
                                </button>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collecting the goods. */}
              {selected.type === "Return" &&
                ["Approved", "Completed"].includes(selected.status) &&
                (selectedPickup || !selected.receivedAt) && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-purple-600">
                      <Bike size={13} /> Return Collection
                    </p>
                    {selectedPickup ? (
                      <>
                        <p className="text-xs font-semibold text-slate-700">
                          {selectedPickup.rider}
                          {selectedPickup.riderPhone
                            ? ` · ${selectedPickup.riderPhone}`
                            : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          Assigned {selectedPickup.assignedAt} ·{" "}
                          {toDeliveryStatus(selectedPickup.riderStatus)}
                          {selectedPickup.completedAt
                            ? ` · ${selectedPickup.completedAt}`
                            : ""}
                        </p>
                        {/* a declined or failed run leaves the order waiting for someone else, and says why it came back */}
                        {selectedPickup.riderStatus === "Failed" && (
                          <p className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-600">
                            {selectedPickup.rejectionReason ||
                              "The rider did not complete this collection."}{" "}
                            Assign another delivery man from Delivery Assignment.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-purple-700">
                        No delivery man assigned yet. Open{" "}
                        <span className="font-bold">Delivery Assignment</span> and
                        search <span className="font-bold">{selected.id}</span> to
                        send a rider for the returned item.
                      </p>
                    )}
                    {/* the trip is the tail of an order already paid for, not a second sale — the customer is charged nothing for it */}
                    <p className="mt-1.5 text-[11px] font-medium text-purple-600">
                      No delivery charge applies to a return collection.
                    </p>
                  </div>
                )}

              {/* Returned goods receipt. */}
              {awaitingGoods && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-bold tracking-wide text-amber-700 uppercase">
                    Returned Goods Not Yet Received
                  </p>
                  <p className="mb-3 text-xs text-amber-800">
                    Confirm once the {selected.qty} returned unit(s) are
                    physically back with you and inspected.
                  </p>

                  {receiveError && (
                    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      {receiveError}
                    </p>
                  )}

                  <p className="text-[11px] text-amber-800">
                    Stock is not changed by this. Adjust the product yourself in{" "}
                    <span className="font-bold">Inventory Management</span> —
                    returned goods are counted back in by hand.
                  </p>
                  <button
                    disabled={isReceiving}
                    onClick={submitReceipt}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    <PackageCheck size={13} /> Product Received
                  </button>
                </div>
              )}

              {selected.receivedAt && (
                // the goods are back with the admin; the shelf is their job
                <div className="flex items-start gap-2 rounded-xl bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                  <PackageCheck size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Product received by admin. Inventory is not updated
                    automatically — adjust the stock in Inventory Management.
                  </span>
                </div>
              )}

              {/* Amount breakdown. */}
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                  {isRefundRequest ? "Refund Information" : "Amount Information"}
                </p>
                {/* the three figures on one line — each is a single number, and stacking them cost the panel a block of height for nothing */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="text-[11px] text-green-700">
                      {isRefundRequest ? "Refund Amount" : "Amount"}
                    </p>
                    <p className="font-semibold text-slate-700">
                      {money(selected.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-green-700">Shipping Charge</p>
                    <p
                      className={`font-semibold ${shippingRefundable ? "text-slate-700" : "text-slate-600 line-through"}`}
                    >
                      {money(selected.shipping)}
                    </p>
                    {!shippingRefundable && (
                      <p className="text-[10px] text-green-600">
                        Excluded (Refund Settings)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-green-700">
                      {isRefundRequest ? "Total Refund" : "Total"}
                    </p>
                    <p className="text-base font-black text-green-700">
                      {money(refundTotal(selected))}
                    </p>
                  </div>
                </div>
              </div>

              {/* admin action form: approve/reject + note */}
              {!["Approved", "Rejected", "Completed"].includes(
                selected.status,
              ) && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-sm font-bold text-slate-800">
                    Admin Action
                  </p>

                  {actionError && (
                    // e.g. approved, but the replacement turned out to be unavailable
                    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      {actionError}
                    </p>
                  )}

                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Action *
                  </label>
                  {/* action dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen((o) => !o)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-green-700"
                    >
                      <span
                        className={
                          action
                            ? "font-medium text-slate-700"
                            : "text-slate-600"
                        }
                      >
                        {action || "Select Action"}
                      </span>
                      <ChevronDown size={15} className="text-slate-600" />
                    </button>
                    {/* dropdown options */}
                    {actionMenuOpen && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                        <button
                          onClick={() => {
                            setAction(decisionLabels.approve);
                            setActionMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-green-700 hover:bg-green-50"
                        >
                          <Check size={15} />
                          {decisionLabels.approve}
                        </button>
                        <button
                          onClick={() => {
                            setAction(decisionLabels.reject);
                            setActionMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                        >
                          <X size={15} />
                          {decisionLabels.reject}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* admin note textarea */}
                  <label className="mb-1 mt-4 block text-xs font-semibold text-slate-700">
                    Admin Note
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder="Write admin note here..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-green-700"
                  />
                  <p className="mt-1 text-right text-[11px] text-slate-600">
                    {adminNote.length}/500
                  </p>

                  {/* cancel / submit buttons */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={closeDetails}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!action}
                      onClick={submitAction}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
              </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* delete request modal */}
      {deletingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* confirm header */}
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-800">
                Delete Request
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Are you sure you want to delete {deletingReq.id}? This action
                cannot be undone.
              </p>
            </div>
            {/* cancel / confirm buttons */}
            <div className="flex items-center gap-3 px-6 py-4">
              <button
                onClick={() => setDeletingReq(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete issue report modal */}
      {deletingIssueReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* confirm header */}
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-800">
                Delete Issue Report
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Are you sure you want to delete this issue report for{" "}
                {deletingIssueReport.orderId}? This action cannot be undone.
              </p>
            </div>
            {/* cancel / confirm buttons */}
            <div className="flex items-center gap-3 px-6 py-4">
              <button
                onClick={() => setDeletingIssueReport(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingIssueReport}
                onClick={confirmDeleteIssueReport}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingIssueReport ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* quick action: return & refund policy reference */}
      {quickPanel === "policy" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* modal header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Return &amp; Refund Policy
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    The same rules customers see in their dashboard — use these
                    when reviewing a request.
                  </p>
                </div>
              </div>
              {/* close button */}
              <button
                onClick={() => setQuickPanel(null)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            {/* policy body */}
            <div className="scrollbar-overlay flex-1 overflow-y-auto bg-slate-50 p-6">
              <ReturnPolicyContent showHeader={false} />
            </div>
            {/* modal footer */}
            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setQuickPanel(null)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* quick action: manage the customer-facing reason list */}
      {quickPanel === "reasons" && (
        <ManageReasonsModal onClose={() => setQuickPanel(null)} />
      )}

      {/* quick action: refund presentation defaults */}
      {quickPanel === "settings" && (
        <RefundSettingsModal onClose={() => setQuickPanel(null)} />
      )}

      {/* photo preview overlay, same viewer the customer photos use */}
      {previewPhoto && (
        <PhotoViewer photos={[previewPhoto]} onClose={() => setPreviewPhoto(null)} />
      )}
    </AdminLayout>
  );
};

export default ReturnRefundManagement;
