import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../../../features/auth/authSlice";

// Reset password page: set a new password using the token from the code step
const ResetPassword = () => {
  // Router helpers
  const navigate = useNavigate();
  const location = useLocation();
  const { email, token } = location.state || {}; // passed from forgot-password flow

  const [showPassword, setShowPassword] = useState(false); // toggle new password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // toggle confirm password visibility
  // New password and its confirmation
  const [formData, setFormData] = useState({
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState(""); // form error banner text
  const [success, setSuccess] = useState(""); // success banner text

  const [resetPassword, { isLoading }] = useResetPasswordMutation(); // submit new password mutation

  // update form field by input name
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await resetPassword({ email, token, ...formData }).unwrap();
      setSuccess("Password reset successfully. Redirecting to sign in...");
      setTimeout(() => navigate("/login"), 1500); // brief delay before redirect
    } catch (err) {
      setError(
        err?.data?.message || "Something went wrong. Please try again."
      );
    }
  };

  // invalid/expired reset session
  if (!email || !token) {
    return (
      // fallback screen when session data is missing
      <div className="bg-white font-sans text-gray-800 m-0 min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-gray-600 mb-4">
          Your reset session is invalid or has expired.
        </p>
        {/* link back to start the flow again */}
        <Link
          to="/forgot-password"
          className="text-orange-500 font-bold hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white font-sans text-gray-800 m-0 min-h-screen">
      {/* back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 flex items-center text-gray-500 hover:text-orange-500 transition"
      >
        {/* circular back arrow icon */}
        <div className="bg-gray-100 p-2 rounded-full hover:bg-orange-50 transition">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="ml-2 font-medium hidden sm:block">Back</span>
      </button>

      <main className="flex flex-col items-center justify-center py-16 px-4">
        {/* page header icon + title */}
        <div className="flex items-center mb-10 mt-6">
          {/* orange lock icon badge */}
          <div className="bg-orange-500 p-4 rounded-2xl mr-4">
            <Lock className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-700">
              Reset Password
            </h2>
            <p className="text-sm text-gray-500">
              Set a new password for {email}
            </p>
          </div>
        </div>

        {/* new password form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 md:p-6 rounded-xl shadow-xl border flex flex-col gap-4 max-w-sm w-full"
        >
          {/* form error banner */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {/* success banner */}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          {/* password fields */}
          <div className="space-y-3">
            {/* new password input */}
            <div className="relative">
              <Lock className="absolute left-4 top-3 w-5 h-5 text-green-700" />
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-12 pr-10 py-2.5 border rounded-xl bg-gray-50"
                placeholder="New Password"
                type={showPassword ? "text" : "password"}
              />
              {/* show/hide password toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* confirm password input */}
            <div className="relative">
              <Lock className="absolute left-4 top-3 w-5 h-5 text-green-700" />
              <input
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-12 pr-10 py-2.5 border rounded-xl bg-gray-50"
                placeholder="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
              />
              {/* show/hide confirm password toggle */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3 text-gray-400"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-2.5 mt-3 rounded-xl font-bold text-sm disabled:opacity-60"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ResetPassword;
