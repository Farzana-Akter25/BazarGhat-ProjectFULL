<?php

return [

    // View Storage Paths: Most templating systems load templates from disk.

    'paths' => [
        resource_path('views'),
    ],

    // Compiled View Path: This option determines where all the compiled Blade templates will be stored for the application.

    'compiled' => env(
        'VIEW_COMPILED_PATH',
        realpath(storage_path('framework/views'))
    ),

];
