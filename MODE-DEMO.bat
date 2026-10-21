@echo off
REM Kembali ke tampilan demo: masuk cepat akun demo, menu "Masuk sebagai", label MOCK.
REM Tampilan presentasi: MODE-FIKS.bat.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\atur-mode.ps1" -Mode demo
echo.
pause
