@echo off
REM Mengembalikan database ke data demo awal (semua perubahan uji coba dihapus).
setlocal
set ROOT=%~dp0
set PATH=%ROOT%.devtools\php;%ROOT%.devtools\pgsql\bin;%PATH%

pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" status >nul 2>&1
if errorlevel 1 pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" start -w

pushd "%ROOT%API-ATAYLOR"
php artisan migrate:fresh --seed --force
if exist "storage\app\public\tenants" rmdir /s /q "storage\app\public\tenants"
popd
echo Data demo sudah di-reset. Login ulang di browser.
endlocal
