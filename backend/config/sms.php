<?php

return [
    // Which channel actually delivers the message.
    'driver' => env('SMS_DRIVER', 'log'),

    // When true, the send-OTP endpoint returns the code in its JSON response so the whole flow can be demonstrated without a real SMS.
    'expose_code' => env('SMS_EXPOSE_CODE', false),

    // seconds to wait on the provider before giving up — a hung gateway must not hang the checkout request behind it
    'timeout' => (int) env('SMS_TIMEOUT', 10),

    'alpha' => [
        'api_key' => env('ALPHA_SMS_API_KEY'),
        // optional: only works once sms.net.bd has approved a branded sender id
        'sender_id' => env('ALPHA_SMS_SENDER_ID'),
        'url' => env('ALPHA_SMS_URL', 'https://api.sms.net.bd/sendsms'),
    ],
];
