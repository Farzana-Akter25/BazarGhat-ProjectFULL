import { Navigate, useLocation } from "react-router-dom"; // redirect + current route hook
import useAuth from "../hooks/useAuth.js"; // auth state hook
import { hasAccessToRoute } from "../utils/roleBasedNavigation.jsx"; // role -> route access check

// route guard by user role
const RoleProtected = ({
  children, // page content to render if allowed
  requiredRoles = [], // roles allowed on this route
  fallback = "/unauthorized", // where to send disallowed users
}) => {
  const { user, isAuthenticated } = useAuth(); // current user + login state
  const location = useLocation(); // current url, used to return here after login

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />; // bounce to login
  }

  // If no user data, show loading state
  if (!user) {
    // loading placeholder
    return <div>Loading...</div>;
  }

  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />; // wrong role, bounce to fallback
  }

  // Check if user has access to current route
  if (!hasAccessToRoute(location.pathname, user.role)) {
    return <Navigate to={fallback} replace />; // route not in role's allow-list
  }

  return children; // render the protected page
};

export default RoleProtected;
