import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  formatDate,
  formatDateTime as formatDateTimeValue,
} from "./formatDate";

// same brand identity used by the invoice report (invoiceReport.js) and the admin sidebar
const SHOP_NAME = "BazarGhat";
const SHOP_TAGLINE = "Fresh Groceries, Delivered Fast";
const BRAND_COLOR = [255, 122, 0]; // #ff7a00

// jsPDF's built-in fonts don't carry the Bengali Taka glyph (৳), so exports use "Tk" instead
const pdfMoney = (n) => `Tk ${Number(n || 0).toLocaleString()}`;

// day-month-year plus the clock time, matching the on-screen tables
const formatDateTime = (date) => formatDateTimeValue(date);

// yyyy-mm-dd stamp used in the generated file names
const fileStamp = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// shared page header: brand mark on the left, report title and meta on the right
function drawReportHeader(doc, title, subtitle) {
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(40, 32, 26, 26, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(SHOP_NAME[0], 53, 49, { align: "center" });

  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(18);
  doc.text(SHOP_NAME, 74, 45);

  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(SHOP_TAGLINE, 74, 54);

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 802, 42, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  if (subtitle) doc.text(subtitle, 802, 58, { align: "right" });
  doc.text(`Generated: ${formatDateTime(new Date())}`, 802, 70, { align: "right" });

  doc.setDrawColor(230, 230, 230);
  doc.line(40, 84, 802, 84);
}

// Print "Page X of Y" on every page
function drawFooter(doc, pageWidth) {
  // Number of pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - 40, 570, { align: "right" });
  }
}

// one-line description of the filters that produced the exported rows
export function describeFilters({ type, status, from, to, minAmount, maxAmount, resolution, refundStatus, query }) {
  // Collect one text part per active filter
  const parts = [];
  if (type && type !== "All Types") parts.push(`Type: ${type}`);
  if (status && status !== "All Status") parts.push(`Status: ${status}`);
  if (resolution && resolution !== "All Resolutions") parts.push(`Resolution: ${resolution}`);
  if (refundStatus && refundStatus !== "All Refund Stages") parts.push(`Refund: ${refundStatus}`);
  if (from) parts.push(`From: ${from}`);
  if (to) parts.push(`To: ${to}`);
  if (minAmount) parts.push(`Min: ${minAmount}`);
  if (maxAmount) parts.push(`Max: ${maxAmount}`);
  if (query) parts.push(`Search: "${query}"`);
  return parts.length ? parts.join("  |  ") : "No filters applied (all requests)";
}

// Column headings of the request export
const REQUEST_COLUMNS = [
  "Request ID",
  "Order ID",
  "Customer",
  "Type",
  "Product",
  "Reason",
  "Amount",
  "Shipping",
  "Total",
  "Status",
  "Resolution",
  "Refund Stage",
  "Date",
];


// Refund total of a request: amount plus shipping (when shipping is refundable)
export const refundTotalOf = (r, shippingRefundable = true) =>
  r.amount + (shippingRefundable ? r.shipping : 0);

// Turn one request into a row of export cells
const toRequestRow = (r, shippingRefundable) => [
  r.id,
  r.orderId,
  r.customer,
  r.type,
  r.product,
  r.reason,
  r.amount,
  r.shipping,
  refundTotalOf(r, shippingRefundable),
  r.status,
  r.resolution || "—",
  r.refundStatus || "—",
  `${formatDate(r.date)} ${r.time}`,
];

// exports the request list exactly as it is currently filtered on screen
export function downloadReturnRequestsPdf(rows, filterSummary, shippingRefundable = true) {
  // landscape: thirteen columns don't fit a portrait page legibly
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  drawReportHeader(doc, "Return & Refund Requests", filterSummary);

  autoTable(doc, {
    startY: 100,
    margin: { left: 40, right: 40 },
    head: [REQUEST_COLUMNS],
    body: rows.map((r) => {
      // Row cells for this request
      const cells = toRequestRow(r, shippingRefundable);
      // money columns render as Tk strings in the PDF
      return cells.map((c, i) => ([6, 7, 8].includes(i) ? pdfMoney(c) : String(c)));
    }),
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 7.5, cellPadding: 3 },
  });

  // Totals under the table
  let y = doc.lastAutoTable.finalY + 20;
  // Sum of the exported requests
  const totalAmount = rows.reduce((sum, r) => sum + refundTotalOf(r, shippingRefundable), 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`Requests exported: ${rows.length}`, 40, y);
  doc.text(`Combined value: ${pdfMoney(totalAmount)}`, 40, (y += 16));

  drawFooter(doc, 842);
  doc.save(`Return-Refund-Requests-${fileStamp()}.pdf`);
}

// Export the filtered request list as an Excel file
export function downloadReturnRequestsExcel(rows, filterSummary, shippingRefundable = true) {
  // New workbook
  const wb = XLSX.utils.book_new();

  // Header rows followed by the table
  const aoa = [
    [SHOP_NAME],
    [SHOP_TAGLINE],
    [],
    ["Return & Refund Requests"],
    ["Filters", filterSummary],
    ["Generated At", formatDateTime(new Date())],
    ["Requests Exported", rows.length],
    ["Shipping Included in Total", shippingRefundable ? "Yes" : "No"],
    [],
    REQUEST_COLUMNS,
    ...rows.map((r) => toRequestRow(r, shippingRefundable)),
  ];

  // Create the sheet and set column widths
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 26 }, { wch: 26 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, "Requests");

  XLSX.writeFile(wb, `Return-Refund-Requests-${fileStamp()}.xlsx`);
}


// Build refund report numbers from all requests
export function buildRefundReport(requests, shippingRefundable = true) {
  // Counters by status, reason, refund stage and type
  const byStatus = {};
  const byReason = {};
  const byRefundStage = {};
  const byType = { Return: 0, Refund: 0 };

  // Count every request into the right groups
  requests.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
    if (r.refundStatus && r.refundStatus !== "Not Applicable") {
      byRefundStage[r.refundStatus] = (byRefundStage[r.refundStatus] || 0) + 1;
    }
    if (byType[r.type] !== undefined) byType[r.type] += 1;
  });

  // Groups used for the totals
  const approved = requests.filter((r) => r.status === "Approved" || r.status === "Completed");
  const refundResolved = requests.filter((r) => r.resolution === "Refund");
  const replacementResolved = requests.filter((r) => r.resolution === "Replacement");
  // "Refunded" is the settled state written by the automatic gateway refund.
  const refundCompleted = requests.filter((r) =>
    ["Refunded", "Completed"].includes(r.refundStatus),
  );

  // Add up the refund totals of a list
  const sum = (list) => list.reduce((total, r) => total + refundTotalOf(r, shippingRefundable), 0);

  // Report data used by the PDF and Excel exports
  return {
    generatedAt: new Date(),
    shippingRefundable,
    totals: {
      requests: requests.length,
      returns: byType.Return,
      refunds: byType.Refund,
      approvedCount: approved.length,
      approvedValue: sum(approved),
      refundResolvedCount: refundResolved.length,
      refundResolvedValue: sum(refundResolved),
      replacementCount: replacementResolved.length,
      refundCompletedCount: refundCompleted.length,
      refundCompletedValue: sum(refundCompleted),
      pendingPayoutValue: sum(refundResolved) - sum(refundCompleted),
    },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byReason: Object.entries(byReason)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    byRefundStage: Object.entries(byRefundStage).map(([stage, count]) => ({ stage, count })),
    refundRows: refundResolved.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      customer: r.customer,
      amount: r.amount,
      shipping: r.shipping,
      total: refundTotalOf(r, shippingRefundable),
      stage: r.refundStatus || "—",
      payment: r.payment,
      date: formatDate(r.date),
    })),
  };
}

// Build the refund report PDF and download it
export function downloadRefundReportPdf(report) {
  // Landscape A4 document and the totals
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const { totals } = report;

  drawReportHeader(
    doc,
    "Refund Report",
    `All requests to date  |  Shipping ${report.shippingRefundable ? "included in" : "excluded from"} totals`,
  );

  // Summary numbers table
  autoTable(doc, {
    startY: 100,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [80, 80, 80] }, 1: { halign: "right" } },
    body: [
      ["Total Requests", String(totals.requests)],
      ["Return Requests", String(totals.returns)],
      ["Refund Requests", String(totals.refunds)],
      ["Approved / Completed", String(totals.approvedCount)],
      ["Approved Value", pdfMoney(totals.approvedValue)],
      ["Resolved as Replacement", String(totals.replacementCount)],
      ["Resolved as Refund", String(totals.refundResolvedCount)],
      ["Refund Value Committed", pdfMoney(totals.refundResolvedValue)],
      ["Refunds Paid Out", `${totals.refundCompletedCount} (${pdfMoney(totals.refundCompletedValue)})`],
      ["Refund Payout Outstanding", pdfMoney(totals.pendingPayoutValue)],
    ],
  });

  // "Requests by Status" table
  let y = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Requests by Status", 40, y);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    head: [["Status", "Requests"]],
    body: report.byStatus.map((s) => [s.status, String(s.count)]),
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 },
  });

  // "Top Reasons" table (first 10)
  y = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Top Reasons", 40, y);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    head: [["Reason", "Requests"]],
    body: report.byReason.slice(0, 10).map((r) => [r.reason, String(r.count)]),
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 },
  });

  // Extra page with every refund row, if there are any
  if (report.refundRows.length) {
    doc.addPage("a4", "landscape");
    drawReportHeader(doc, "Refund Report", "Refund payout detail");
    autoTable(doc, {
      startY: 100,
      margin: { left: 40, right: 40 },
      head: [["Request ID", "Order ID", "Customer", "Payment", "Amount", "Shipping", "Total", "Stage", "Date"]],
      body: report.refundRows.map((r) => [
        r.id,
        r.orderId,
        r.customer,
        r.payment,
        pdfMoney(r.amount),
        pdfMoney(r.shipping),
        pdfMoney(r.total),
        r.stage,
        r.date,
      ]),
      headStyles: { fillColor: BRAND_COLOR },
      styles: { fontSize: 8 },
    });
  }

  // Page numbers, then save the file
  drawFooter(doc, 842);
  doc.save(`Refund-Report-${fileStamp()}.pdf`);
}

// Build the refund report Excel file and download it
export function downloadRefundReportExcel(report) {
  const { totals } = report;
  const wb = XLSX.utils.book_new();

  // Summary sheet: totals, status, stage and reason counts
  const summaryRows = [
    [SHOP_NAME],
    [SHOP_TAGLINE],
    [],
    ["Refund Report"],
    ["Generated At", formatDateTime(report.generatedAt)],
    ["Shipping Included in Totals", report.shippingRefundable ? "Yes" : "No"],
    [],
    ["Metric", "Value"],
    ["Total Requests", totals.requests],
    ["Return Requests", totals.returns],
    ["Refund Requests", totals.refunds],
    ["Approved / Completed", totals.approvedCount],
    ["Approved Value (BDT)", totals.approvedValue],
    ["Resolved as Replacement", totals.replacementCount],
    ["Resolved as Refund", totals.refundResolvedCount],
    ["Refund Value Committed (BDT)", totals.refundResolvedValue],
    ["Refunds Paid Out", totals.refundCompletedCount],
    ["Refunds Paid Out Value (BDT)", totals.refundCompletedValue],
    ["Refund Payout Outstanding (BDT)", totals.pendingPayoutValue],
    [],
    ["Status", "Requests"],
    ...report.byStatus.map((s) => [s.status, s.count]),
    [],
    ["Refund Stage", "Requests"],
    ...report.byRefundStage.map((s) => [s.stage, s.count]),
    [],
    ["Reason", "Requests"],
    ...report.byReason.map((r) => [r.reason, r.count]),
  ];
  // Create the summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 32 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Second sheet: every refund row
  const refundRows = [
    ["Request ID", "Order ID", "Customer", "Payment", "Amount", "Shipping", "Total", "Stage", "Date"],
    ...report.refundRows.map((r) => [r.id, r.orderId, r.customer, r.payment, r.amount, r.shipping, r.total, r.stage, r.date]),
  ];
  // Create the refund payouts sheet
  const refundSheet = XLSX.utils.aoa_to_sheet(refundRows);
  refundSheet["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, refundSheet, "Refund Payouts");

  XLSX.writeFile(wb, `Refund-Report-${fileStamp()}.xlsx`);
}
