import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-lg text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <p className="text-sm text-gray-500">
            The page may have been moved, deleted, or you may have entered an
            incorrect URL.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoHome}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to {isAuthenticated ? "Dashboard" : "Login"}
            </button>
            <button
              onClick={handleGoBack}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </button>
          </div>
        </div>

        {/* Additional info for authenticated users */}
        {isAuthenticated && (
          <div className="mt-8 text-xs text-gray-500">
            You may not have permission to access this page, or it may not
            exist.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;
