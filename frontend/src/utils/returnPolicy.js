
// Reasons a return is accepted
export const ELIGIBLE_REASONS = [
  "Wrong product delivered",
  "Damaged or leaking product",
  "Expired product",
  "Missing item",
  "Incorrect quantity or weight",
  "Product quality significantly below the advertised standard",
];

// reasons a return is rejected
export const NOT_ELIGIBLE_REASONS = [
  "Customer simply changed their mind",
  "Product has been consumed or partially used",
  "Product was stored improperly after delivery",
  "Complaint submitted after the allowed time",
  "Minor natural variations in size, color, or shape of fresh produce",
];

// cases a refund is granted in — mirrors isRefundEligible in utils/orderStatus.js
export const REFUND_ELIGIBLE_CASES = [
  "Order cancelled by you before it was assigned to a rider",
  "Payment was already completed online (SSLCommerz)",
  "An approved return whose refund the admin has authorised",
];

// cases no refund is issued in
export const REFUND_NOT_ELIGIBLE_CASES = [
  "Cash on delivery orders — nothing was paid in advance",
  "Order already picked up, out for delivery, or delivered",
  "Order cancelled by the admin or the delivery rider",
  "Payment never completed or still pending",
];

// return request time window rules
export const TIME_WINDOWS = [
  {
    title: "Fresh Vegetables, Meat & Fish",
    rule: "Return request must be submitted within 2 hours of delivery.",
    note: "Requests made after this window will not be accepted.",
  },
  {
    title: "All Other Products",
    rule: "Return request must be submitted within 7 days of delivery, only if there is a genuine problem with the product.",
    note: "Requests made after this window will not be accepted.",
  },
];
