<?php

namespace App\Services;

use App\Models\Otp;
use Illuminate\Support\Facades\Hash;

// Creates, re-sends and checks one-time verification codes
class OtpService
{
    // Code lifetime, resend wait, and attempt/resend limits
    public const EXPIRY_MINUTES = 5;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;
    public const MAX_RESENDS = 5;

    // Create a new code; returns [otp record, plain code]
    public function issue(string $type, string $purpose, ?string $email, ?string $phone, ?int $userId = null, ?array $payload = null): array
    {
        // Delete any older unused code for the same purpose and person
        Otp::where('purpose', $purpose)
            ->when($email, fn ($q) => $q->where('email', $email))
            ->when($phone, fn ($q) => $q->where('phone', $phone))
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->whereNull('verified_at')
            ->delete();

        // Random 6-digit code
        $code = (string) random_int(100000, 999999);

        // Save only the hash of the code, never the code itself
        $otp = Otp::create([
            'user_id' => $userId,
            'email' => $email,
            'phone' => $phone,
            'otp_hash' => Hash::make($code),
            'type' => $type,
            'purpose' => $purpose,
            'payload' => $payload,
            'attempts' => 0,
            'resend_count' => 0,
            'last_sent_at' => now(),
            'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
        ]);

        return [$otp, $code];
    }

    // Find the latest unused code for this purpose and person
    public function findActive(string $purpose, ?string $email = null, ?string $phone = null, ?int $userId = null): ?Otp
    {
        return Otp::where('purpose', $purpose)
            ->when($email, fn ($q) => $q->where('email', $email))
            ->when($phone, fn ($q) => $q->where('phone', $phone))
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->whereNull('verified_at')
            ->latest('id')
            ->first();
    }

    // Seconds left before another resend is allowed
    public function resendCooldownRemaining(Otp $otp): int
    {
        if (! $otp->last_sent_at) {
            return 0;
        }

        // Seconds since the last send
        $elapsed = $otp->last_sent_at->diffInSeconds(now());

        return max(0, self::RESEND_COOLDOWN_SECONDS - $elapsed);
    }

    // True when the resend limit is not reached and the cooldown is over
    public function canResend(Otp $otp): bool
    {
        return $otp->resend_count < self::MAX_RESENDS && $this->resendCooldownRemaining($otp) === 0;
    }

    // Replace the code on an existing record and count it as a resend
    public function regenerate(Otp $otp): string
    {
        // Random 6-digit code
        $code = (string) random_int(100000, 999999);

        $otp->update([
            'otp_hash' => Hash::make($code),
            'attempts' => 0,
            'resend_count' => $otp->resend_count + 1,
            'last_sent_at' => now(),
            'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
            'verified_at' => null,
        ]);

        return $code;
    }

    // Check a typed code; wrong guesses are counted
    public function verify(Otp $otp, string $code): bool
    {
        // Expired or too many wrong guesses
        if ($otp->isExpired() || $otp->attemptsExhausted()) {
            return false;
        }

        // Wrong code: count the attempt
        if (! Hash::check($code, $otp->otp_hash)) {
            $otp->increment('attempts');

            return false;
        }

        // Correct code: mark it as used
        $otp->update(['verified_at' => now()]);

        return true;
    }
}
