<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend order workflow status columns
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY status ENUM('Pending', 'Confirmed', 'Assigned', 'Processing', 'In Transit', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending'");
        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('Unpaid', 'Paid', 'Refunded') NOT NULL DEFAULT 'Unpaid'");

        Schema::table('orders', function (Blueprint $table) {
            $table->enum('cancelled_by', ['customer', 'admin'])->nullable()->after('status');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('cancelled_by');
        });

        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('Unpaid', 'Paid') NOT NULL DEFAULT 'Unpaid'");
        DB::statement("ALTER TABLE orders MODIFY status ENUM('Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending'");
    }
};
