<?php

return [

    // Default Filesystem Disk: The default filesystem disk used by the framework.

    'default' => env('FILESYSTEM_DISK', 'local'),

    // Filesystem Disks: Any number of filesystem "disks" can be configured, including multiple disks of the same driver.

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

    ],

    // Symbolic Links: The symbolic links that will be created when the `storage:link` Artisan command is executed.

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
