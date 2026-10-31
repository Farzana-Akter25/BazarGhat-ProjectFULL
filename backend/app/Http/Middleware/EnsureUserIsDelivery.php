<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Allows the request through only for delivery man users
class EnsureUserIsDelivery
{
    // Return 403 if not logged in or not a delivery man, otherwise continue
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->role !== 'delivery') {
            return response()->json([
                'message' => 'Forbidden. Delivery access required.',
            ], 403);
        }

        return $next($request);
    }
}
