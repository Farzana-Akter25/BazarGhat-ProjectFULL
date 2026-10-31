<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Product;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Removes online orders whose payment never completed.
class PurgeUnpaidOnlineOrders extends Command
{
    // Command name plus the --minutes option (default 60)
    protected $signature = 'orders:purge-unpaid {--minutes=60 : How long an online order may sit unpaid before it is removed}';

    protected $description = 'Delete online orders whose gateway payment was never completed';

    // Find stale unpaid online orders and delete them one by one
    public function handle(WalletService $wallet): int
    {
        // Orders created before this time are considered abandoned
        $cutoff = now()->subMinutes((int) $this->option('minutes'));

        // Load online orders still waiting on payment that are older than the cutoff
        $orders = Order::awaitingOnlinePayment()
            ->where('created_at', '<', $cutoff)
            ->get();

        $purged = 0;

        // Each order is purged in its own transaction
        foreach ($orders as $order) {
            try {
                DB::transaction(function () use ($order, $wallet, &$purged) {
                    // Re-read under lock
                    $locked = Order::whereKey($order->id)->lockForUpdate()->first();

                    if (! $locked || ! $locked->isAwaitingOnlinePayment()) {
                        return;
                    }

                    // Put the reserved stock back on the shelf
                    $this->restoreStock($locked);
                    // Keyed per order in the ledger
                    $wallet->returnOrderFunds($locked);

                    // Remove the unpaid order completely
                    $locked->delete();

                    $purged++;
                });
            } catch (\Throwable $e) {
                // One stuck order must not stop the rest being purged.
                report($e);
            }
        }

        $this->info("Purged {$purged} unpaid online order(s).");

        return self::SUCCESS;
    }

    // Add each item's quantity back to its product stock
    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product_id) {
                Product::where('id', $item->product_id)->increment('stock', $item->quantity);
            }
        }
    }
}
