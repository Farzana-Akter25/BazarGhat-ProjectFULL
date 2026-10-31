<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: add failed to returns refund status enum
return new class extends Migration
{
    // A cancellation refund can now genuinely fail at the gateway, so the mirrored refund_status on the returns record needs somewhere to say so.
    public function up(): void
    {
        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Initiated', 'Processing', 'Completed', 'Refunded', 'Failed') NOT NULL DEFAULT 'Not Applicable'");
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Initiated', 'Processing', 'Completed', 'Refunded') NOT NULL DEFAULT 'Not Applicable'");
    }
};
