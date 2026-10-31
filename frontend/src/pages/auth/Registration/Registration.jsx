import { ArrowLeft, Eye, EyeOff, Home, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import notify from "../../../utils/notify"; // shared toast notifications
import {
  useRegisterMutation,
  useResendRegistrationOtpMutation,
  useVerifyRegistrationOtpMutation,
} from "../../../features/auth/authSlice";
import OtpInput from "../../../components/shared/OtpInput";
import { useCountdown } from "../../../hooks/useCountdown";

// asModal renders the same form inside the header popup instead of as a full page.
const Register = ({ asModal = false, onSwitchToLogin }) => {
  // Router helpers
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("form"); // "form" | "otp", which screen is shown
  const [showPassword, setShowPassword] = useState(false); // toggles password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // toggles confirm-password visibility
  const [agreed, setAgreed] = useState(false); // terms & privacy checkbox
  const [error, setError] = useState(""); // form-level error message
  const [otpError, setOtpError] = useState(""); // otp verify/resend error message
  const [resendAt, setResendAt] = useState(null); // timestamp when resend becomes available
  const [otpKey, setOtpKey] = useState(0); // remount key to reset OtpInput
  // registration form values
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    address: "",
  });

  // API calls for sign-up, code check and code resend
  const [register, { isLoading }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyRegistrationOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendRegistrationOtpMutation();

  const { totalSeconds: resendRemaining } = useCountdown(resendAt); // seconds left before resend allowed

  // generic input change handler
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // validate + submit registration, moves to otp step
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("Please agree to the Terms & Privacy Policy.");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Send the sign-up form; the server emails a code
      const result = await register({
        name: (formData.first_name + " " + formData.last_name).trim(),
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      }).unwrap();

      setResendAt(new Date(Date.now() + (result.retry_after || 60) * 1000));
      setStep("otp");
    } catch (err) {
      // Show the first validation error, or the server message
      const errors = err?.data?.errors;
      const firstError = errors
        ? Object.values(errors)[0]?.[0]
        : err?.data?.message;
      setError(firstError || "Registration failed. Please try again.");
    }
  };

  // verify the otp code, go to login on success
  const handleVerify = async (code) => {
    setOtpError("");
    try {
      await verifyOtp({ email: formData.email, otp: code }).unwrap();
      notify.success("Account created");
      if (asModal) {
        onSwitchToLogin?.(); // stay in the popup, swap to the sign in form
      } else {
        navigate("/login", { state: location.state });
      }
    } catch (err) {
      setOtpError(err?.data?.message || "Incorrect code. Please try again.");
      setOtpKey((k) => k + 1); // reset otp input on wrong code
    }
  };

  // request a new otp code
  const handleResend = async () => {
    setOtpError("");
    try {
      // Ask for a new code and restart the resend timer
      const result = await resendOtp({ email: formData.email }).unwrap();
      setResendAt(new Date(Date.now() + (result.retry_after || 60) * 1000));
      setOtpKey((k) => k + 1); // reset otp input after resend
    } catch (err) {
      setOtpError(err?.data?.message || "Could not resend the code.");
    }
  };

  // otp verification screen
  if (step === "otp") {
    // Screen shown while waiting for the email code
    const otpContent = (
      <>
        {/* verify email header */}
        <div className="flex flex-col items-center mb-4 mt-1">
          {/* mail icon badge */}
          <div className="bg-orange-500 p-2.5 rounded-lg mb-2 shadow-md">
            <Mail className="text-white w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-500 text-xs mt-0.5 text-center">
            We sent a 6-digit code to <span className="font-semibold">{formData.email}</span>
          </p>
        </div>

        {/* otp verify card — the popup already provides the card chrome */}
        <div
          className={
            asModal
              ? "w-full flex flex-col gap-3"
              : "bg-white rounded-2xl shadow-lg p-4 w-full max-w-xs border border-gray-100 flex flex-col gap-3"
          }
        >
          {/* otp error message */}
          {otpError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              {otpError}
            </p>
          )}

          {/* 6-digit code input */}
          <OtpInput key={otpKey} onComplete={handleVerify} disabled={isVerifying} />

          {/* resend code countdown / button */}
          <p className="text-center text-xs text-gray-500">
            {resendRemaining > 0 ? (
              <>Resend code in {resendRemaining}s</>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-orange-500 font-semibold hover:underline disabled:opacity-60"
              >
                {isResending ? "Resending..." : "Resend code"}
              </button>
            )}
          </p>
        </div>
      </>
    );

    // popup variant, no page chrome
    if (asModal) {
      return (
        <div className="flex flex-col items-center text-gray-800">
          {/* back to form button */}
          <button
            type="button"
            onClick={() => setStep("form")}
            className="self-start flex items-center text-gray-500 hover:text-gray-800 text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          {otpContent}
        </div>
      );
    }

    return (
      <div className="bg-white font-sans text-gray-800 min-h-screen relative">
        {/* back to form button */}
        <div className="absolute left-3 top-4 z-10">
          <button
            onClick={() => setStep("form")}
            className="flex items-center text-gray-500 hover:text-gray-800 bg-white/60 px-2 py-0.5 rounded-lg text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        </div>

        <main className="flex flex-col items-center py-8 px-3 max-w-4xl mx-auto">
          {otpContent}
        </main>
      </div>
    );
  }

  // shared registration markup, used by both the page and the popup
  const content = (
    <>
      {/* HEADER */}
      <div className="flex flex-col items-center mb-4 mt-1">
        {/* user icon badge */}
        <div className="bg-orange-500 p-2.5 rounded-lg mb-2 shadow-md">
          <User className="text-white w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          Join us to start shopping
        </p>
      </div>

      
      <div
        className={
          asModal
            ? "w-full"
            : "bg-white rounded-2xl shadow-lg p-4 w-full max-w-xs border border-gray-100"
        }
      >
        <form className="space-y-2" onSubmit={handleSubmit}>
          {/* form error message */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              {error}
            </p>
          )}

          {/* NAME */}
          <div className="grid grid-cols-2 gap-2">
            {/* first name */}
            <input
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              required
              placeholder="First Name"
              className="border p-2 rounded-lg w-full bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
            {/* last name */}
            <input
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              className="border p-2 rounded-lg w-full bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
          </div>

          {/* EMAIL */}
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-green-700" />
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email Address"
              className="w-full pl-9 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
          </div>

          {/* PHONE */}
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-green-700" />
            <input
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Phone Number (01XXXXXXXXX)"
              className="w-full pl-9 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-green-700" />
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full pl-9 pr-9 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
            {/* show/hide password toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400"
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-green-700" />
            <input
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              required
              minLength={6}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full pl-9 pr-9 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none text-xs"
            />
            {/* show/hide confirm password toggle */}
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-gray-400"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* ADDRESS */}
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Delivery Address"
            className="w-full p-2 border rounded-lg h-14 bg-gray-50 focus:ring-2 focus:ring-green-700 outline-none resize-none text-xs"
          />

          {/* TERMS */}
          <div className="flex items-center space-x-2">
            {/* agree checkbox */}
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-green-700 w-3.5 h-3.5"
            />
            <label className="text-xs text-gray-600">
              I agree to Terms & Privacy Policy
            </label>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold text-sm shadow-md active:scale-95 transition disabled:opacity-60"
          >
            {isLoading ? "Sending code..." : "Create Account"}
          </button>
        </form>

        {/* LOGIN */}
        <div className="text-center mt-4 pt-3 border-t text-xs">
          <p className="text-gray-600">
            Already have an account?
            {asModal ? (
              // swaps the popup over to the sign in form
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-green-700 font-semibold ml-1 hover:underline"
              >
                Sign In
              </button>
            ) : (
              // keeps redirect-after-login state when switching to login
              <Link to="/login" state={location.state} className="text-green-700 font-semibold ml-1">
                Sign In
              </Link>
            )}
          </p>
        </div>
      </div>
    </>
  );

  // popup variant, no page chrome
  if (asModal) {
    return <div className="flex flex-col items-center text-gray-800">{content}</div>;
  }

  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen relative">
      {/* BACK BUTTON */}
      <div className="absolute left-3 top-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-800 bg-white/60 px-2 py-0.5 rounded-lg text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      {/* HOME BUTTON — this page hides the site header, so it carries its own way back to the storefront */}
      <div className="absolute right-3 top-4 z-10">
        <Link
          to="/"
          className="flex items-center text-gray-500 hover:text-gray-800 bg-white/60 px-2 py-0.5 rounded-lg text-xs"
        >
          <Home className="w-4 h-4 mr-1" />
          Home
        </Link>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex flex-col items-center py-8 px-3 max-w-4xl mx-auto">
        {content}
      </main>
    </div>
  );
};

export default Register;
