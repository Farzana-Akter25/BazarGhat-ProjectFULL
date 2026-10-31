
// Build a customer / delivery dashboard link that opens a given tab
const customerTab = (tab) => `/customer-dashboard?tab=${tab}`;
const deliveryTab = (tab) => `/deliverydashboard?tab=${tab}`;

// Page to open for each notification type (customer)
const CUSTOMER_TARGETS = {
  order: () => customerTab("orders"),
  refund: () => customerTab("returns"),
  return: () => customerTab("returns"),
  complaint: () => customerTab("complaints"),
  // The balance lives on the profile panel, next to the account details.
  wallet: () => customerTab("profile"),
};

// Page to open for each notification type (delivery man)
const DELIVERY_TARGETS = {
  order: () => deliveryTab("assigned"),
  delivery_assignment: () => deliveryTab("assigned"),
  complaint: () => deliveryTab("complaints"),
};

// Page to open for each notification type (admin)
const ADMIN_TARGETS = {
  order: () => "/admin/orders",
  refund: () => "/admin/returns-refunds",
  return: () => "/admin/returns-refunds",
  complaint: () => "/admin/complaints/customer",
  delivery_assignment: () => "/admin/delivery-assignment",
  product: () => "/admin/inventory",
};

// Lookup table per role
const BY_ROLE = {
  customer: CUSTOMER_TARGETS,
  delivery: DELIVERY_TARGETS,
  admin: ADMIN_TARGETS,
};

// Return the page a notification should open, or null if none
export const notificationTarget = (notification, role) => {
  // Pages for this role, and the builder for this notification type
  const targets = BY_ROLE[role];
  const build = targets?.[notification?.referenceType];

  return build ? build(notification) : null;
};

export default notificationTarget;
