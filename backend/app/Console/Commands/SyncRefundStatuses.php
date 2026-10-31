<?php

namespace App\Console\Commands;

use App\Models\Refund;
use App\Services\RefundService;
use Illuminate\Console\Command;

// Verifies refunds SSLCommerz has accepted but not yet confirmed.
class SyncRefundStatuses extends Command
{
    // Command name plus the --limit option (default 100)
    protected $signature = 'refunds:sync {--limit=100 : How many open refunds to check in one pass}';

    protected $description = 'Verify open SSLCommerz refunds against the gateway and settle them';

    // Check open gateway refunds and settle the ones SSLCommerz has finished
    public function handle(RefundService $refunds): int
    {
        // Load gateway refunds that are still open, oldest-checked first
        $open = Refund::where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)
            ->whereIn('status', Refund::OPEN_STATUSES)
            // A post-delivery refund waiting on an admin has never been sent
            ->where(fn ($q) => $q->where('source', '!=', Refund::SOURCE_POST_DELIVERY)
                ->orWhereNotNull('approved_at'))
            ->orderBy('last_checked_at')
            ->limit((int) $this->option('limit'))
            ->get();

        if ($open->isEmpty()) {
            $this->info('No open gateway refunds to verify.');

            return self::SUCCESS;
        }

        $settled = 0;

        // Ask the gateway about each refund and count the settled ones
        foreach ($open as $refund) {
            try {
                $result = $refunds->syncStatus($refund);

                $this->line("{$result->refund_number}: {$result->status}");

                if (! in_array($result->status, Refund::OPEN_STATUSES, true)) {
                    $settled++;
                }
            } catch (\Throwable $e) {
                // One unreachable refund must not stop the rest of the pass.
                report($e);
                $this->error("{$refund->refund_number}: {$e->getMessage()}");
            }
        }

        $this->info("Checked {$open->count()} refund(s); {$settled} settled.");

        return self::SUCCESS;
    }
}
