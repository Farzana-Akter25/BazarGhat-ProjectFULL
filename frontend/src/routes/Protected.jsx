import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Protected = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default Protected;
