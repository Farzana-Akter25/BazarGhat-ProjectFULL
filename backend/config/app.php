<?php

use Illuminate\Support\Facades\Facade;
use Illuminate\Support\ServiceProvider;

return [

    // Application Name: This value is the name of  application.

    'name' => env('APP_NAME', 'Laravel'),

    // Application Environment: This value determines the "environment" the application is currently running in.

    'env' => env('APP_ENV', 'production'),

    // Application Debug Mode: When the application is in debug mode, detailed error messages with stack traces will be shown on every error that occurs within the application.

    'debug' => (bool) env('APP_DEBUG', false),

    // Application URL: This URL is used by the console to properly generate URLs when using the Artisan command line tool.

    'url' => env('APP_URL', 'http://localhost'),

    'asset_url' => env('ASSET_URL'),

    // Application Timezone: The default timezone for the application, which will be used by the PHP date and date-time functions.

    'timezone' => 'UTC',

    // Application Locale Configuration: The application locale determines the default locale that will be used by the translation service provider.

    'locale' => 'en',

    // Application Fallback Locale: The fallback locale determines the locale to use when the current one is not available.

    'fallback_locale' => 'en',

    // Faker Locale: This locale will be used by the Faker PHP library when generating fake data for the database seeds.

    'faker_locale' => 'en_US',

    // Encryption Key: This key is used by the Illuminate encrypter service and should be set to a random, 32 character string, otherwise these encrypted strings will not be safe.

    'key' => env('APP_KEY'),

    'cipher' => 'AES-256-CBC',

    // Maintenance Mode Driver: These configuration options determine the driver used to determine and manage Laravel's "maintenance mode" status.

    'maintenance' => [
        'driver' => 'file',
        // 'store' => 'redis'.
    ],

    // Autoloaded Service Providers: The service providers listed here will be automatically loaded on the request to the application.

    'providers' => ServiceProvider::defaultProviders()->merge([
        // Package Service Providers...

        // Application Service Providers...
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        // App\Providers\BroadcastServiceProvider::class.
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
    ])->toArray(),

    // Class Aliases: This array of class aliases will be registered when this application is started.

    'aliases' => Facade::defaultAliases()->merge([
        // 'Example' => App\Facades\Example::class.
    ])->toArray(),

];
