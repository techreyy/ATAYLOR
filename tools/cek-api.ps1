# Cek Laravel API di 127.0.0.1:8001 untuk JALANKAN-DEMO.bat.
# Exit 0 = API A-Taylor menjawab, 1 = port 8001 kosong, 2 = port 8001 dipakai aplikasi lain.
# -Tunggu N: ulangi sampai N detik selama hasilnya belum 0.
param([int]$Tunggu = 0)

function Get-Status {
    try {
        $r = Invoke-WebRequest 'http://127.0.0.1:8001/up' -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { return 0 }
    } catch {}
    $c = New-Object Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', 8001); return 2 } catch { return 1 } finally { $c.Dispose() }
}

$batas = (Get-Date).AddSeconds($Tunggu)
do {
    $s = Get-Status
    if ($s -eq 0 -or (Get-Date) -ge $batas) { exit $s }
    Start-Sleep -Seconds 1
} while ($true)
