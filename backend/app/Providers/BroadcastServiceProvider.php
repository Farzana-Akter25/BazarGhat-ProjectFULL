<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

// Registers the broadcasting routes and channels
class BroadcastServiceProvider extends ServiceProvider
{
    // Bootstrap any application services.
    public function boot(): void
    {
        Broadcast::routes();

        require base_path('routes/channels.php');
    }
}
