<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    // Define the application's command schedule.
    protected function schedule(Schedule $schedule): void
    {
        // schedule command; Flash sales need no expiry job.
        $schedule->command('complaints:auto-close')->daily();

        // A refund SSLCommerz has accepted is not finished until SSLCommerz says so
        $schedule->command('refunds:sync')->hourly()->withoutOverlapping();

        // A customer who abandons the payment page reports nothing
        $schedule->command('wallet:release-abandoned')->hourly()->withoutOverlapping();

        // An online order whose payment never completed is not an order at all.
        $schedule->command('orders:purge-unpaid')->everyFifteenMinutes()->withoutOverlapping();
    }

    // Register the commands for the application.
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
