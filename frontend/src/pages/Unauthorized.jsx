import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getRoleDisplayName } from "../utils/roleBasedNavigation";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-lg text-gray-600">
            You don't have permission to access this page.
          </p>
          {user && (
            <div className="p-4 bg-gray-100rounded-lg">
              <p className="text-sm text-gray-600">
                Current Role:{" "}
                <span className="font-semibold text-gray-900">
                  {getRoleDisplayName(user.role)}
                </span>
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500">
            If you believe you should have access to this page, please contact
            your system administrator.
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
              Go to Dashboard
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
      </div>
    </div>
  );
};

export default Unauthorized;
