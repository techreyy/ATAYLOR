@echo off
REM Menjalankan test otomatis backend (PHPUnit) memakai database terpisah ataylor_test.
REM Data demo (database ataylor) tidak tersentuh.
setlocal
set ROOT=%~dp0
set PATH=%ROOT%.devtools\php;%ROOT%.devtools\pgsql\bin;%PATH%

echo Menyalakan PostgreSQL (bila belum menyala)...
pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" status >nul 2>&1
if errorlevel 1 pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" start -w

echo.
echo Menjalankan test...
pushd "%ROOT%API-ATAYLOR"
php artisan test
set RESULT=%errorlevel%
popd

echo.
if %RESULT%==0 (echo SEMUA TEST LULUS.) else (echo ADA TEST YANG GAGAL - lihat daftar di atas.)
pause
endlocal
exit /b %RESULT%
