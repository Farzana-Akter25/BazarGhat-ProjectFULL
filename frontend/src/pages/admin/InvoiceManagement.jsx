import {
  CircleCheck,
  Clock3,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Search as SearchIcon,
  Wallet,
} from "lucide-react"; // icon set for stat cards, search box and row actions
import { useMemo, useState } from "react";
import { formatDate } from "../../utils/formatDate";
import { shortId } from "../../utils/shortId";
import { Card, StatCard } from "../../components/admin/AdminUI"; // shared card + stat card shells
import InvoiceModal from "../../components/shared/InvoiceModal"; // view/print invoice popup
import PaymentStatusBadge from "../../components/shared/PaymentStatusBadge"; // paid/pending/unpaid pill
import {
  useGetInvoicesQuery,
  useLazyGetInvoiceQuery,
} from "../../features/admin/invoiceApi";
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import { TH } from "../../components/shared/DataTable"; // shared table header cell style
import {
  downloadBusinessReportExcel,
  downloadBusinessReportPdf,
} from "../../utils/businessReport"; // full business performance report exports
import { useLazyGetReportQuery } from "../../features/admin/reportApi";
import {
  getDefaultCustomRange,
  getPresetRange,
} from "../../utils/invoiceReport";

// filter option lists These are exactly the values InvoiceService::displayPaymentStatus() emits.
const PAYMENT_STATUS_FILTERS = [
  "All",
  "Paid",
  "Unpaid",
  "Partially Refunded",
  "Refund Pending",
  "Refunded",
]; // status dropdown options
// The method dropdown is built from the invoices themselves rather than a fixed list.
const DATE_RANGE_FILTERS = [
  "Today",
  "Last 7 Days",
  "Last 30 Days",
  "Custom Date Range",
]; // date dropdown options
// Date range selected when the page opens
const DEFAULT_DATE_RANGE = "Last 7 Days";

// currency formatter
const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

// Admin page listing invoices with filters, summaries and report downloads
const InvoiceManagement = () => {
  const [query, setQuery] = useState(""); // search box text
  const [paymentStatus, setPaymentStatus] = useState("All"); // status filter value
  const [paymentMethod, setPaymentMethod] = useState("All"); // method filter value
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE); // date range filter value
  const [customFrom, setCustomFrom] = useState(""); // custom range start
  const [customTo, setCustomTo] = useState(""); // custom range end

  // resolved {from, to} bounds sent to the backend for the selected preset
  const { from, to } = getPresetRange(dateRange, customFrom, customTo);

  const { data, isLoading } = useGetInvoicesQuery({ from, to }); // fetch invoice list for the selected range
  // Memoised so the derived lists below key off the fetched data rather than a fresh [] identity on every render.
  const invoices = useMemo(() => data?.invoices ?? [], [data]); // invoice rows
  // Summary numbers (zeros while loading)
  const summary = data?.summary ?? {
    total: 0,
    paid: 0,
    pendingUnpaid: 0,
    totalAmount: 0,
  }; // stat card totals

  const [fetchInvoice, { data: activeInvoice, isLoading: isInvoiceLoading, error: invoiceError }] =
    useLazyGetInvoiceQuery(); // fetch single invoice on demand
  const [modalMode, setModalMode] = useState(null); // "view" | "print" | null

  const [fetchReport] = useLazyGetReportQuery(); // business report, pulled on export
  const [isExporting, setIsExporting] = useState(false); // export in flight
  const [exportError, setExportError] = useState(""); // shown if the report can't be built

  // any active filter/search, used to change the empty state message
  const isSearchActive =
    query.trim() !== "" ||
    paymentStatus !== "All" ||
    paymentMethod !== "All" ||
    dateRange !== DEFAULT_DATE_RANGE;

  // Every method present in the loaded range, sorted, with "All" in front.
  const paymentMethodFilters = useMemo(() => {
    // Payment methods found in the list, for the filter
    const methods = [
      ...new Set(invoices.map((i) => i.paymentMethod).filter(Boolean)),
    ].sort((a, b) => {
      if (a === "Cash on Delivery") return 1;
      if (b === "Cash on Delivery") return -1;
      return a.localeCompare(b);
    });

    // A method selected before the range changed may no longer be present; keep it listed so the dropdown never shows a blank current value.
    if (paymentMethod !== "All" && !methods.includes(paymentMethod)) {
      methods.push(paymentMethod);
    }

    return ["All", ...methods];
  }, [invoices, paymentMethod]);

  // invoices filtered by search + status/method (date range is already applied server-side)
  const filtered = useMemo(
    () =>
      invoices.filter((i) => {
        // Keep invoices matching the search, payment status and payment method
        const matchesQuery =
          !query ||
          i.id.toLowerCase().includes(query.toLowerCase()) ||
          i.orderId.toLowerCase().includes(query.toLowerCase()) ||
          i.customer.toLowerCase().includes(query.toLowerCase());
        const matchesStatus =
          paymentStatus === "All" || i.paymentStatus === paymentStatus;
        const matchesMethod =
          paymentMethod === "All" || i.paymentMethod === paymentMethod;
        return matchesQuery && matchesStatus && matchesMethod;
      }),
    [invoices, query, paymentStatus, paymentMethod],
  );

  // switches the date range preset, seeding custom bounds the first time they're needed
  const selectDateRange = (value) => {
    setDateRange(value);
    if (value === "Custom Date Range" && !customFrom && !customTo) {
      // Fill the custom date inputs with the default range
      const defaults = getDefaultCustomRange();
      setCustomFrom(defaults.from);
      setCustomTo(defaults.to);
    }
  };

  // open the invoice modal (view + print/download from within) and fetch its data
  const openInvoice = (invoiceId) => {
    setModalMode("view");
    fetchInvoice(invoiceId);
  };

  // Which report the selected preset asks the backend for.
  const reportRequest = () => {
    if (dateRange === "Last 7 Days") return { reportType: "7_days" };
    if (dateRange === "Last 30 Days") return { reportType: "30_days" };
    return { reportType: "custom", startDate: from, endDate: to };
  };

  // Both exports pull the same report, so a PDF and an Excel of the same period can never disagree.
  const exportReport = async (download) => {
    if (isExporting || !from || !to) {
      return;
    }

    setExportError("");
    setIsExporting(true);

    try {
      // Fetch the business report for the chosen period, then download it
      const report = await fetchReport(reportRequest()).unwrap();
      download(report);
    } catch (err) {
      setExportError(
        err?.data?.message || "Could not build the report. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Download buttons are enabled only when a period is chosen and nothing is loading
  const canDownload = !isLoading && !isExporting && !!from && !!to;
  const handleDownloadPdf = () => exportReport(downloadBusinessReportPdf);
  const handleDownloadExcel = () => exportReport(downloadBusinessReportExcel);

  return (
    <AdminLayout
      title="Invoice Management"
      subtitle="View and manage all automatically generated invoices"
    >
      {/* summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* total invoices count */}
        <StatCard
          icon={FileText}
          iconBg="bg-blue-500"
          label="Total Invoices"
          value={summary.total}
        />
        {/* paid count */}
        <StatCard
          icon={CircleCheck}
          iconBg="bg-green-700"
          label="Paid"
          value={summary.paid}
        />
        {/* pending/unpaid count */}
        <StatCard
          icon={Clock3}
          iconBg="bg-orange-500"
          label="Pending / Unpaid"
          value={summary.pendingUnpaid}
        />
        {/* total invoiced amount */}
        <StatCard
          icon={Wallet}
          iconBg="bg-purple-500"
          label="Total Invoiced Amount"
          value={money(summary.totalAmount)}
        />
      </div>

      <Card className="mt-6">
        {/* search + filter bar */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* search box */}
          <div className="relative flex-1">
            {/* search icon inside input */}
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)} // update search text
              type="text"
              placeholder="Search by Invoice ID, Order ID or Customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* payment status filter */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)} // update status filter
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {/* status options */}
            {PAYMENT_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "Payment Status: All" : s}
              </option>
            ))}
          </select>
          {/* payment method filter */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)} // update method filter
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {/* method options */}
            {paymentMethodFilters.map((m) => (
              <option key={m} value={m}>
                {m === "All" ? "Payment Method: All" : m}
              </option>
            ))}
          </select>
          {/* date range filter */}
          <select
            value={dateRange}
            onChange={(e) => selectDateRange(e.target.value)} // update date range filter
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-green-700"
          >
            {/* date range options */}
            {DATE_RANGE_FILTERS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {/* report download buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={!canDownload}
              title="Download PDF"
              className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={15} />
              PDF
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={!canDownload}
              title="Download Excel"
              className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              Excel
            </button>
          </div>
          {/* export progress / failure, kept beside the buttons that caused it */}
          {isExporting && (
            <p className="text-xs font-medium text-slate-600">Building report...</p>
          )}
          {exportError && (
            <p className="text-xs font-medium text-red-600">{exportError}</p>
          )}
        </div>

        {/* custom date range inputs */}
        {dateRange === "Custom Date Range" && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* from date */}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)} // update range start
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-green-700"
              />
            </label>
            {/* to date */}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)} // update range end
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-green-700"
              />
            </label>
          </div>
        )}

        {/* invoices table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              {/* column headers */}
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Invoice ID</th>
                <th className={TH}>Order ID</th>
                <th className={TH}>Customer</th>
                <th className={TH}>Invoice Date</th>
                <th className={TH}>Payment Method</th>
                <th className={TH}>Payment Status</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* invoice rows */}
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  {/* invoice id cell — shortened, full number on hover */}
                  <td className="px-3 py-3 break-words font-semibold text-blue-500" title={i.id}>
                    {shortId(i.id)}
                  </td>
                  {/* order id cell — shortened, full number on hover */}
                  <td className="px-3 py-3 break-words font-semibold text-blue-500" title={i.orderId}>
                    {shortId(i.orderId)}
                  </td>
                  {/* customer name cell */}
                  <td className="px-3 py-3 break-words font-medium text-orange-500">
                    {i.customer}
                  </td>
                  {/* invoice date cell */}
                  <td className="px-3 py-3 break-words text-slate-700">{formatDate(i.invoiceDate)}</td>
                  {/* payment method cell */}
                  <td className="px-3 py-3 break-words text-slate-700">{i.paymentMethod}</td>
                  <td className="px-3 py-3 break-words">
                    {/* payment status badge */}
                    <PaymentStatusBadge status={i.paymentStatus} />
                  </td>
                  {/* amount cell, with what has gone back on a refunded invoice */}
                  <td className="px-3 py-3 break-words font-bold text-slate-800">
                    {money(i.amount)}
                    {i.refundedAmount > 0 && (
                      <span className="block text-xs font-semibold text-purple-600">
                        -{money(i.refundedAmount)} refunded
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 break-words">
                    {/* view action, opens the invoice with its own print/download control */}
                    <div className="flex items-center gap-2">
                      {/* view invoice button */}
                      <button
                        onClick={() => openInvoice(i.invoiceId)}
                        className="rounded-lg bg-orange-50 p-1.5 text-orange-500 hover:bg-orange-100"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* loading state row */}
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    Loading invoices...
                  </td>
                </tr>
              )}
              {/* empty state row */}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {/* empty state icon */}
                      <FileText size={28} className="mb-1 text-slate-500" />
                      {isSearchActive ? (
                        // no results for current filters
                        <p className="text-sm font-semibold text-slate-700">
                          No invoices match your search.
                        </p>
                      ) : (
                        <>
                          {/* no invoices at all yet */}
                          <p className="text-sm font-semibold text-slate-700">
                            No invoices available yet.
                          </p>
                          <p className="text-xs text-slate-600">
                            Invoices will appear automatically when orders are
                            confirmed.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* view/print invoice modal */}
      {modalMode && (
        <InvoiceModal
          invoice={activeInvoice}
          isLoading={isInvoiceLoading}
          error={invoiceError}
          autoPrint={modalMode === "print"} // auto trigger print dialog
          onClose={() => setModalMode(null)}
        />
      )}
    </AdminLayout>
  );
};

export default InvoiceManagement;
