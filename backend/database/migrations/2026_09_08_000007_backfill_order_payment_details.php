<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: backfill order payment details
return new class extends Migration
{
    // Orders placed before the gateway columns existed still need to describe their own payment so the refund screens can read them uniformly.
    public function up(): void
    {
        DB::table('orders')
            ->where('payment_method', 'SSLCommerz')
            ->whereNull('payment_gateway')
            ->update([
                'payment_gateway' => 'SSLCOMMERZ',
                'transaction_id' => DB::raw('order_number'),
            ]);

        DB::table('orders')
            ->where('payment_method', 'SSLCommerz')
            ->whereIn('payment_status', ['Paid', 'Refund Pending', 'Refunded'])
            ->where('paid_amount', 0)
            ->update([
                'paid_amount' => DB::raw('total_amount'),
                'paid_at' => DB::raw('COALESCE(paid_at, updated_at)'),
            ]);
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
    }
};
