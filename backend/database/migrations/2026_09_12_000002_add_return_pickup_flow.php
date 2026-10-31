<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: add return pickup flow
return new class extends Migration
{
    // A return that is approved for replacement leaves the original order with goods still sitting at the customer's address, and until now the order stayed on "Delivered".
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY status ENUM(
            'Pending', 'Processing', 'Confirmed', 'Assigned', 'Picked Up', 'Out for Delivery',
            'Delivered', 'Cancelled', 'Customer Rejected at Doorstep',
            'Return Approved', 'Return Pickup Assigned', 'Returned'
        ) NOT NULL DEFAULT 'Pending'");

        DB::statement("ALTER TABLE delivery_assignments MODIFY rider_status ENUM(
            'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered',
            'Customer Rejected at Doorstep', 'Failed', 'Return Picked Up'
        ) NOT NULL DEFAULT 'Assigned'");

        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->enum('type', ['Delivery', 'Return Pickup'])
                ->default('Delivery')
                ->after('area');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // Orders sitting on the return branch fold back to the status they were on before the return was approved, rather than being truncated away.
        DB::statement("UPDATE orders SET status = 'Delivered'
            WHERE status IN ('Return Approved', 'Return Pickup Assigned', 'Returned')");

        DB::statement("UPDATE delivery_assignments SET rider_status = 'Delivered'
            WHERE rider_status = 'Return Picked Up'");

        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        DB::statement("ALTER TABLE delivery_assignments MODIFY rider_status ENUM(
            'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered',
            'Customer Rejected at Doorstep', 'Failed'
        ) NOT NULL DEFAULT 'Assigned'");

        DB::statement("ALTER TABLE orders MODIFY status ENUM(
            'Pending', 'Processing', 'Confirmed', 'Assigned', 'Picked Up', 'Out for Delivery',
            'Delivered', 'Cancelled', 'Customer Rejected at Doorstep'
        ) NOT NULL DEFAULT 'Pending'");
    }
};
