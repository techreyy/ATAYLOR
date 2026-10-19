# Memindahkan setelan demo lama (API di port 8000) ke port 8001, untuk JALANKAN-DEMO.bat.
# Mengubah API-ATAYLOR\.env (APP_URL) dan WEB ATAYLOR\.env.local (NEXT_PUBLIC_API_URL) bila masih 8000.
# Exit 1 = web perlu di-build ulang (belum ada build, atau build lama masih memanggil port 8000).
$Root = Split-Path -Parent $PSScriptRoot
$Lama = '127.0.0.1:8000'
$Baru = '127.0.0.1:8001'

foreach ($f in @((Join-Path $Root 'API-ATAYLOR\.env'), (Join-Path $Root 'WEB ATAYLOR\.env.local'))) {
    if (-not (Test-Path $f)) { continue }
    $isi = [IO.File]::ReadAllText($f)
    if ($isi.Contains($Lama)) {
        [IO.File]::WriteAllText($f, $isi.Replace($Lama, $Baru))
        Write-Host "    setelan port diperbarui: $f"
    }
}

# Alamat API ditanam ke file JS saat build, jadi build lama harus diganti.
$chunks = Join-Path $Root 'WEB ATAYLOR\.next\static\chunks'
if (-not (Test-Path (Join-Path $Root 'WEB ATAYLOR\.next\BUILD_ID')) -or -not (Test-Path $chunks)) { exit 1 }
$baruAda = Get-ChildItem $chunks -Recurse -Filter *.js | Select-String -SimpleMatch "$Baru/api/v1" -List | Select-Object -First 1
if (-not $baruAda) { exit 1 }
exit 0
