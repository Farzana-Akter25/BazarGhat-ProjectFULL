
// Admins and delivery men are sent to their dashboard instead of the cart
export const ROLE_DASHBOARD_REDIRECT = {
  admin: "/admindashboard",
  delivery: "/deliverydashboard",
};

// Where to send this role instead of the cart (null for customers)
export const getCartRedirectForRole = (role) => ROLE_DASHBOARD_REDIRECT[role] || null;
