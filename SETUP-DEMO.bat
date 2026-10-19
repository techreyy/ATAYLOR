@echo off
REM Sekali saja setelah clone dari GitHub: memasang PHP, PostgreSQL, library, database + data contoh, build web.
REM Butuh internet (+-500 MB) dan Node.js LTS. Setelah selesai, buka demo dengan JALANKAN-DEMO.bat.
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\setup-demo.ps1"
if errorlevel 1 (
  echo.
  echo SETUP GAGAL - baca pesan merah di atas. Setelah diperbaiki, jalankan SETUP-DEMO.bat lagi.
)
pause
endlocal
