<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: verify existing users email
return new class extends Migration
{
    // Login now requires a verified email.
    public function up(): void
    {
        DB::table('users')->whereNull('email_verified_at')->update([
            'email_verified_at' => now(),
        ]);
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // Intentionally irreversible: we can't tell which rows were genuinely verified afterward vs. grandfathered in here.
    }
};
