<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: sync cash on delivery payment status
return new class extends Migration
{
    // A Cash on Delivery order is settled at the door, so it is Unpaid until the rider marks it Delivered and Paid from then on.
    public function up(): void
    {
        DB::table('orders')
            ->where('payment_method', 'Cash on Delivery')
            ->whereIn('payment_status', ['Paid', 'Unpaid'])
            ->where('status', 'Delivered')
            ->update(['payment_status' => 'Paid']);

        DB::table('orders')
            ->where('payment_method', 'Cash on Delivery')
            ->whereIn('payment_status', ['Paid', 'Unpaid'])
            ->where('status', '!=', 'Delivered')
            ->update(['payment_status' => 'Unpaid']);
    }

    // There is no record of what these rows held before, so this is intentionally a no-op.
    public function down(): void
    {
    }
};
