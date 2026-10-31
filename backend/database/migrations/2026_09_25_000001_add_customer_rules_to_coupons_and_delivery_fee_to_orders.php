<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: customer-history rules on admin coupons, and the delivery fee an order actually charged
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            // customer must already have this many delivered orders
            $table->unsignedInteger('min_completed_orders')->nullable()->after('first_order_only');
            // customer must already have spent this much on delivered orders
            $table->unsignedInteger('min_total_spent')->nullable()->after('min_completed_orders');
        });

        // System coupons were never meant to be per-customer limited; they only picked up the column default
        DB::table('coupons')->where('generated_by', 'System')->update(['per_user_limit' => null]);

        Schema::table('orders', function (Blueprint $table) {
            // delivery fee charged on this order (0 when a coupon waived it)
            $table->unsignedInteger('delivery_fee')->default(0)->after('discount');
        });

        // Before cash-discount coupons existed, total - subtotal was always the delivery fee charged
        DB::table('orders')->update([
            'delivery_fee' => DB::raw('GREATEST(CAST(total_amount AS SIGNED) - CAST(subtotal AS SIGNED), 0)'),
        ]);
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['min_completed_orders', 'min_total_spent']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivery_fee');
        });
    }
};
