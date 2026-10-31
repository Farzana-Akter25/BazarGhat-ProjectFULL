import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react"; // step icons
import { useState } from "react";
import {
  useForgotPasswordSendEmailOtpMutation,
  useForgotPasswordVerifyEmailOtpMutation,
  useResendForgotPasswordOtpMutation,
  useResetPasswordMutation,
} from "../../features/auth/authSlice"; // reused forgot-password api hooks
import { useCountdown } from "../../hooks/useCountdown"; // resend cooldown timer
import OtpInput from "./OtpInput"; // 6-digit code input

// Change password in steps: send code -> enter code -> new password -> done
const ChangePasswordPanel = ({ email, hideHeader = false }) => {
  const [step, setStep] = useState("start"); // start -> otp -> newpassword -> done
  const [error, setError] = useState(""); // general form error
  const [otpError, setOtpError] = useState(""); // otp step error
  const [resendAt, setResendAt] = useState(null); // timestamp resend becomes available
  const [otpKey, setOtpKey] = useState(0); // forces OtpInput remount/reset
  const [resetToken, setResetToken] = useState(null); // token returned after otp verify
  const [formData, setFormData] = useState({ password: "", password_confirmation: "" }); // new password fields
  const [showPassword, setShowPassword] = useState(false); // toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // toggle confirm visibility

  const [sendEmailOtp, { isLoading: isSending }] = useForgotPasswordSendEmailOtpMutation(); // send otp mutation
  const [resendEmailOtp, { isLoading: isResending }] = useResendForgotPasswordOtpMutation(); // resend otp mutation
  const [verifyEmailOtp, { isLoading: isVerifying }] = useForgotPasswordVerifyEmailOtpMutation(); // verify otp mutation
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation(); // final reset mutation

  const { totalSeconds: resendRemaining } = useCountdown(resendAt); // seconds left before resend allowed

  // starts/restarts the resend cooldown timer
  const startResendCooldown = (seconds = 60) => {
    setResendAt(new Date(Date.now() + seconds * 1000));
  };

  // sends the initial otp to the account email
  const handleSendOtp = async () => {
    setError("");
    try {
      await sendEmailOtp({ email }).unwrap();
      startResendCooldown();
      setStep("otp");
    } catch (err) {
      setError(err?.data?.message || "Could not send the verification code. Please try again.");
    }
  };

  // verifies the entered otp code
  const handleVerifyOtp = async (code) => {
    setOtpError("");
    try {
      // Check the code; on success keep the reset token and go to the next step
      const result = await verifyEmailOtp({ email, otp: code }).unwrap();
      setResetToken(result.token);
      setStep("newpassword");
    } catch (err) {
      setOtpError(err?.data?.message || "Incorrect code. Please try again.");
      setOtpKey((k) => k + 1); // reset otp input on failure
    }
  };

  // resends a fresh otp code
  const handleResendOtp = async () => {
    setOtpError("");
    try {
      await resendEmailOtp({ email }).unwrap();
      startResendCooldown();
      setOtpKey((k) => k + 1); // reset otp input
    } catch (err) {
      setOtpError(err?.data?.message || "Could not resend the code.");
    }
  };

  // syncs password field changes into form state
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // submits the new password using the verified reset token
  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await resetPassword({ email, token: resetToken, ...formData }).unwrap();
      setStep("done");
    } catch (err) {
      setError(err?.data?.message || "Something went wrong. Please try again.");
    }
  };

  // resets the whole flow back to the first step
  const handleStartOver = () => {
    setStep("start");
    setError("");
    setOtpError("");
    setResetToken(null);
    setFormData({ password: "", password_confirmation: "" });
  };

  return (
    // panel wrapper
    <div className="space-y-5">
      {/* panel header, optional */}
      {!hideHeader && (
        <div>
          {/* panel title */}
          <h1 className="text-lg font-bold text-slate-800">Reset Password</h1>
          {/* panel subtitle */}
          <p className="text-sm text-slate-600">
            Verify your account email to set a new password
          </p>
        </div>
      )}

      {/* panel card */}
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* general error message */}
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* start step: send otp */}
        {step === "start" && (
          <div className="space-y-4">
            {/* info banner */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium text-amber-700">
              <ShieldCheck size={15} className="shrink-0" />
              We'll send a 6-digit verification code to your registered email.
            </div>

            {/* account email display */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <Mail size={16} className="shrink-0 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{email}</span>
            </div>

            {/* send code button */}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSending || !email}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock size={16} /> {isSending ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        )}

        {/* otp step: verify code */}
        {step === "otp" && (
          <div className="space-y-4">
            {/* instructions */}
            <p className="text-center text-sm text-slate-600">
              Enter the 6-digit code sent to <span className="font-semibold">{email}</span>
            </p>
            {/* otp error message */}
            {otpError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
                {otpError}
              </p>
            )}
            {/* otp code input */}
            <OtpInput key={otpKey} onComplete={handleVerifyOtp} disabled={isVerifying} />
            {/* resend countdown/link */}
            <p className="text-center text-sm text-slate-700">
              {resendRemaining > 0 ? (
                <>Resend code in {resendRemaining}s</>
              ) : (
                // resend code button
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="font-semibold text-orange-500 hover:underline disabled:opacity-60"
                >
                  {isResending ? "Resending..." : "Resend code"}
                </button>
              )}
            </p>
          </div>
        )}

        {/* new password step */}
        {step === "newpassword" && (
          <form onSubmit={handleSubmitNewPassword} className="space-y-4">
            {/* password field */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                New Password
              </label>
              <div className="relative">
                {/* new password input */}
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pr-10 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="Enter new password"
                />
                {/* show/hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {/* confirm password field */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                {/* confirm password input */}
                <input
                  name="password_confirmation"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pr-10 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="Confirm new password"
                />
                {/* show/hide confirm toggle */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {/* submit new password button */}
            <button
              type="submit"
              disabled={isResetting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {/* success step */}
        {step === "done" && (
          <div className="space-y-4 text-center">
            {/* success check icon */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CheckCircle2 size={24} />
            </div>
            {/* success message */}
            <p className="text-sm font-semibold text-slate-700">
              Password updated successfully.
            </p>
            {/* reset again link */}
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-semibold text-orange-500 hover:underline"
            >
              Reset again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordPanel; // self-service change password flow, shared across roles
