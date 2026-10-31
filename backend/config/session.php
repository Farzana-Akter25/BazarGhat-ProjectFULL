<?php

use Illuminate\Support\Str;

return [

    // Default Session Driver: This option controls the default session "driver" that will be used on requests.

    'driver' => env('SESSION_DRIVER', 'file'),

    // Session Lifetime: The number of minutes the session is allowed to remain idle before it expires.

    'lifetime' => env('SESSION_LIFETIME', 120),

    'expire_on_close' => false,

    // Session Encryption: This option specifies whether all session data should be encrypted before it is stored.

    'encrypt' => false,

    // Session File Location: When using the native session driver, we need a location where session files may be stored.

    'files' => storage_path('framework/sessions'),

    // Session Database Connection: When using the "database" or "redis" session drivers, a connection can be specified to manage these sessions.

    'connection' => env('SESSION_CONNECTION'),

    // Session Database Table: When using the "database" session driver, this is the table used to manage the sessions.

    'table' => 'sessions',

    // Session Cache Store: While using one of the framework's cache driven session backends a cache store can be listed to be used for these sessions.

    'store' => env('SESSION_STORE'),

    // Session Sweeping Lottery: Some session drivers must manually sweep their storage location to get rid of old sessions from storage.

    'lottery' => [2, 100],

    // Session Cookie Name: The name of the cookie used to identify a session instance by ID.

    'cookie' => env(
        'SESSION_COOKIE',
        Str::slug(env('APP_NAME', 'laravel'), '_').'_session'
    ),

    // Session Cookie Path: The session cookie path determines the path for which the cookie will be regarded as available.

    'path' => '/',

    // Session Cookie Domain: The domain of the cookie used to identify a session in the application.

    'domain' => env('SESSION_DOMAIN'),

    // HTTPS Only Cookies: By setting this option to true, session cookies will only be sent back to the server if the browser has a HTTPS connection.

    'secure' => env('SESSION_SECURE_COOKIE'),

    // HTTP Access Only: Setting this value to true will prevent JavaScript from accessing the value of the cookie and the cookie will only be accessible through the HTTP protocol.

    'http_only' => true,

    // Same-Site Cookies: This option determines how cookies behave when cross-site requests take place, and can be used to mitigate CSRF attacks.

    'same_site' => 'lax',

    // Partitioned Cookies: Setting this value to true will tie the cookie to the top-level site for a cross-site context.

    'partitioned' => false,

];
