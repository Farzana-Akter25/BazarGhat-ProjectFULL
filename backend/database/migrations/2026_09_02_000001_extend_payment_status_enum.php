<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend payment status enum
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('Unpaid', 'Paid', 'Refund Pending', 'Refunded') NOT NULL DEFAULT 'Unpaid'");
    }

    // Reverse the migrations.
    public function down(): void
    {
        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('Unpaid', 'Paid') NOT NULL DEFAULT 'Unpaid'");
    }
};
