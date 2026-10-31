<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: update refund status enum
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        // Refunds are now automatically processed, set refund_status to 'Refunded' instead of multi-step progression
        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Initiated', 'Processing', 'Completed', 'Refunded') NOT NULL DEFAULT 'Not Applicable'");
    }

    // Reverse the migrations.
    public function down(): void
    {
        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Initiated', 'Processing', 'Completed') NOT NULL DEFAULT 'Not Applicable'");
    }
};
