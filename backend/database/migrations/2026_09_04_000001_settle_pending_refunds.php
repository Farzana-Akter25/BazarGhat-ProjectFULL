<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: settle pending refunds
return new class extends Migration
{
    // Refunds are settled automatically by the payment gateway, so the old multi-step payout states are no longer reachable.
    public function up(): void
    {
        DB::table('returns')
            ->whereIn('refund_status', ['Initiated', 'Processing', 'Completed'])
            ->where('status', '!=', 'Rejected')
            ->update([
                'resolution' => 'Refund',
                'refund_status' => 'Refunded',
                'refund_initiated_at' => DB::raw('COALESCE(refund_initiated_at, NOW())'),
                'refund_completed_at' => DB::raw('COALESCE(refund_completed_at, NOW())'),
            ]);

        // A rejected request must not leave its order stuck on "Refund Pending" either.
        $rejectedOrderIds = DB::table('returns')
            ->where('type', 'Refund')
            ->where('status', 'Rejected')
            ->whereNotIn('order_id', function ($query) {
                $query->select('order_id')
                    ->from('returns')
                    ->where('refund_status', 'Refunded');
            })
            ->pluck('order_id');

        DB::table('orders')
            ->where('payment_status', 'Refund Pending')
            ->whereIn('id', $rejectedOrderIds)
            ->update(['payment_status' => 'Paid']);

        DB::table('orders')
            ->where('payment_status', 'Refund Pending')
            ->update(['payment_status' => 'Refunded']);
    }

    // Settled refunds can't be un-settled — the money has left the gateway — so this is intentionally a no-op.
    public function down(): void
    {
    }
};
