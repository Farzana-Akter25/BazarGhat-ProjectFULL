<?php

return [

    // Cross-Origin Resource Sharing (CORS) Configuration: Settings for cross-origin resource sharing or "CORS".

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],

    // Vite falls back to the next free port (5174, 5175, ...) whenever 5173 is already taken by another running dev server, so pin the allowlist to any localhost/127.0.0.1 port rather than a single hardcoded one.
    'allowed_origins_patterns' => ['#^http://(localhost|127\.0\.0\.1):\d+$#'],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
