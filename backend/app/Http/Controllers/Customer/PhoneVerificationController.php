<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use App\Services\SmsService;
use App\Support\Phone;
use App\Support\PhoneVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Verifies the delivery contact number a customer types at
class PhoneVerificationController extends Controller
{
    // the OTP engine and the SMS gateway this screen leans on
    public function __construct(private OtpService $otps, private SmsService $sms)
    {
    }

    // Send a code to the given number.
    public function send(Request $request)
    {
        // Phone number is required
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // 01XXXXXXXXX and +8801XXXXXXXXX both become one stored form
        $phone = Phone::normalize($request->phone);

        // not a Bangladeshi mobile number at all
        if (! $phone) {
            return response()->json([
                'message' => 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).',
            ], 422);
        }

        // The logged-in customer
        $user = $request->user();

        // already trusted — don't spend an SMS proving it again
        if (PhoneVerification::isVerified($user, $phone)) {
            return response()->json([
                'message' => 'This number is already verified.',
                'phone' => $phone,
                'verified' => true,
            ]);
        }

        // a code may still be pending for this number
        $existing = $this->otps->findActive(PhoneVerification::PURPOSE, null, $phone, $user->id);

        if ($existing && ! $existing->isExpired()) {
            $remaining = $this->otps->resendCooldownRemaining($existing);

            // still inside the one minute cooldown
            if ($remaining > 0) {
                return response()->json([
                    'message' => "Please wait {$remaining}s before requesting another code.",
                    'retry_after' => $remaining,
                ], 429);
            }

            // asked for a new code too many times
            if ($existing->resend_count >= OtpService::MAX_RESENDS) {
                return response()->json([
                    'message' => 'Maximum resend limit reached. Please try again later.',
                ], 429);
            }

            // reuse the same row with a fresh code on it
            $otp = $existing;
            $code = $this->otps->regenerate($existing);
        } else {
            // nothing pending, so start a new one
            [$otp, $code] = $this->otps->issue('sms', PhoneVerification::PURPOSE, null, $phone, $user->id);
        }

        // Send the code by SMS
        $minutes = OtpService::EXPIRY_MINUTES;
        $sent = $this->sms->send($phone, "Your BazarGhat verification code is {$code}. It expires in {$minutes} minutes.");

        if (! $sent) {
            // Nothing was delivered
            $otp->delete();

            return response()->json([
                'message' => 'Could not send the verification code right now. Please try again.',
                // the gateway's own reason, shown only while debugging locally
                'provider_error' => config('app.debug') ? $this->sms->lastError() : null,
            ], 502);
        }

        // SMS sent: tell the screen which number and when it may resend
        return response()->json([
            'message' => "A verification code has been sent to {$phone}.",
            'phone' => $phone,
            // tells the screen how long to disable its resend button
            'retry_after' => OtpService::RESEND_COOLDOWN_SECONDS,
            // populated only on the log driver with SMS_EXPOSE_CODE enabled
            'debug_code' => $this->sms->revealsCode() ? $code : null,
        ]);
    }

    // check a submitted code against the pending OTP for this user + number
    public function verify(Request $request)
    {
        // Phone and 6-digit code are required
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|max:20',
            // every code this system issues is six digits
            'otp' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // the number has to be read the same way it was written when the code went out
        $phone = Phone::normalize($request->phone);

        if (! $phone) {
            return response()->json([
                'message' => 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).',
            ], 422);
        }

        // Find the pending code for this user and number
        $user = $request->user();
        $otp = $this->otps->findActive(PhoneVerification::PURPOSE, null, $phone, $user->id);

        // nothing was ever sent to this number, or it has been used already
        if (! $otp) {
            return response()->json([
                'message' => 'No pending verification found. Please request a new code.',
            ], 404);
        }

        // older than the five minute window
        if ($otp->isExpired()) {
            return response()->json([
                'message' => 'This code has expired. Please request a new one.',
            ], 422);
        }

        // five wrong guesses and this code is finished
        if ($otp->attemptsExhausted()) {
            return response()->json([
                'message' => 'Too many incorrect attempts. Please request a new code.',
            ], 429);
        }

        // the guess itself is checked against the stored hash
        if (! $this->otps->verify($otp, $request->otp)) {
            return response()->json([
                'message' => 'Incorrect code. Please try again.',
            ], 422);
        }

        // Stamp the account only when the verified number is the customer's own
        if (Phone::normalize((string) $user->phone) === $phone) {
            $user->update(['phone_verified_at' => now()]);
        }

        // Verified successfully
        return response()->json([
            'message' => 'Phone number verified.',
            'phone' => $phone,
            'verified' => true,
        ]);
    }
}
