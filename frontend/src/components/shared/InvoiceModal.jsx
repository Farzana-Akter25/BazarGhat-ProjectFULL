import { AlertTriangle, FileDown, Printer, X } from "lucide-react"; // action icons
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "../../utils/formatDate";
import { downloadInvoicePdf } from "../../utils/invoicePdf"; // builds + saves the invoice PDF
import OrderStatusBadge from "./OrderStatusBadge"; // order status pill
import PaymentStatusBadge from "./PaymentStatusBadge"; // payment status pill

// company info block
const COMPANY = {
  name: "BazarGhat", // shown in header
  address: "Uttara, Dhaka, Bangladesh",
  phone: "01947938237",
  email: "support@bazarghat.com",
};

// currency formatter
const money = (n) => `৳${Number(n || 0).toLocaleString()}.00`;


// Readable error message for a failed invoice load
const errorMessage = (error) =>
  error?.data?.message ||
  (error?.status === 404
    ? "No invoice has been generated for this order yet."
    : "Could not load this invoice. Please try again.");

// Popup showing an invoice with print and PDF download
const InvoiceModal = ({ invoice, isLoading, error, onClose, autoPrint = false }) => {
  const hasAutoPrinted = useRef(false); // guards against printing more than once

  // auto-triggers print dialog once invoice is loaded
  useEffect(() => {
    if (autoPrint && invoice && !isLoading && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoPrint, invoice, isLoading]);

  
  // Add a page class while the popup is open (used by print styles)
  useEffect(() => {
    document.body.classList.add("invoice-modal-open");

    return () => document.body.classList.remove("invoice-modal-open");
  }, []);

  
  // Use the invoice number as the page title (becomes the print file name)
  useEffect(() => {
    if (!invoice?.id) {
      return;
    }

    const previousTitle = document.title;
    document.title = `Invoice-${invoice.id}`;

    return () => {
      document.title = previousTitle;
    };
  }, [invoice?.id]);

  // Rendered outside the page tree so the print rule can hide #root wholesale while this stays visible.
  return createPortal(
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:static print:bg-white print:p-0">
      {/* invoice modal card */}
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* print/download + close buttons, hidden when printing */}
        <div className="flex items-center justify-end gap-2 p-3 print:hidden">
          {!isLoading && invoice && (
            <>
              {/* writes the PDF here and downloads it, so saving never depends on the browser's print dialog and its OS save window */}
              <button
                onClick={() => downloadInvoicePdf(invoice)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                title="Download this invoice as a PDF file"
              >
                <FileDown size={14} />
                Download PDF
              </button>
              {/* triggers the browser print dialog, for printing on paper */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                title="Print this invoice"
              >
                <Printer size={14} />
                Print
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {!isLoading && !invoice && error ? (
          // the fetch finished and came back empty — say why, rather than leaving the reader on a loading line that will never resolve
          <div className="px-6 py-8 text-center">
            <AlertTriangle size={26} className="mx-auto mb-2 text-red-500" />
            <p className="text-sm font-semibold text-slate-800">
              {errorMessage(error)}
            </p>
          </div>
        ) : isLoading || !invoice ? (
          // loading state text
          <p className="py-8 text-center text-sm text-slate-600">Loading invoice...</p>
        ) : (
          <div className="px-6 pb-6 sm:px-10 sm:pb-10 print:px-0 print:pb-0">
            {/* invoice header: company + invoice no */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                {/* company name */}
                <h1 className="text-2xl font-black tracking-tight text-orange-500 sm:text-3xl">
                  {COMPANY.name}
                </h1>
                {/* company contact info */}
                <div className="mt-1.5 text-xs text-slate-600">
                  <p>{COMPANY.address}</p>
                  <p>
                    {COMPANY.phone} | {COMPANY.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {/* "invoice" label */}
                <h2 className="text-lg font-black tracking-widest text-slate-700 uppercase sm:text-xl">
                  Invoice
                </h2>
                {/* invoice number */}
                <p className="text-lg font-bold text-slate-800">#{invoice.id}</p>
              </div>
            </div>

            {/* order and customer info */}
            <div className="grid grid-cols-2 gap-6 py-6">
              {/* order details column */}
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                  Order Details
                </p>
                <div className="space-y-0.5 text-sm text-slate-700">
                  {/* order number */}
                  <p>
                    <span className="font-semibold">Order No:</span> {invoice.orderId}
                  </p>
                  {/* invoice date */}
                  <p>
                    <span className="font-semibold">Invoice Date:</span> {formatDate(invoice.invoiceDate)}
                  </p>
                  {/* order status badge row, only when the order status is known */}
                  {invoice.orderStatus && (
                    <p className="flex items-center gap-1.5">
                      <span className="font-semibold">Order Status:</span>{" "}
                      <OrderStatusBadge status={invoice.orderStatus} />
                    </p>
                  )}
                  {/* payment status badge row */}
                  <p className="flex items-center gap-1.5">
                    <span className="font-semibold">Payment Status:</span>{" "}
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </p>
                  {/* payment method */}
                  <p>
                    <span className="font-semibold">Payment Method:</span> {invoice.paymentMethod}
                  </p>
                  {/* transaction id, only if present */}
                  {invoice.transactionId && (
                    <p>
                      <span className="font-semibold">Transaction ID:</span> {invoice.transactionId}
                    </p>
                  )}
                </div>
              </div>
              {/* customer info column */}
              <div className="text-right">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                  Customer Information
                </p>
                {/* customer name */}
                <h3 className="text-base font-bold text-slate-900">{invoice.customer}</h3>
                <div className="text-sm text-slate-600">
                  {/* customer phone, optional */}
                  {invoice.phone && <p>{invoice.phone}</p>}
                  {/* shipping address, optional */}
                  {invoice.shippingAddress && <p>{invoice.shippingAddress}</p>}
                </div>
                {/* assigned delivery man, only once the order has one */}
                {invoice.deliveryMan && (
                  <div className="mt-4">
                    <p className="mb-1 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                      Delivery Man
                    </p>
                    <p className="text-sm font-bold text-slate-900">{invoice.deliveryMan.name}</p>
                    {invoice.deliveryMan.phone && (
                      <p className="text-sm text-slate-600">{invoice.deliveryMan.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* line items table */}
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                {/* table column headers */}
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold tracking-widest text-black uppercase">
                    <th className="p-3.5 text-left">Product</th>
                    <th className="p-3.5 text-center">Qty</th>
                    <th className="p-3.5 text-right">Unit Price</th>
                    <th className="p-3.5 text-right">Discount</th>
                    <th className="p-3.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                {/* line item rows */}
                <tbody>
                  {invoice.items.map((item, idx) => (
                    // single line item row
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="p-3.5 text-left font-semibold text-slate-700">
                        {item.name}
                        {/* pack size, so "Dates" reads as the 1kg pack it was sold as */}
                        {item.unit && (
                          <span className="block text-xs font-normal text-slate-600">{item.unit}</span>
                        )}
                      </td>
                      {/* quantity spelled out with its unit, never a bare number */}
                      <td className="p-3.5 text-center text-slate-700">
                        {item.unit ? `${item.qty} × ${item.unit}` : item.qty}
                      </td>
                      <td className="p-3.5 text-right text-slate-700">{money(item.price)}</td>
                      <td className="p-3.5 text-right text-slate-700">{money(item.discount)}</td>
                      <td className="p-3.5 text-right font-semibold text-slate-700">
                        {money(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* totals summary */}
            <div className="space-y-1.5 pt-5 text-right text-sm text-slate-700">
              {/* subtotal line */}
              <p>Subtotal: {money(invoice.subtotal)}</p>
              {/* discount line, only if applied */}
              {invoice.discount > 0 && <p>Coupon / Discount: -{money(invoice.discount)}</p>}
              {/* delivery charge line, free if zero */}
              <p>Delivery Charge: {invoice.delivery > 0 ? money(invoice.delivery) : "Free"}</p>
              
              {invoice.walletAmount > 0 && (
                <>
                  <p className="text-green-700">
                    Refund Wallet Used: -{money(invoice.walletAmount)}
                  </p>
                  {/* the rest, when the wallet did not cover the whole order */}
                  {invoice.gatewayAmount > 0 && (
                    <p>
                      {invoice.paymentMethod === "Cash on Delivery"
                        ? "Cash on Delivery"
                        : `Paid via ${invoice.paymentMethod}`}
                      : {money(invoice.gatewayAmount)}
                    </p>
                  )}
                </>
              )}
              
              {invoice.refundedAmount > 0 && (
                <p className="font-semibold text-purple-600">
                  Refunded to Customer: -{money(invoice.refundedAmount)}
                </p>
              )}
            </div>

            {/* grand total row */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 py-5">
              {/* grand total label */}
              <span className="text-xs font-bold tracking-[3px] text-slate-700 uppercase">
                Grand Total
              </span>
              {/* grand total amount */}
              <span className="text-3xl font-black text-slate-900">{money(invoice.amount)}</span>
            </div>

            {/* thank you footer note */}
            <p className="text-center text-sm font-medium text-slate-600">
              Thank you for shopping with {COMPANY.name} ❤️
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default InvoiceModal; // invoice preview/print modal, used across admin + customer views
