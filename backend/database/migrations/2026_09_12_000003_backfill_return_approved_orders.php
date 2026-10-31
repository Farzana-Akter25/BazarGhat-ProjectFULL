<?php

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\ReturnRequest;
use App\Services\InvoiceService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: backfill return approved orders
return new class extends Migration
{
    // Brings returns that were already approved for replacement onto the return branch the previous migration opened, so existing data reads the same way new data will.
    public function up(): void
    {
        $invoices = app(InvoiceService::class);

        // Replacement orders — and anything else that reached "Confirmed" without an invoice — get theirs now.
        $missing = OrderStatusHistory::where('status', 'Confirmed')
            ->pluck('order_id')
            ->unique()
            ->diff(Invoice::pluck('order_id'));

        Order::whereIn('id', $missing)->get()
            ->each(fn (Order $order) => $invoices->generateForOrder($order));

        // Original orders whose replacement has been issued but which are still sitting on "Delivered" with goods owed back.
        $orderIds = ReturnRequest::where('resolution', 'Replacement')
            ->whereNotNull('replacement_order_id')
            ->pluck('order_id')
            ->unique();

        Order::whereIn('id', $orderIds)
            ->where('status', 'Delivered')
            ->get()
            ->each(function (Order $order) {
                DB::transaction(function () use ($order) {
                    $order->update(['status' => 'Return Approved']);

                    OrderStatusHistory::create([
                        'order_id' => $order->id,
                        'status' => 'Return Approved',
                        'note' => 'Return approved for replacement — awaiting collection.',
                        'changed_by_user_id' => null,
                        'changed_by_role' => 'system',
                    ]);
                });
            });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // The status change is undone by the schema migration this one follows, which folds the whole return branch back to "Delivered".
    }
};
