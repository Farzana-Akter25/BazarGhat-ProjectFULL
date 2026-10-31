<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Allows the request through only for customer users
class EnsureUserIsCustomer
{
    // Return 403 if not logged in or not a customer, otherwise continue
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->role !== 'customer') {
            return response()->json([
                'message' => 'Forbidden. Customer access required.',
            ], 403);
        }

        return $next($request);
    }
}
