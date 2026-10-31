import { ArrowLeft, Eye, EyeOff, Home, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import notify from "../../../utils/notify"; // shared toast notifications
import { useLoginMutation } from "../../../features/auth/authSlice";
import { loginSuccess } from "../../../features/auth/authSlice";
import { apiSlice } from "../../../features/api/apiSlice";
import useAuth from "../../../hooks/useAuth";

// asModal renders the same form inside the header popup instead of as a full page.
const Login = ({ asModal = false, onClose, onSwitchToRegister }) => {
  // Router and Redux helpers
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth(); // committed auth state, drives the redirect

  const [showPassword, setShowPassword] = useState(false); // toggles password visibility
  const [formData, setFormData] = useState({ email: "", password: "" }); // login form values
  const [error, setError] = useState(""); // login failure message
  const [redirectTo, setRedirectTo] = useState(""); // where to go once login state is committed

  // Login API call
  const [login, { isLoading }] = useLoginMutation();

  // Redirect only after the store update has committed, otherwise the route guards still read isAuthenticated === false and bounce back to /login (which is why the button appeared to need a second click).
  useEffect(() => {
    if (redirectTo && isAuthenticated) {
      onClose?.(); // dismiss the popup before leaving, no-op on the full page
      navigate(redirectTo);
    }
  }, [redirectTo, isAuthenticated, navigate, onClose]);

  // generic input change handler
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // submit login, redirect by role
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Send email and password to the server
      const result = await login(formData).unwrap();
      // set the session first, so the cache reset refetches with the new token
      dispatch(loginSuccess({ user: result.user, token: result.token }));
      dispatch(apiSlice.util.resetApiState());
      notify.success("Welcome back");

      // per-role landing page after login
      const roleRedirects = {
        admin: "/admindashboard",
        customer: "/customer-dashboard",
        delivery: "/deliverydashboard",
      };
      // Where to go after login depends on the role
      const role = result.user.role;
      const from = location.state?.from?.pathname;
      // Only customers get to resume where they left off (e.g. checkout); admin/delivery always land on their own dashboard.
      setRedirectTo(
        role === "customer" && from ? from : roleRedirects[role] || "/"
      );
    } catch (err) {
      setError(
        err?.data?.message || "Invalid email or password. Please try again."
      );
    }
  };

  // shared form + title markup, used by both the page and the popup
  const content = (
    <>
      {/* TITLE */}
      <div className={`flex items-center ${asModal ? "mb-4" : "mb-6 mt-4"}`}>
        {/* user icon badge */}
        <div className="bg-orange-500 p-2.5 rounded-xl mr-3">
          <User className="text-white w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-700">Sign in</h2>
          <p className="text-xs text-gray-500">
            Access your account securely
          </p>
        </div>
      </div>

      {/* CARD — the popup provides the card chrome */}
      <form
        onSubmit={handleSubmit}
        className={
          asModal
            ? "flex flex-col gap-3 w-full"
            : "bg-white p-4 rounded-xl shadow-xl border flex flex-col gap-3 max-w-xs w-full"
        }
      >
        <h3 className="text-sm font-semibold">Login With Credentials</h3>

        {/* error message */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {error}
          </p>
        )}

        <div className="space-y-2">
          {/* EMAIL */}
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-green-700" />
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-9 py-2 text-sm border rounded-lg bg-gray-50"
              placeholder="Email"
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-green-700" />
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg bg-gray-50"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
            />
            {/* show/hide password toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* forgot password link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              onClick={onClose} // leaving the popup, so close it
              className="text-xs text-orange-500 font-medium hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* LOGIN BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 text-white py-2 mt-1 rounded-lg font-bold text-sm disabled:opacity-60"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* FOOTER */}
      <p className={`${asModal ? "mt-4" : "mt-6"} text-sm text-gray-600`}>
        Don't have an account?
        {asModal ? (
          // swaps the popup over to the register form
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-green-700 font-bold ml-1 hover:underline"
          >
            Register now
          </button>
        ) : (
          // keeps redirect-after-login state when switching to register
          <Link to="/register" state={location.state} className="text-green-700 font-bold ml-1">
            Register now
          </Link>
        )}
      </p>
    </>
  );

  // popup variant, no page chrome
  if (asModal) {
    return <div className="flex flex-col items-center text-gray-800">{content}</div>;
  }

  return (
    <div className="bg-white font-sans text-gray-800 m-0 min-h-screen">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 flex items-center text-gray-500 hover:text-orange-500 transition"
      >
        {/* circular arrow icon */}
        <div className="bg-gray-100 p-2 rounded-full hover:bg-orange-50 transition">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="ml-2 font-medium hidden sm:block">Back</span>
      </button>

      {/* HOME BUTTON — this page hides the site header, so it carries its own way back to the storefront */}
      <Link
        to="/"
        className="absolute right-4 top-4 flex items-center text-gray-500 hover:text-orange-500 transition"
      >
        <span className="mr-2 font-medium hidden sm:block">Home</span>
        {/* circular home icon */}
        <div className="bg-gray-100 p-2 rounded-full hover:bg-orange-50 transition">
          <Home className="w-5 h-5" />
        </div>
      </Link>

      {/* MAIN */}
      <main className="flex flex-col items-center justify-center py-16 px-4">
        {content}
      </main>
    </div>
  );
};

export default Login;
