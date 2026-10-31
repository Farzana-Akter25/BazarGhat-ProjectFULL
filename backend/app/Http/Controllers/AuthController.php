<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\User;
use App\Services\OtpService;
use App\Support\DisposableEmail;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;

// Registration, login, logout and password reset endpoints
class AuthController extends Controller
{
    // Inject the OTP service
    public function __construct(private OtpService $otps)
    {
    }

    // Step 1 of sign-up: validate the details and email a verification code
    public function register(Request $request)
    {
        // Validate the sign-up form
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email:filter|max:255|unique:users,email',
            'phone' => 'required|string',
            'address' => 'nullable|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Normalise the email to lowercase without spaces
        $email = trim(strtolower($request->email));

        // Refuse throwaway (disposable) email addresses
        if (DisposableEmail::isDisposable($email)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['email' => ['Please use a permanent email address.']],
            ], 422);
        }

        // Convert the phone to the standard Bangladeshi format; refuse if invalid
        $phone = Phone::normalize($request->phone);

        if (! $phone) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['phone' => ['Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).']],
            ], 422);
        }

        // One account per phone number
        if (User::where('phone', $phone)->exists()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['phone' => ['This phone number is already registered.']],
            ], 422);
        }

        // Create an OTP and keep the sign-up details with it until the email is verified
        [$otp, $code] = $this->otps->issue('email', 'registration_email', $email, null, null, [
            'name' => trim($request->name),
            'phone' => $phone,
            'address' => $request->address,
            'password' => Hash::make($request->password),
        ]);

        // Email the code to the customer
        if (! $this->sendOtpMail(
            $email,
            $code,
            'Verify your email',
            'Use the code below to verify your email and finish creating your BazarGhat account.'
        )) {
            return $this->otpMailFailedResponse();
        }

        return response()->json([
            'message' => 'A verification code has been sent to your email.',
            'email' => $email,
            'retry_after' => OtpService::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    // Step 2 of sign-up: check the code and create the account
    public function verifyRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'otp' => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Find the active registration code for this email
        $email = trim(strtolower($request->email));
        $otp = $this->otps->findActive('registration_email', $email);

        // No code, expired code or too many wrong tries
        if (! $otp) {
            return response()->json(['message' => 'No pending registration found for this email.'], 404);
        }

        if ($otp->isExpired()) {
            return response()->json(['message' => 'This code has expired. Please request a new one.'], 410);
        }

        if ($otp->attemptsExhausted()) {
            return response()->json(['message' => 'Too many incorrect attempts. Please request a new code.'], 429);
        }

        // Wrong code
        if (! $this->otps->verify($otp, $request->otp)) {
            return response()->json(['message' => 'Incorrect verification code.'], 422);
        }

        // Stop if the account was already created meanwhile
        if (User::where('email', $email)->orWhere('phone', $otp->payload['phone'])->exists()) {
            $otp->delete();

            return response()->json(['message' => 'This account was already created. Please sign in.'], 409);
        }

        // Create the user from the details saved with the code
        $user = User::create([
            'name' => $otp->payload['name'],
            'email' => $email,
            'phone' => $otp->payload['phone'],
            'address' => $otp->payload['address'] ?? null,
            'password' => $otp->payload['password'],
            'email_verified_at' => now(),
        ]);

        // The code is used up
        $otp->delete();

        // Log the new user in by giving them an API token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Email verified. Account created successfully.',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    // Send a new registration code
    public function resendRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        return $this->resendOtp(trim(strtolower($request->email)), null, 'registration_email', 'Verify your email', 'Use the code below to verify your email and finish creating your BazarGhat account.');
    }

    // Log in with email and password
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check the email and password
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Invalid email or password',
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // Only verified emails may log in
        if (!$user->email_verified_at) {
            Auth::logout();

            return response()->json([
                'message' => 'Please verify your email address before logging in.',
            ], 403);
        }

        // Blocked accounts cannot log in
        if ($user->status === 'Blocked') {
            return response()->json([
                'message' => 'Your account has been blocked. Please contact support.',
            ], 403);
        }

        // Create an API token for this session
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    // Log out by deleting the current API token
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    // Return the logged-in user's details
    public function profile(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    // Forgot password: find the account by email or phone and email a reset code
    public function forgotPasswordCheck(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identifier' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Look the user up by email if it has "@", otherwise by phone
        $identifier = trim($request->identifier);
        $user = null;

        if (str_contains($identifier, '@')) {
            $user = User::where('email', strtolower($identifier))->first();
        } else {
            $phone = Phone::normalize($identifier);
            if ($phone) {
                $user = User::where('phone', $phone)->first();
            }
        }

        if (! $user) {
            return response()->json(['message' => 'No account found with that email or phone number.'], 404);
        }

        // Reset needs a verified email to send the code to
        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Your account has no verified email yet, so password reset is not available. Please contact support.',
            ], 422);
        }

        if (! $this->sendPasswordResetEmailOtp($user)) {
            return $this->otpMailFailedResponse();
        }

        return response()->json(['method' => 'email', 'email' => $user->email]);
    }

    // Forgot password: send a reset code to the given email
    public function forgotPasswordSendEmailOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // The account must exist and have a verified email
        $user = User::where('email', strtolower(trim($request->email)))->first();

        if (! $user || ! $user->email_verified_at) {
            return response()->json(['message' => 'No verified account found with that email.'], 404);
        }

        if (! $this->sendPasswordResetEmailOtp($user)) {
            return $this->otpMailFailedResponse();
        }

        return response()->json(['message' => 'A verification code has been sent to your email.']);
    }

    // Send a new password reset code
    public function resendForgotPasswordOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        return $this->resendOtp(strtolower(trim($request->email)), null, 'password_reset_email', 'Reset your password', 'Use the code below to verify your identity and reset your password.');
    }

    // Check the password reset code and hand back a reset token
    public function forgotPasswordVerifyEmailOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'otp' => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Find the active reset code for this email
        $email = strtolower(trim($request->email));
        $otp = $this->otps->findActive('password_reset_email', $email);

        if (! $otp) {
            return response()->json(['message' => 'No pending password reset found for this email.'], 404);
        }

        if ($otp->isExpired()) {
            return response()->json(['message' => 'This code has expired. Please request a new one.'], 410);
        }

        if ($otp->attemptsExhausted()) {
            return response()->json(['message' => 'Too many incorrect attempts. Please request a new code.'], 429);
        }

        if (! $this->otps->verify($otp, $request->otp)) {
            return response()->json(['message' => 'Incorrect verification code.'], 422);
        }

        // Load the account the code belongs to
        $user = User::where('email', $email)->first();

        if (! $user) {
            return response()->json(['message' => 'No account found with that email.'], 404);
        }

        // The code is used up; create a one-time token for the reset step
        $otp->delete();
        $resetToken = Password::createToken($user);

        return response()->json(['email' => $user->email, 'token' => $resetToken]);
    }

    // Set a new password using the reset token
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Let Laravel check the token and save the new hashed password
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        // Token invalid or expired
        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired.',
            ], 400);
        }

        return response()->json([
            'message' => 'Password has been reset successfully.',
        ]);
    }

    // Create a reset code and email it to the user
    private function sendPasswordResetEmailOtp(User $user): bool
    {
        [$otp, $code] = $this->otps->issue('email', 'password_reset_email', $user->email, null, $user->id);

        return $this->sendOtpMail(
            $user->email,
            $code,
            'Reset your password',
            'Use the code below to verify your identity and reset your password.'
        );
    }

    /**
     * Send an OTP email without letting mail transport errors (e.g. bad SMTP
     * credentials) leak to the client. In the local environment the code is
     * written to the log so development can continue without working SMTP.
     */
    private function sendOtpMail(string $email, string $code, string $heading, string $intro): bool
    {
        try {
            Mail::to($email)->send(new OtpMail($code, $heading, $intro));

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send OTP email', ['email' => $email, 'error' => $e->getMessage()]);

            if (app()->environment('local')) {
                Log::warning("[local] OTP for {$email}: {$code}");

                return true;
            }

            return false;
        }
    }

    // Error response used when the OTP email cannot be sent
    private function otpMailFailedResponse()
    {
        return response()->json([
            'message' => "We couldn't send the verification email right now. Please try again in a few minutes.",
        ], 503);
    }

    // Re-send a code, respecting the cooldown and the resend limit
    private function resendOtp(string $email, ?string $phone, string $purpose, string $heading, string $intro)
    {
        // Find the code that is still waiting to be used
        $otp = $this->otps->findActive($purpose, $email, $phone);

        if (! $otp) {
            return response()->json(['message' => 'No pending verification found. Please start again.'], 404);
        }

        // Seconds left before another resend is allowed
        $remaining = $this->otps->resendCooldownRemaining($otp);

        if ($remaining > 0) {
            return response()->json([
                'message' => "Please wait {$remaining} seconds before requesting a new code.",
                'retry_after' => $remaining,
            ], 429);
        }

        // Stop after the maximum number of resends
        if ($otp->resend_count >= OtpService::MAX_RESENDS) {
            return response()->json(['message' => 'Maximum resend limit reached. Please start again.'], 429);
        }

        // Make a new code on the same OTP record and email it
        $code = $this->otps->regenerate($otp);

        if (! $this->sendOtpMail($email, $code, $heading, $intro)) {
            return $this->otpMailFailedResponse();
        }

        return response()->json([
            'message' => 'A new verification code has been sent.',
            'retry_after' => OtpService::RESEND_COOLDOWN_SECONDS,
        ]);
    }
}
