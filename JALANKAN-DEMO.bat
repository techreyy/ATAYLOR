@echo off
REM Menjalankan seluruh demo A-Taylor: PostgreSQL 16 (port 5433), Laravel API (8000), Next.js (3000).
setlocal
set ROOT=%~dp0
set PATH=%ROOT%.devtools\php;%ROOT%.devtools\pgsql\bin;%PATH%

echo [1/3] Menyalakan PostgreSQL...
pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" status >nul 2>&1
if errorlevel 1 pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" start -w

echo [2/3] Menyalakan Laravel API di http://127.0.0.1:8000 ...
start "A-Taylor API" /D "%ROOT%API-ATAYLOR" cmd /k "php artisan serve --host=127.0.0.1 --port=8000"
start "A-Taylor Scheduler (BR-07)" /D "%ROOT%API-ATAYLOR" cmd /k "php artisan schedule:work"

echo [3/3] Menyalakan frontend di http://localhost:3000 ...
if not exist "%ROOT%WEB ATAYLOR\.next\BUILD_ID" (
  pushd "%ROOT%WEB ATAYLOR"
  call npm run build
  popd
)
start "A-Taylor Web" /D "%ROOT%WEB ATAYLOR" cmd /k "npx next start -p 3000"

timeout /t 5 >nul
start "" http://localhost:3000/login
echo Selesai. Akun demo: admin@ataylor.demo / ataylor123 (atau tombol masuk cepat di halaman login).
endlocal
