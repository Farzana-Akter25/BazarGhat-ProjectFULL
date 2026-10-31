<?php

use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: backfill handed over replacements
return new class extends Migration
{
    // Delivers replacement orders whose collection run finished before the hand-over was wired up.
    public function up(): void
    {
        $stranded = Order::query()
            ->where('is_replacement', true)
            ->where('status', 'Confirmed')
            ->whereNotNull('replacement_for_order_id')
            ->whereHas('replacementFor', fn ($query) => $query->where('status', 'Returned'))
            ->get();

        foreach ($stranded as $replacement) {
            DB::transaction(function () use ($replacement) {
                $original = $replacement->replacementFor;

                $replacement->update([
                    'status' => 'Delivered',
                    // The same rule the delivery transition applies: reaching the customer is when an order counts as settled.
                    'payment_status' => 'Paid',
                ]);

                OrderStatusHistory::create([
                    'order_id' => $replacement->id,
                    'status' => 'Delivered',
                    'note' => "Handed over with the return collected on order {$original->order_number}.",
                    'changed_by_user_id' => null,
                    'changed_by_role' => 'system',
                ]);
            });
        }
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // Not reversed.
    }
};
