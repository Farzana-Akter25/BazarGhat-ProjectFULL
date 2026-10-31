<?php

namespace App\Support;

// Detects throwaway (temporary) email addresses
class DisposableEmail
{
    // Known temporary email domains
    private const BLOCKED_DOMAINS = [
        'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com',
        '10minutemail.com', 'yopmail.com', 'trashmail.com', 'throwawaymail.com',
        'getnada.com', 'dispostable.com', 'fakeinbox.com', 'sharklasers.com',
        'maildrop.cc', 'mintemail.com', 'mailnesia.com', 'moakt.com',
    ];

    // True if the email's domain is in the blocked list
    public static function isDisposable(string $email): bool
    {
        // The part after "@", lowercased
        $domain = strtolower(trim(substr((string) strrchr($email, '@'), 1)));

        return in_array($domain, self::BLOCKED_DOMAINS, true);
    }
}
