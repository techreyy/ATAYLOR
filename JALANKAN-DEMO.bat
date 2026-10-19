@echo off
REM Menjalankan seluruh demo A-Taylor: PostgreSQL 16 (port 5433), Laravel API (8000), Next.js (3000).
REM Setiap bagian dicek dulu; bila gagal, penyebabnya ditampilkan dan browser tidak dibuka.
setlocal
set ROOT=%~dp0
set PATH=%ROOT%.devtools\php;%ROOT%.devtools\pgsql\bin;%PATH%
set CEK=powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\cek-api.ps1"

echo [0/3] Memeriksa hasil SETUP...
if not exist "%ROOT%.devtools\php\php.exe" goto belum_setup
if not exist "%ROOT%.devtools\pgsql\bin\pg_ctl.exe" goto belum_setup
if not exist "%ROOT%API-ATAYLOR\vendor\autoload.php" goto belum_setup
if not exist "%ROOT%API-ATAYLOR\.env" goto belum_setup
if not exist "%ROOT%WEB ATAYLOR\node_modules" goto belum_setup
php -v >nul 2>&1
if errorlevel 1 goto php_rusak

echo [1/3] Menyalakan PostgreSQL...
pg_ctl -D "%ROOT%.devtools\pgdata" -o "-p 5433" status >nul 2>&1
if errorlevel 1 pg_ctl -D "%ROOT%.devtools\pgdata" -l "%ROOT%.devtools\pg.log" -o "-p 5433" start -w
if errorlevel 1 goto pg_gagal

echo [2/3] Menyalakan Laravel API di http://127.0.0.1:8000 ...
%CEK%
if errorlevel 2 goto port_dipakai
if errorlevel 1 (
  start "A-Taylor API" /D "%ROOT%API-ATAYLOR" cmd /k "php artisan serve --host=127.0.0.1 --port=8000"
  start "A-Taylor Scheduler (BR-07)" /D "%ROOT%API-ATAYLOR" cmd /k "php artisan schedule:work"
) else (
  echo     API sudah menyala, dilewati.
)
%CEK% -Tunggu 30
if errorlevel 1 goto api_gagal
echo     API OK.

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
exit /b 0

:belum_setup
echo.
echo [GAGAL] SETUP belum selesai di laptop ini.
echo   Jalankan SETUP-DEMO.bat dulu (butuh internet) sampai muncul "SETUP SELESAI"
echo   tanpa tulisan merah, lalu jalankan JALANKAN-DEMO.bat lagi.
goto gagal

:php_rusak
echo.
echo [GAGAL] PHP tidak bisa berjalan di laptop ini.
echo   Biasanya karena "Microsoft Visual C++ Redistributable" belum terpasang.
echo   Unduh dan pasang: https://aka.ms/vs/17/release/vc_redist.x64.exe
echo   lalu jalankan JALANKAN-DEMO.bat lagi.
goto gagal

:pg_gagal
echo.
echo [GAGAL] Database PostgreSQL tidak mau menyala. Isi log terakhir:
powershell -NoProfile -Command "Get-Content '%ROOT%.devtools\pg.log' -Tail 15"
echo   Coba restart laptop lalu jalankan lagi. Kalau tetap gagal, foto layar ini dan kirim ke pengembang.
goto gagal

:port_dipakai
echo.
echo [GAGAL] Port 8000 sedang dipakai aplikasi lain (misalnya XAMPP, Laragon, atau server lain).
echo   Program yang memakai port 8000:
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess } | Select-Object Id, ProcessName, Path | Format-Table -AutoSize"
echo   Tutup program tersebut (atau restart laptop), lalu jalankan JALANKAN-DEMO.bat lagi.
goto gagal

:api_gagal
echo.
echo [GAGAL] Laravel API tidak menyala dalam 30 detik.
echo   Lihat jendela hitam "A-Taylor API": di sana tertulis penyebabnya.
echo   Foto jendela itu dan kirim ke pengembang.
goto gagal

:gagal
echo.
pause
endlocal
exit /b 1
