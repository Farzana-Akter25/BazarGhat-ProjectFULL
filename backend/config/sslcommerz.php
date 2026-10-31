<?php

return [
    'store_id' => env('SSLCOMMERZ_STORE_ID'),
    'store_password' => env('SSLCOMMERZ_STORE_PASSWORD'),
    'is_sandbox' => env('SSLCOMMERZ_IS_SANDBOX', true),
    'session_url' => env('SSLCOMMERZ_SESSION_URL', 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'),
    'validation_url' => env('SSLCOMMERZ_VALIDATION_URL', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'),

    // Refund initiation and refund-status lookup are the same SSLCommerz endpoint, called with different parameters (bank_tran_id + refund_amount to initiate, refund_ref_id to check).
    'refund_url' => env('SSLCOMMERZ_REFUND_URL', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'),
    'refund_status_url' => env('SSLCOMMERZ_REFUND_STATUS_URL', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'),

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
    'backend_url' => env('BACKEND_URL', 'http://127.0.0.1:8000'),
];
