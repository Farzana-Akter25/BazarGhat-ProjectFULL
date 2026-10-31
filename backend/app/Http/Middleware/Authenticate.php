<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

// Rejects requests that are not logged in
class Authenticate extends Middleware
{
    // Get the path the user should be redirected to when they are not authenticated
    protected function redirectTo(Request $request): ?string
    {
        // This app has no web "login" route
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        return route('login');
    }
}
