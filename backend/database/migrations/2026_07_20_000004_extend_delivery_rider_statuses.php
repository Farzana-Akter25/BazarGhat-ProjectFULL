<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend delivery rider statuses
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE delivery_assignments MODIFY rider_status ENUM(
            'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Customer Rejected at Doorstep', 'Failed'
        ) NOT NULL DEFAULT 'Assigned'");

        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('rider_status');
        });

        DB::statement("ALTER TABLE delivery_requests MODIFY type ENUM(
            'Day Off', 'Route Change', 'Fuel Expense', 'Vehicle Issue', 'Order Rejection', 'Doorstep Rejection', 'Other'
        ) NOT NULL");
    }

    // Reverse the migrations.
    public function down(): void
    {
        DB::statement("ALTER TABLE delivery_requests MODIFY type ENUM(
            'Day Off', 'Route Change', 'Fuel Expense', 'Vehicle Issue', 'Order Rejection', 'Other'
        ) NOT NULL");

        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });

        DB::statement("ALTER TABLE delivery_assignments MODIFY rider_status ENUM(
            'Assigned', 'On The Way', 'Picked Up', 'Delivered', 'Failed'
        ) NOT NULL DEFAULT 'Assigned'");
    }
};
