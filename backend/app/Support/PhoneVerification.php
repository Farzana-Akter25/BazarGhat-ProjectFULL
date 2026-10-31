<?php

namespace App\Support;

use App\Models\Otp;
use App\Models\User;

// Checks whether a customer has verified a phone number
class PhoneVerification
{
    // marks OTPs issued for the checkout contact number
    public const PURPOSE = 'checkout_phone';

    // how long a verified number stays trusted.
    public const TTL_MINUTES = 30;

    // Whether this user has proven they control the given number.
    public static function isVerified(User $user, string $normalizedPhone): bool
    {
        // The account's own phone is already verified
        if ($user->phone_verified_at && Phone::normalize((string) $user->phone) === $normalizedPhone) {
            return true;
        }

        // Or the number was verified by OTP in the last 30 minutes
        return Otp::where('purpose', self::PURPOSE)
            ->where('user_id', $user->id)
            ->where('phone', $normalizedPhone)
            ->whereNotNull('verified_at')
            ->where('verified_at', '>=', now()->subMinutes(self::TTL_MINUTES))
            ->exists();
    }
}
