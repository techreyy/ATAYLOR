<?php

/*
| CORS untuk frontend Next.js (domain berbeda dari API). Login memakai token Bearer, bukan cookie.
| Lokal: semua origin. Online: isi CORS_ALLOWED_ORIGINS dengan domain frontend, pisahkan koma
| (mis. https://ataylor.vercel.app).
*/

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '*'))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,
];
