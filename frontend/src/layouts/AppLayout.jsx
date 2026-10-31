import { Outlet, useLocation } from "react-router-dom"; // routed content slot + current route hook
import Header from "../components/layout/Header"; // global site header

// pages without the site header
const NO_HEADER_PATHS = ["/login", "/register", "/checkout"]; // routes that hide the header

// panels that render their own sidebar instead of the site header
const NO_HEADER_PREFIXES = [
  "/admindashboard", // admin panel
  "/admin/", // admin panel sub pages
  "/customer-dashboard", // customer panel
  "/deliverydashboard", // delivery man panel
];

// Shows the site header on normal pages and hides it on login/checkout/dashboards
const AppLayout = () => {
  const location = useLocation(); // current url
  // Hide the header on these pages
  const hideHeader =
    NO_HEADER_PATHS.includes(location.pathname) || // exact match routes
    NO_HEADER_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)); // panel routes

  return (
    <>
      {/* the site header */}
      {!hideHeader && <Header />}
      {/* routed page content */}
      <Outlet />
    </>
  );
};

export default AppLayout;
