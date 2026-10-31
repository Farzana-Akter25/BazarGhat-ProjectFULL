<?php

namespace App\Console\Commands;

use App\Services\ComplaintWorkflowService;
use Illuminate\Console\Command;

// Artisan command that closes finished complaints after their appeal window
class AutoCloseComplaints extends Command
{
    // Command name used on the CLI and in the scheduler
    protected $signature = 'complaints:auto-close';

    protected $description = 'Automatically close Resolved/Rejected complaints once the appeal window has passed';

    // Run the auto-close and report how many complaints were closed
    public function handle(ComplaintWorkflowService $workflow): int
    {
        // Close every Resolved/Rejected complaint whose appeal window has expired
        $count = $workflow->autoCloseDue();

        $this->info("Closed {$count} complaint(s).");

        return self::SUCCESS;
    }
}
