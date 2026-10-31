<?php

use App\Support\Phone;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: normalize existing user phone numbers
return new class extends Migration
{
    // New code stores phone numbers as +8801XXXXXXXXX (see App\Support\Phone).
    public function up(): void
    {
        DB::table('users')->whereNotNull('phone')->where('phone', '!=', '')->get(['id', 'phone'])->each(function ($user) {
            $normalized = Phone::normalize($user->phone);

            if ($normalized && $normalized !== $user->phone) {
                DB::table('users')->where('id', $user->id)->update(['phone' => $normalized]);
            }
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // Intentionally irreversible: the original raw format isn't preserved.
    }
};
