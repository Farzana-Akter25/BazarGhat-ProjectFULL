import { Smartphone, X } from "lucide-react"; // modal icons
import { useState } from "react";
import {
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
} from "../../features/customer/phoneVerificationApi"; // phone otp api hooks
import { useCountdown } from "../../hooks/useCountdown"; // resend cooldown timer
import OtpInput from "./OtpInput"; // 6-digit code input

// Popup that sends an SMS code and verifies the phone number
const PhoneOtpModal = ({
  open, // controls visibility
  phone, // number being verified, as typed on the checkout form
  onVerified, // called with the normalized number once the code checks out
  onClose, // dismiss handler
}) => {
  // unmount when closed so every opening starts fresh
  if (!open) return null;

  return <PhoneOtpDialog phone={phone} onVerified={onVerified} onClose={onClose} />;
};

// the dialog body, mounted only while open
const PhoneOtpDialog = ({ phone, onVerified, onClose }) => {
  const [step, setStep] = useState("start"); // start -> otp
  const [error, setError] = useState(""); // send-step error
  const [otpError, setOtpError] = useState(""); // code-step error
  const [resendAt, setResendAt] = useState(null); // timestamp resend becomes available
  const [otpKey, setOtpKey] = useState(0); // forces OtpInput remount/reset
  const [debugCode, setDebugCode] = useState(null); // code echoed back on the log driver
  const [normalized, setNormalized] = useState(null); // server's +880 form of the number

  const [sendOtp, { isLoading: isSending }] = useSendPhoneOtpMutation(); // send/resend mutation
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyPhoneOtpMutation(); // verify mutation

  const { totalSeconds: resendRemaining } = useCountdown(resendAt); // seconds left before resend allowed

  // starts/restarts the resend cooldown timer
  const startCooldown = (seconds = 60) => {
    setResendAt(new Date(Date.now() + seconds * 1000));
  };

  // requests a code — used for both the first send and every resend
  const handleSend = async () => {
    setError("");
    setOtpError("");
    setDebugCode(null);

    try {
      // Ask the server to send the code
      const result = await sendOtp({ phone }).unwrap();

      // the number was already trusted, so no code was sent
      if (result.verified) {
        onVerified(result.phone);
        return;
      }

      setNormalized(result.phone);
      setDebugCode(result.debug_code || null);
      startCooldown(result.retry_after ?? 60);
      setOtpKey((k) => k + 1); // clear any previously typed digits
      setStep("otp");
    } catch (err) {
      // a 429 tells us exactly how long the cooldown has left
      if (err?.data?.retry_after) startCooldown(err.data.retry_after);

      // Show the error on the current step
      const message = err?.data?.message || "Could not send the verification code. Please try again.";
      if (step === "otp") setOtpError(message);
      else setError(message);
    }
  };

  // checks the typed code
  const handleVerify = async (code) => {
    setOtpError("");

    try {
      // Check the code with the server
      const result = await verifyOtp({ phone: normalized || phone, otp: code }).unwrap();
      onVerified(result.phone);
    } catch (err) {
      setOtpError(err?.data?.message || "Incorrect code. Please try again.");
      setOtpKey((k) => k + 1); // reset otp input on failure
    }
  };

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* modal card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {/* phone icon badge */}
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Smartphone size={18} />
            </span>
            <div>
              {/* modal title */}
              <h2 className="text-base font-bold text-slate-800">Verify Phone Number</h2>
              {/* modal subtitle */}
              <p className="text-xs text-slate-400">Required before your order can be placed</p>
            </div>
          </div>
          {/* dismiss button */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* start step: confirm number and request a code */}
          {step === "start" && (
            <div className="space-y-4">
              {/* general error message */}
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
                  {error}
                </p>
              )}

              {/* explanation */}
              <p className="text-sm text-slate-600">
                We'll send a 6-digit code to this number to confirm it's reachable for delivery.
              </p>

              {/* number being verified */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Smartphone size={16} className="shrink-0 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">{phone}</span>
              </div>

              {/* send code button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="w-full rounded-xl bg-green-700 py-3 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send Code"}
              </button>
            </div>
          )}

          {/* otp step: enter the code */}
          {step === "otp" && (
            <div className="space-y-4">
              {/* instructions */}
              <p className="text-center text-sm text-slate-600">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold">{normalized || phone}</span>
              </p>

              {/* code shown directly when no real SMS was sent (log driver) */}
              {debugCode && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
                  Demo mode — no SMS was sent. Your code is{" "}
                  <span className="font-bold tracking-widest">{debugCode}</span>
                </p>
              )}

              {/* code error message */}
              {otpError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
                  {otpError}
                </p>
              )}

              {/* otp code input */}
              <OtpInput key={otpKey} onComplete={handleVerify} disabled={isVerifying} />

              {/* resend countdown/link */}
              <p className="text-center text-sm text-slate-500">
                {resendRemaining > 0 ? (
                  <>Resend code in {resendRemaining}s</>
                ) : (
                  // resend code button
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSending}
                    className="font-semibold text-orange-500 hover:underline disabled:opacity-60"
                  >
                    {isSending ? "Resending..." : "Resend code"}
                  </button>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneOtpModal; // checkout contact number verification
