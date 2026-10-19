# Deploy Online Sementara — Vercel (web) + Render (API & PostgreSQL)

> Tujuan: link demo untuk presentasi. **Hanya data contoh** — jangan masukkan data pelanggan asli.
> Untuk produksi nanti (VPS + Docker Compose, R2, Redis) lihat `AI_GUA.md` §6 Fase 4; pengaturan di bawah tinggal diganti.

Urutan: **1. GitHub → 2. Render (database + API) → 3. Vercel (web) → 4. sambungkan CORS.**

## 1. GitHub
Repo: `https://github.com/techreyy/ATAYLOR` (sebaiknya **Private**). Setiap `git push` ke `main` membuat Vercel & Render deploy ulang otomatis.

## 2. Render — PostgreSQL
1. render.com → **New → Postgres**. Versi **16**, region **Singapore**.
2. Setelah jadi, salin **Internal Database URL** (dipakai API di Render).

> Role database Render bukan superuser, jadi Row-Level Security (RLS) tetap berlaku. Saat API menyala, log menulis
> `Role database non-superuser: RLS aktif.` — bila muncul `PERINGATAN ... superuser`, isolasi tenant hanya dari filter aplikasi.

## 3. Render — Laravel API
1. **New → Web Service** → hubungkan repo GitHub.
2. **Root Directory:** `API-ATAYLOR` · **Language/Runtime:** Docker (memakai `API-ATAYLOR/Dockerfile`) · region **Singapore**.
3. **Health Check Path:** `/up`
4. **Environment Variables:**

| Nama | Nilai |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | hasil `php artisan key:generate --show` (lihat di bawah) — **jangan pakai APP_KEY lokal** |
| `APP_URL` | URL Render, mis. `https://ataylor-api.onrender.com` |
| `APP_TIMEZONE` | `Asia/Makassar` |
| `LOG_CHANNEL` | `stderr` |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | Internal Database URL dari langkah 2 |
| `DEMO_LOGIN_ENABLED` | `false` |
| `SEED_USER_PASSWORD` | kata sandi baru untuk semua akun contoh (bukan `ataylor123`) |
| `CORS_ALLOWED_ORIGINS` | sementara `*`, setelah langkah 4 diganti domain Vercel |
| `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` | `database` / `database` / `sync` |
| `FILESYSTEM_DISK` | `local` |

Membuat `APP_KEY` di laptop (ketik di Claude Code):
```
! "R:\JOB\Web ATAYLOR\.devtools\php\php.exe" "R:\JOB\Web ATAYLOR\API-ATAYLOR\artisan" key:generate --show
```

Setiap kali menyala, container menjalankan `docker/start.sh`: cache konfigurasi → `migrate --force` →
`app:prepare-deploy` (isi data contoh **hanya bila database kosong**, cek role RLS) → penjadwal BR-07 → server.

Cek: buka `https://<api>.onrender.com/up` → halaman "Application up".

## 4. Vercel — Next.js
1. vercel.com → **Add New → Project** → impor repo GitHub.
2. **Root Directory:** `WEB ATAYLOR` (Framework: Next.js terdeteksi otomatis).
3. **Environment Variables:**

| Nama | Nilai |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api>.onrender.com/api/v1` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` (menyembunyikan "Masuk cepat akun demo" & "Masuk sebagai") |

4. Deploy. Nilai `NEXT_PUBLIC_*` ditanam saat build — bila diubah, **Redeploy**.
5. Kembali ke Render: ubah `CORS_ALLOWED_ORIGINS` menjadi domain Vercel, mis. `https://ataylor.vercel.app` (tanpa `/` di akhir).

## Login online
Email akun contoh sama dengan lokal (`admin@`, `owner@`, `manager@`, `designer@ataylor.demo`), kata sandi = `SEED_USER_PASSWORD`.

## Keterbatasan versi sementara
- **Render paket gratis tidur setelah ±15 menit tanpa akses**; akses pertama bisa ±1 menit. Buka link beberapa menit sebelum presentasi.
- **Database gratis Render punya masa berlaku** (cek dashboard Render).
- **File unggahan** (bukti bayar, mockup, foto QC) tersimpan di disk container dan **hilang saat deploy ulang/restart** — sampai disk dipindah ke Cloudflare R2.
- Token login masih di `localStorage` (lihat AI_GUA §6 sebelum dipakai sungguhan).
- Mengulang data contoh: hapus & buat ulang database Render, lalu deploy ulang API.
