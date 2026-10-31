import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./formatDate";


// Shop details printed on the invoice
const SHOP_NAME = "BazarGhat";
const SHOP_ADDRESS = "Uttara, Dhaka, Bangladesh";
const SHOP_PHONE = "01947938237";
const SHOP_EMAIL = "support@bazarghat.com";
const BRAND_COLOR = [255, 122, 0]; // #ff7a00

// jsPDF's built-in fonts don't carry the Bengali Taka glyph, so the file uses "Tk"
const money = (n) => `Tk ${Number(n || 0).toLocaleString()}.00`;


// Build an invoice PDF and download it
export function downloadInvoicePdf(invoice) {
  // Nothing to print
  if (!invoice) {
    return;
  }

  // New A4 document measured in points, with 40pt side margins
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  // Page width and left/right margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  const right = pageWidth - 40;

  // shop identity, top left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(SHOP_NAME, left, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(SHOP_ADDRESS, left, 72);
  doc.text(`${SHOP_PHONE} | ${SHOP_EMAIL}`, left, 85);

  // invoice number, top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("INVOICE", right, 52, { align: "right" });
  doc.setFontSize(12);
  doc.text(`#${invoice.id}`, right, 70, { align: "right" });

  // Divider line under the header
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.5);
  doc.line(left, 100, right, 100);

  // order details on the left, customer on the right
  const orderLines = [
    `Order No: ${invoice.orderId}`,
    `Invoice Date: ${formatDate(invoice.invoiceDate)}`,
    `Order Status: ${invoice.orderStatus}`,
    `Payment Status: ${invoice.paymentStatus}`,
    `Payment Method: ${invoice.paymentMethod}`,
  ];
  if (invoice.transactionId) {
    orderLines.push(`Transaction ID: ${invoice.transactionId}`);
  }

  // Customer name, phone and address
  const customerLines = [
    invoice.customer,
    invoice.phone,
    invoice.shippingAddress,
  ].filter(Boolean);

  // assigned delivery man, only once the order has one
  if (invoice.deliveryMan) {
    customerLines.push(
      "",
      `Delivery Man: ${invoice.deliveryMan.name}`,
      ...(invoice.deliveryMan.phone ? [invoice.deliveryMan.phone] : []),
    );
  }

  // Section headings
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("ORDER DETAILS", left, 122);
  doc.text("CUSTOMER INFORMATION", right, 122, { align: "right" });

  // Print both columns line by line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45, 45, 45);
  orderLines.forEach((line, index) => doc.text(line, left, 140 + index * 15));
  customerLines.forEach((line, index) =>
    doc.text(String(line), right, 140 + index * 15, { align: "right" }),
  );

  // Where the details block ends
  const detailsBottom = 140 + Math.max(orderLines.length, customerLines.length) * 15;

  
  // Table of ordered items
  autoTable(doc, {
    startY: detailsBottom + 16,
    margin: { left, right: 40 },
    theme: "grid",
    head: [["Product", "Pack Size", "Qty", "Unit Price", "Discount", "Subtotal"]],
    body: (invoice.items ?? []).map((item) => [
      item.name,
      item.unit || "-",
      String(item.qty),
      money(item.price),
      money(item.discount),
      money(item.lineTotal),
    ]),
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [228, 228, 228],
      lineWidth: 0.5,
      textColor: [55, 55, 55],
      valign: "middle",
      overflow: "linebreak",
    },
    
    columnStyles: {
      0: { cellWidth: 152, halign: "left" },
      1: { cellWidth: 66, halign: "center" },
      2: { cellWidth: 44, halign: "center" },
      3: { cellWidth: 85, halign: "right" },
      4: { cellWidth: 75, halign: "right" },
      5: { cellWidth: 93, halign: "right", fontStyle: "bold" },
    },
  });

  
  // Right-aligned label and value columns for the totals
  const valueRight = right;
  const labelRight = right - 110;
  let y = doc.lastAutoTable.finalY + 26;

  
  // Move to a new page if the totals would not fit
  const totalsHeight = 150;
  if (y + totalsHeight > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 60;
  }

  // Print one "label: value" totals line and move down
  const totalLine = (label, value, color = [70, 70, 70]) => {
    doc.setTextColor(...color);
    doc.text(label, labelRight, y, { align: "right" });
    doc.text(value, valueRight, y, { align: "right" });
    y += 17;
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  // Subtotal, discount, delivery, wallet and refund lines
  totalLine("Subtotal:", money(invoice.subtotal));
  if (invoice.discount > 0) {
    totalLine("Coupon / Discount:", `-${money(invoice.discount)}`);
  }
  totalLine(
    "Delivery Charge:",
    invoice.delivery > 0 ? money(invoice.delivery) : "Free",
  );
  if (invoice.walletAmount > 0) {
    totalLine("Refund Wallet Used:", `-${money(invoice.walletAmount)}`, [21, 128, 61]);
    // the rest, when the wallet did not cover the whole order
    if (invoice.gatewayAmount > 0) {
      totalLine(
        invoice.paymentMethod === "Cash on Delivery"
          ? "Cash on Delivery:"
          : `Paid via ${invoice.paymentMethod}:`,
        money(invoice.gatewayAmount),
      );
    }
  }
  if (invoice.refundedAmount > 0) {
    totalLine("Refunded to Customer:", `-${money(invoice.refundedAmount)}`, [147, 51, 234]);
  }

  // grand total band, ruled off from the lines above it
  y += 6;
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.8);
  doc.line(left, y, right, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text("GRAND TOTAL", left, y);
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(money(invoice.amount), valueRight, y + 2, { align: "right" });

  y += 16;
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);

  // Thank-you line at the bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(`Thank you for shopping with ${SHOP_NAME}`, pageWidth / 2, y + 34, {
    align: "center",
  });

  // Save the file as Invoice-<number>.pdf
  doc.save(`Invoice-${invoice.id}.pdf`);
}
