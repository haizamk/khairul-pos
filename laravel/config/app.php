<?php

return [
    'name' => env('APP_NAME', 'Khairul Fresh Food POS'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost:3000'),
    'timezone' => env('APP_TIMEZONE', 'Asia/Kuala_Lumpur'),
    'locale' => 'ms',
    'fallback_locale' => 'en',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];
