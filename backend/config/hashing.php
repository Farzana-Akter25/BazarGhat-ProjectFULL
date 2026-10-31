<?php

return [

    // Default Hash Driver: This option controls the default hash driver that will be used to hash passwords for the application.

    'driver' => 'bcrypt',

    // Bcrypt Options: Configuration options used when passwords are hashed using the Bcrypt algorithm.

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => true,
    ],

    // Argon Options: Configuration options used when passwords are hashed using the Argon algorithm.

    'argon' => [
        'memory' => 65536,
        'threads' => 1,
        'time' => 4,
        'verify' => true,
    ],

];
