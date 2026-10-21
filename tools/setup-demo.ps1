# Pemasang demo A-Taylor untuk laptop baru setelah clone dari GitHub (dipanggil SETUP-DEMO.bat).
# Mengisi .devtools (PHP 8.3, Composer, PostgreSQL 16 port 5433), .env, library, database + data contoh, build web.
# Aman dijalankan ulang: langkah yang sudah selesai dilewati.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = Split-Path -Parent $PSScriptRoot
$Dev = Join-Path $Root '.devtools'
$Dl = Join-Path $Dev 'dl'
$Api = Join-Path $Root 'API-ATAYLOR'
$Web = Join-Path $Root 'WEB ATAYLOR'
$PhpDir = Join-Path $Dev 'php'
$Php = Join-Path $PhpDir 'php.exe'
$Composer = Join-Path $Dl 'composer.phar'
$PgBin = Join-Path $Dev 'pgsql\bin'
$PgData = Join-Path $Dev 'pgdata'
$PgLog = Join-Path $Dev 'pg.log'

# Versi sama dengan laptop pengembang (AI_GUA.md bagian 1); checksum dicek agar unduhan tidak rusak/diganti.
$PhpZip = @{
    Urls   = @('https://windows.php.net/downloads/releases/archives/php-8.3.35-nts-Win32-vs16-x64.zip',
               'https://windows.php.net/downloads/releases/php-8.3.35-nts-Win32-vs16-x64.zip')
    File   = Join-Path $Dl 'php.zip'
    Sha256 = '25a8e2ac9ff30f1d768d1447c09a600617fa6e6082729f6e95f008b59c91fe45'
}
$PgZip = @{
    Urls   = @('https://get.enterprisedb.com/postgresql/postgresql-16.15-1-windows-x64-binaries.zip')
    File   = Join-Path $Dl 'pg.zip'
    Sha256 = '25e6fcdfb8caec38691bf461125e7564508760666f7b8e5dc6a5f0818f58f81e'
}

function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Yellow }

function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Perintah gagal ($LASTEXITCODE): $Exe $($Arguments -join ' ')" }
}

function Get-Download($spec) {
    if ((Test-Path $spec.File) -and ((Get-FileHash $spec.File -Algorithm SHA256).Hash -eq $spec.Sha256)) { return }
    foreach ($url in $spec.Urls) {
        Write-Host "    mengunduh $url"
        & curl.exe -L --fail --retry 3 -o $spec.File $url
        if ($LASTEXITCODE -eq 0 -and (Get-FileHash $spec.File -Algorithm SHA256).Hash -eq $spec.Sha256) { return }
    }
    throw "Unduhan gagal atau checksum tidak cocok: $($spec.File)"
}

# .NET ZipFile, bukan tar.exe: tar gagal membuka path ber-karakter Unicode (mis. nama user Windows).
function Expand-Zip($zipFile, $dest, [string[]]$skip = @()) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile)
    try {
        foreach ($entry in $zip.Entries) {
            if ($skip | Where-Object { $entry.FullName.StartsWith($_) }) { continue }
            $target = Join-Path $dest $entry.FullName
            if ($entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Force $target | Out-Null; continue }
            New-Item -ItemType Directory -Force (Split-Path -Parent $target) | Out-Null
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
        }
    } finally { $zip.Dispose() }
}

# ---------------------------------------------------------------------------
Step 'Memeriksa folder & Node.js'
# PostgreSQL Windows gagal berjalan bila path folder berisi huruf di luar ASCII.
if ($Root -match '[^\x00-\x7F]') {
    throw "Path folder berisi karakter khusus: $Root`nPindahkan/clone ulang ke folder sederhana, mis. C:\ATAYLOR, lalu jalankan SETUP-DEMO.bat lagi."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js belum terpasang. Pasang versi LTS dari https://nodejs.org lalu jalankan SETUP-DEMO.bat lagi.'
}
Write-Host "    Node $(node -v)"
New-Item -ItemType Directory -Force $Dl | Out-Null

Step 'PHP 8.3 + Composer'
if (-not (Test-Path $Php)) {
    Get-Download $PhpZip
    New-Item -ItemType Directory -Force $PhpDir | Out-Null
    Expand-Zip $PhpZip.File $PhpDir
}
$PhpIni = Join-Path $PhpDir 'php.ini'
if (-not (Test-Path $PhpIni)) {
    $ini = @('extension_dir = "ext"', 'memory_limit = 1G', 'upload_max_filesize = 10M', 'post_max_size = 12M')
    $ini += 'curl', 'fileinfo', 'gd', 'intl', 'mbstring', 'openssl', 'pdo_pgsql', 'pdo_sqlite', 'pgsql', 'sodium', 'sqlite3', 'zip' |
        ForEach-Object { "extension=$_" }
    Set-Content -Path $PhpIni -Value $ini -Encoding ASCII
}
if (-not (Test-Path $Composer)) {
    Invoke-Native 'curl.exe' @('-L', '--fail', '--retry', '3', '-o', $Composer, 'https://getcomposer.org/download/latest-stable/composer.phar')
}

Step 'PostgreSQL 16 (port 5433)'
if (-not (Test-Path (Join-Path $PgBin 'pg_ctl.exe'))) {
    Get-Download $PgZip
    # pgAdmin & StackBuilder tidak dipakai; dilewati agar lebih cepat dan hemat ruang.
    Expand-Zip $PgZip.File $Dev @('pgsql/pgAdmin 4/', 'pgsql/StackBuilder/')
}
$env:PATH = "$PhpDir;$PgBin;$env:PATH"
$env:PGPASSWORD = 'postgres_dev'
$newCluster = -not (Test-Path (Join-Path $PgData 'PG_VERSION'))
if ($newCluster) {
    $pwFile = Join-Path $Dev 'pwfile.tmp'
    Set-Content -Path $pwFile -Value 'postgres_dev' -Encoding ASCII -NoNewline
    try {
        Invoke-Native 'initdb.exe' @('-D', $PgData, '-U', 'postgres', '--pwfile', $pwFile, '--auth', 'scram-sha-256', '-E', 'UTF8', '--no-locale')
    } finally { Remove-Item $pwFile -ErrorAction SilentlyContinue }
}
# Lewat cmd agar keluaran galat pg_ctl tidak dianggap error oleh PowerShell 5.1.
cmd.exe /c "pg_ctl.exe -D `"$PgData`" -o `"-p 5433`" status >nul 2>&1"
if ($LASTEXITCODE -ne 0) { Invoke-Native 'pg_ctl.exe' @('-D', $PgData, '-l', $PgLog, '-o', '-p 5433', 'start', '-w') }
if ($newCluster) {
    # Role aplikasi bukan superuser agar Row-Level Security berlaku (sama dengan laptop pengembang).
    $psql = @('-h', '127.0.0.1', '-p', '5433', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q')
    Invoke-Native 'psql.exe' ($psql + @('-c', "CREATE ROLE ataylor_app LOGIN PASSWORD 'ataylor_app_dev'"))
    Invoke-Native 'psql.exe' ($psql + @('-c', 'CREATE DATABASE ataylor OWNER ataylor_app'))
    Invoke-Native 'psql.exe' ($psql + @('-c', 'CREATE DATABASE ataylor_test OWNER ataylor_app'))
}

Step 'Pengaturan API (.env)'
$ApiEnv = Join-Path $Api '.env'
if (-not (Test-Path $ApiEnv)) {
    @'
APP_NAME="A-Taylor API"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8001
APP_TIMEZONE=Asia/Makassar
APP_LOCALE=id
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=debug

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
DB_DATABASE=ataylor
DB_USERNAME=ataylor_app
DB_PASSWORD=ataylor_app_dev

SESSION_DRIVER=database
SESSION_LIFETIME=120
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
CACHE_STORE=database
MAIL_MAILER=log

DEMO_LOGIN_ENABLED=false
FRONTEND_URL=http://localhost:3000
'@ | Set-Content -Path $ApiEnv -Encoding ASCII
}

Step 'Library PHP (composer install)'
Push-Location $Api
try {
    Invoke-Native $Php @($Composer, 'install', '--no-interaction', '--prefer-dist')
    # Penanda waktu SETUP untuk tools\cek-build.ps1 (composer tidak selalu menulis ulang file ini)
    (Get-Item 'vendor\composer\installed.json').LastWriteTime = Get-Date
    if (-not (Select-String -Path $ApiEnv -Pattern '^APP_KEY=base64:' -Quiet)) {
        Invoke-Native $Php @('artisan', 'key:generate', '--force')
    }

    Step 'Database + data contoh'
    if ($newCluster) {
        Invoke-Native $Php @('artisan', 'migrate:fresh', '--seed', '--force')
    } else {
        Invoke-Native $Php @('artisan', 'migrate', '--force')
    }
} finally { Pop-Location }

Step 'Web (npm install + build)'
Push-Location $Web
try {
    if (-not (Test-Path '.env.local')) { Copy-Item '.env.example' '.env.local' }
    Invoke-Native 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    Invoke-Native 'npm.cmd' @('run', 'build')
} finally { Pop-Location }

Write-Host ''
Write-Host 'SETUP SELESAI. Jalankan JALANKAN-DEMO.bat untuk membuka demo.' -ForegroundColor Green
Write-Host 'Akun: admin@ataylor.demo / ataylor123 (mode fiks). Tombol masuk cepat: jalankan MODE-DEMO.bat.'
