<?php

return [

    // Authentication Defaults: This option controls the default authentication "guard" and password reset options for the application.

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    // Authentication Guards: Every authentication guard for the application is defined here.

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],

    // User Providers: All authentication drivers have a user provider.

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],

        // 'users' => [ 'driver' => 'database', 'table' => 'users', ].
    ],

    // Resetting Passwords: Multiple password reset configurations can be set when there is more than one user table or model in the application and separate password reset settings are needed for specific user types.

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    // Password Confirmation Timeout: The amount of seconds before a password confirmation times out and the user is prompted to re-enter their password via the confirmation screen.

    'password_timeout' => 10800,

];
