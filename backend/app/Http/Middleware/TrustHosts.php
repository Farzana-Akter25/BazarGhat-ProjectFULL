<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustHosts as Middleware;

// Lists which host names the app trusts
class TrustHosts extends Middleware
{
    // Get the host patterns that should be trusted.
    public function hosts(): array
    {
        return [
            $this->allSubdomainsOfApplicationUrl(),
        ];
    }
}
