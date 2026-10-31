import { Navigate, useLocation } from "react-router-dom"; // redirect + current route hook
import useAuth from "../hooks/useAuth.js"; // auth state hook
import { getCartRedirectForRole } from "../utils/cartAccess.js"; // role -> dashboard redirect lookup


// Guards the cart and checkout pages
const CartCheckoutGuard = ({ children, requireAuth = false }) => { // requireAuth: force login before checkout
  const { user, isAuthenticated } = useAuth(); // current user + login state
  const location = useLocation(); // current url, used to return here after login

  // bounce admin/delivery to their dashboard
  const roleRedirect = isAuthenticated ? getCartRedirectForRole(user?.role) : null; // dashboard path for staff roles
  if (roleRedirect) {
    return <Navigate to={roleRedirect} replace />; // staff role, skip cart/checkout
  }

  // require login for checkout only
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />; // bounce to login
  }

  return children; // render cart or checkout page
};

export default CartCheckoutGuard;
