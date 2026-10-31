<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Gives back refund balance stranded on an online order that never finished paying
class ReleaseAbandonedWalletOrders extends Command
{
    // Command name plus the --minutes option (default 120)
    protected $signature = 'wallet:release-abandoned {--minutes=120 : How long an order may sit unpaid before its balance is returned}';

    protected $description = 'Return refund balance held by online orders that never completed payment';

    // Find abandoned online orders that used wallet balance and refund that balance
    public function handle(WalletService $wallet): int
    {
        // Orders created before this time are considered abandoned
        $cutoff = now()->subMinutes((int) $this->option('minutes'));

        // Online orders only.
        $orders = Order::where('payment_gateway', 'SSLCOMMERZ')
            ->where('payment_status', 'Unpaid')
            ->where('status', 'Pending')
            ->where('wallet_amount', '>', 0)
            ->where('created_at', '<', $cutoff)
            ->get();

        $released = 0;

        foreach ($orders as $order) {
            try {
                DB::transaction(function () use ($order, $wallet) {
                    // Re-read under lock
                    $locked = Order::whereKey($order->id)->lockForUpdate()->first();

                    if (! $locked || $locked->payment_status !== 'Unpaid' || $locked->status !== 'Pending' || (int) $locked->wallet_amount <= 0) {
                        return;
                    }

                    // Restore stock and return the wallet balance used on this order
                    $this->restoreStock($locked);
                    $wallet->returnOrderFunds($locked);

                    // Mark the order as cancelled by the customer
                    $locked->update([
                        'status' => 'Cancelled',
                        'payment_status' => 'Unpaid',
                        'cancelled_by' => 'customer',
                    ]);

                    // Record the cancellation in the order timeline
                    OrderStatusHistory::create([
                        'order_id' => $locked->id,
                        'status' => 'Cancelled',
                        'note' => 'Payment was never completed — your refund balance has been returned.',
                        'changed_by_role' => 'system',
                    ]);
                });

                $released++;
            } catch (\Throwable $e) {
                // One stuck order must not stop the rest being released.
                report($e);
            }
        }

        $this->info("Released refund balance on {$released} abandoned order(s).");

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
