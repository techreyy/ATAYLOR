# Mengganti tampilan demo <-> fiks (dipanggil MODE-FIKS.bat / MODE-DEMO.bat).
# demo = masuk cepat akun demo, menu "Masuk sebagai", label MOCK.
# fiks = semua itu disembunyikan; modul yang belum tersambung data asli berlabel "Tahap berikutnya".
param([Parameter(Mandatory = $true)][ValidateSet('fiks', 'demo')][string]$Mode)

$Root = Split-Path -Parent $PSScriptRoot
$nilai = if ($Mode -eq 'demo') { 'true' } else { 'false' }

function Set-EnvValue([string]$File, [string]$Key, [string]$Value) {
    if (-not (Test-Path $File)) {
        Write-Host "    [lewati] $File belum ada - jalankan SETUP-DEMO.bat dulu." -ForegroundColor Yellow
        return
    }
    $found = $false
    $lines = @([IO.File]::ReadAllLines($File) | ForEach-Object {
        if ($_ -match "^$Key=") { $found = $true; "$Key=$Value" } else { $_ }
    })
    if (-not $found) { $lines += "$Key=$Value" }
    [IO.File]::WriteAllLines($File, [string[]]$lines)
    Write-Host "    $Key=$Value  ($File)"
}

Set-EnvValue (Join-Path $Root 'WEB ATAYLOR\.env.local') 'NEXT_PUBLIC_DEMO_MODE' $nilai
Set-EnvValue (Join-Path $Root 'API-ATAYLOR\.env') 'DEMO_LOGIN_ENABLED' $nilai

Write-Host ''
Write-Host "Mode $($Mode.ToUpper()) aktif." -ForegroundColor Green
Write-Host '1. Tutup semua jendela hitam demo (API, Scheduler, Web) bila masih terbuka.'
Write-Host '2. Jalankan JALANKAN-DEMO.bat - tampilan dibangun ulang otomatis (1-3 menit, sekali).'
if ($Mode -eq 'fiks') {
    Write-Host '3. Login dengan mengetik email & kata sandi (tombol masuk cepat disembunyikan).'
} else {
    Write-Host '3. Tombol masuk cepat akun demo kembali tampil di halaman login.'
}
