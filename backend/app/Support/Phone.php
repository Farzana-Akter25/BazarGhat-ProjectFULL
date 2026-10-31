<?php

namespace App\Support;

// Helpers for Bangladeshi mobile numbers
class Phone
{
    // Normalize a Bangladeshi mobile number to the canonical +8801XXXXXXXXX form
    public static function normalize(string $raw): ?string
    {
        $trimmed = trim($raw);

        // 01XXXXXXXXX -> +8801XXXXXXXXX
        if (preg_match('/^01[3-9]\d{8}$/', $trimmed)) {
            return '+880' . substr($trimmed, 1);
        }

        // Already in +8801XXXXXXXXX form
        if (preg_match('/^\+8801[3-9]\d{8}$/', $trimmed)) {
            return $trimmed;
        }

        return null;
    }
}
