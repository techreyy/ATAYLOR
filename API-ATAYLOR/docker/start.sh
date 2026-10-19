#!/bin/sh
# Dijalankan setiap kali container menyala: cache konfigurasi, migrasi, data contoh (hanya bila DB kosong),
# penjadwal BR-07 di latar belakang, lalu server HTTP di port $PORT.
set -e

php artisan config:cache
php artisan route:cache
php artisan migrate --force
php artisan app:prepare-deploy

php artisan schedule:work > /dev/null 2>&1 &

exec frankenphp php-server --listen ":${PORT:-8000}" --root public/
