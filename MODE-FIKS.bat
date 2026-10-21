@echo off
REM Tampilan "fiks" untuk presentasi: tanpa masuk cepat akun demo & menu "Masuk sebagai";
REM label MOCK menjadi "Tahap berikutnya". Kembali ke mode demo: MODE-DEMO.bat.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\atur-mode.ps1" -Mode fiks
echo.
pause
