# Untuk JALANKAN-DEMO.bat: apakah tampilan web perlu di-build ulang setelah git pull?
# Exit 0 = build masih sesuai kode; 1 = kode web lebih baru dari build (build ulang otomatis);
# 2 = library berubah sejak SETUP terakhir (perlu SETUP-DEMO.bat, butuh internet).
$Root = Split-Path -Parent $PSScriptRoot
$Web = Join-Path $Root 'WEB ATAYLOR'
$Api = Join-Path $Root 'API-ATAYLOR'

# git pull memberi waktu ubah baru pada file yang berubah, jadi cukup membandingkan waktu file.
$library = @(
    @{ Sumber = (Join-Path $Web 'package-lock.json'); Hasil = (Join-Path $Web 'node_modules\.package-lock.json'); Nama = 'library web (npm)' },
    @{ Sumber = (Join-Path $Api 'composer.lock'); Hasil = (Join-Path $Api 'vendor\composer\installed.json'); Nama = 'library PHP (composer)' }
)
foreach ($l in $library) {
    if (-not (Test-Path $l.Sumber)) { continue }
    if (-not (Test-Path $l.Hasil) -or (Get-Item $l.Sumber).LastWriteTimeUtc -gt (Get-Item $l.Hasil).LastWriteTimeUtc) {
        Write-Host "    $($l.Nama) berubah sejak SETUP terakhir."
        exit 2
    }
}

$buildId = Join-Path $Web '.next\BUILD_ID'
if (-not (Test-Path $buildId)) { exit 1 }
$waktuBuild = (Get-Item $buildId).LastWriteTimeUtc

$file = @()
foreach ($dir in @('src', 'public')) {
    $p = Join-Path $Web $dir
    if (Test-Path $p) { $file += Get-ChildItem $p -Recurse -File }
}
foreach ($f in @('package.json', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs', 'tsconfig.json', '.env.local')) {
    $p = Join-Path $Web $f
    if (Test-Path $p) { $file += Get-Item $p }
}
$baru = $file | Where-Object { $_.LastWriteTimeUtc -gt $waktuBuild } | Select-Object -First 1
if ($baru) {
    Write-Host "    kode web lebih baru dari build terakhir (mis. $($baru.Name))."
    exit 1
}
exit 0
