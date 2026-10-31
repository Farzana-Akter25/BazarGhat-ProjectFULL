// Status filter options on the customer order list
export const CUSTOMER_STATUS_FILTERS = [
  "All Status",
  "Pending",
  "Processing",
  "Confirmed",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Customer Rejected at Doorstep",
  "Return Approved",
  "Return Pickup Assigned",
  "Returned",
];


// Statuses from which a return pickup can be assigned
export const RETURN_PICKUP_ASSIGNABLE_STATUSES = ["Return Approved"];

// True if a return pickup can be assigned from this status
export const isReturnPickupAssignable = (rawStatus) =>
  RETURN_PICKUP_ASSIGNABLE_STATUSES.includes(rawStatus);

// Admin order list uses the same filter options
export const ADMIN_STATUS_FILTERS = CUSTOMER_STATUS_FILTERS;


// Statuses in which the customer / admin may still cancel
export const CUSTOMER_CANCELLABLE_STATUSES = ["Pending", "Processing", "Confirmed"];
export const ADMIN_CANCELLABLE_STATUSES = ["Pending", "Processing", "Confirmed", "Assigned", "Picked Up", "Customer Rejected at Doorstep"];

// Cancel permission checks
export const canCustomerCancelOrder = (rawStatus) => CUSTOMER_CANCELLABLE_STATUSES.includes(rawStatus);
export const canAdminCancelOrder = (rawStatus) => ADMIN_CANCELLABLE_STATUSES.includes(rawStatus);


export const DELETABLE_ORDER_STATUSES = ["Delivered", "Cancelled"];
// True if the customer may delete this order
export const canCustomerDeleteOrder = (rawStatus) => DELETABLE_ORDER_STATUSES.includes(rawStatus);


// True for a customer-cancelled, paid online order (can ask for a refund)
export const isRefundEligible = (order) =>
  order.status === "Cancelled" &&
  order.cancelledBy === "customer" &&
  order.paymentMethod === "SSLCommerz" &&
  order.paymentStatus === "Paid";

// Status filter options on the delivery man's order list
export const DELIVERY_STATUS_FILTERS = [
  "All",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Return Picked Up",
  "Customer Rejected at Doorstep",
  "Rejected",
];

// Status labels shown to customers and admins (same as the raw status)
export const toCustomerStatus = (rawStatus) => rawStatus;
export const toAdminStatus = (rawStatus) => rawStatus;


// Delivery men see "Failed" as "Rejected"
export const toDeliveryStatus = (rawStatus) => (rawStatus === "Failed" ? "Rejected" : rawStatus);
