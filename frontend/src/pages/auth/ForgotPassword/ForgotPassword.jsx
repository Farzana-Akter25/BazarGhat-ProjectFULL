import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useForgotPasswordCheckMutation,
  useForgotPasswordVerifyEmailOtpMutation,
  useResendForgotPasswordOtpMutation,
} from "../../../features/auth/authSlice";
import OtpInput from "../../../components/shared/OtpInput"; // 6-digit code input
import { useCountdown } from "../../../hooks/useCountdown"; // resend cooldown timer

// Forgot password page: find the account, then check the emailed code
const ForgotPassword = () => {
  // Router helper
  const navigate = useNavigate();
  const [step, setStep] = useState("identifier"); // identifier | email-otp
  const [identifier, setIdentifier] = useState(""); // email/phone input value
  const [email, setEmail] = useState(""); // resolved email for otp step
  const [error, setError] = useState(""); // identifier step error
  const [otpError, setOtpError] = useState(""); // otp step error
  const [resendAt, setResendAt] = useState(null); // timestamp resend becomes available
  const [otpKey, setOtpKey] = useState(0); // bumps to reset otp input

  const [checkIdentifier, { isLoading: isChecking }] = useForgotPasswordCheckMutation(); // validate email/phone
  const [resendEmailOtp, { isLoading: isResending }] = useResendForgotPasswordOtpMutation(); // resend otp code
  const [verifyEmailOtp, { isLoading: isVerifyingEmail }] = useForgotPasswordVerifyEmailOtpMutation(); // verify entered otp

  const { totalSeconds: resendRemaining } = useCountdown(resendAt); // seconds left before resend allowed

  // start/restart the resend cooldown timer
  const startResendCooldown = (seconds = 60) => {
    setResendAt(new Date(Date.now() + seconds * 1000));
  };

  // submit email/phone to request otp
  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Find the account and email it a code
      const result = await checkIdentifier({ identifier }).unwrap();
      setEmail(result.email);
      startResendCooldown();
      setStep("email-otp"); // move to otp step
    } catch (err) {
      setError(err?.data?.message || "Something went wrong. Please try again.");
    }
  };

  // verify entered otp code
  const handleVerifyEmailOtp = async (code) => {
    setOtpError("");
    try {
      // Check the code; on success go to the reset page with the token
      const result = await verifyEmailOtp({ email, otp: code }).unwrap();
      navigate("/reset-password", { state: { email: result.email, token: result.token } }); // go set new password
    } catch (err) {
      setOtpError(err?.data?.message || "Incorrect code. Please try again.");
      setOtpKey((k) => k + 1); // reset otp input on failure
    }
  };

  // resend the otp code
  const handleResendEmailOtp = async () => {
    setOtpError("");
    try {
      await resendEmailOtp({ email }).unwrap();
      startResendCooldown();
      setOtpKey((k) => k + 1); // reset otp input
    } catch (err) {
      setOtpError(err?.data?.message || "Could not resend the code.");
    }
  };

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
          {/* orange mail icon badge */}
          <div className="bg-orange-500 p-4 rounded-2xl mr-4">
            <Mail className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-700">
              Forgot Password
            </h2>
            <p className="text-sm text-gray-500">
              Verify it's you to reset your password
            </p>
          </div>
        </div>

        {/* identifier form step */}
        {step === "identifier" && (
          <form
            onSubmit={handleIdentifierSubmit}
            className="bg-white p-4 md:p-6 rounded-xl shadow-xl border flex flex-col gap-4 max-w-sm w-full"
          >
            {/* identifier step error banner */}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* email/phone input */}
            <div className="relative">
              <Mail className="absolute left-4 top-3 w-5 h-5 text-green-700" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full pl-12 py-2.5 border rounded-xl bg-gray-50"
                placeholder="Email or Phone Number"
              />
            </div>

            {/* continue submit button */}
            <button
              type="submit"
              disabled={isChecking}
              className="w-full bg-orange-500 text-white py-2.5 mt-3 rounded-xl font-bold text-sm disabled:opacity-60"
            >
              {isChecking ? "Please wait..." : "Continue"}
            </button>
          </form>
        )}

        {/* otp verification step */}
        {step === "email-otp" && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-xl border flex flex-col gap-4 max-w-sm w-full">
            {/* instructions with target email */}
            <p className="text-sm text-gray-600 text-center">
              Enter the 6-digit code sent to <span className="font-semibold">{email}</span>
            </p>
            {/* otp step error banner */}
            {otpError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {otpError}
              </p>
            )}
            {/* 6-digit otp input */}
            <OtpInput key={otpKey} onComplete={handleVerifyEmailOtp} disabled={isVerifyingEmail} />
            {/* resend code row */}
            <p className="text-center text-sm text-gray-500">
              {resendRemaining > 0 ? (
                // cooldown still active
                <>Resend code in {resendRemaining}s</>
              ) : (
                // resend button once cooldown ends
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={isResending}
                  className="text-orange-500 font-semibold hover:underline disabled:opacity-60"
                >
                  {isResending ? "Resending..." : "Resend code"}
                </button>
              )}
            </p>
          </div>
        )}

        {/* sign in link */}
        <p className="mt-10 text-gray-600">
          Remembered your password?
          <Link to="/login" className="text-green-700 font-bold ml-1">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
};

export default ForgotPassword;
