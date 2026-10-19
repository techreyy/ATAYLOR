# Deploy Online Sementara — Vercel (web) + Render (API) + Neon (PostgreSQL)

> Tujuan: link demo untuk presentasi. **Hanya data contoh** — jangan masukkan data pelanggan asli.
> Untuk produksi nanti (VPS + Docker Compose, R2, Redis) lihat `AI_GUA.md` §6 Fase 4; pengaturan di bawah tinggal diganti.

## 0. Demo di laptop lain (offline, gratis) — dipakai untuk presentasi
Render, Koyeb, alwaysdata meminta kartu dan Docker Space Hugging Face kini wajib PRO, jadi presentasi memakai
laptop presenter (Windows):
1. Pasang **Git** dan **Node.js LTS** (nodejs.org). Pemilik repo mengundang presenter sebagai collaborator GitHub.
2. `git clone https://github.com/techreyy/ATAYLOR.git` (atau unduh ZIP dari GitHub).
3. Klik **`SETUP-DEMO.bat`** sekali (butuh internet ±500 MB, 10–20 menit): PHP 8.3, Composer, PostgreSQL 16
   (port 5433) ke `.devtools/`, `.env` + `APP_KEY` baru, `composer install`, database + data contoh, `npm ci` + build.
   Aman diulang bila terputus.
4. Saat presentasi klik **`JALANKAN-DEMO.bat`** (tanpa internet). Akun: `admin@ataylor.demo` / `ataylor123`.
   `RESET-DATA-DEMO.bat` mengembalikan data contoh.

Bagian di bawah ini (online) tetap disimpan untuk nanti bila memakai hosting berbayar.

Urutan: **1. GitHub → 2. Neon (database) → 3. Render (API) → 4. Vercel (web) → sambungkan CORS.**

## 1. GitHub
Repo: `https://github.com/techreyy/ATAYLOR` (sebaiknya **Private**). Setiap `git push` ke `main` membuat Vercel & Render deploy ulang otomatis.

## 2. Neon — PostgreSQL (gratis, tanpa kartu)
1. neon.tech → **New Project**. Postgres **16**, region **AWS Asia Pacific (Singapore)**.
2. **Jangan pakai role bawaan (`neondb_owner`) untuk API**: role buatan Console/API Neon adalah anggota
   `neon_superuser` yang ber-**BYPASSRLS**, sehingga Row-Level Security tidak berlaku. Buat role khusus lewat
   **SQL Editor** (role buatan SQL tidak ikut `neon_superuser`):
   ```sql
   CREATE ROLE ataylor_app WITH LOGIN PASSWORD 'ganti-sandi-panjang';
   GRANT CONNECT, CREATE ON DATABASE neondb TO ataylor_app;
   GRANT USAGE, CREATE ON SCHEMA public TO ataylor_app;
   ```
3. Susun `DB_URL` dari **Connection string** Neon dengan **Connection pooling OFF** (host tanpa `-pooler`) —
   konteks tenant (`set_config(..., false)`) berlaku per sesi koneksi, jadi tidak boleh lewat PgBouncer mode transaksi:
   `postgresql://ataylor_app:<sandi>@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

> Saat API menyala, log harus menulis `Role database non-superuser: RLS aktif.` — bila muncul
> `PERINGATAN ... superuser/BYPASSRLS`, `DB_URL` masih memakai `neondb_owner`.

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
| `DB_URL` | URL Neon dari langkah 2 (role `ataylor_app`, host tanpa `-pooler`, `?sslmode=require`) |
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

## 3b. Hugging Face Spaces — Laravel API (pengganti Render bila diminta kartu)
> **Sejak ±Juli 2026 Docker Space wajib akun PRO** (berbayar). Langkah ini hanya berlaku bila memakai PRO.

Dulu gratis tanpa kartu. Space harus **Public** agar API bisa diakses, tapi kode tetap privat: Space hanya berisi
`deploy/huggingface/Dockerfile` + `README.md`; kode diambil dari GitHub saat build.

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate**: hanya repo `ATAYLOR`,
   izin **Contents: Read-only**. Salin token.
2. huggingface.co → **New Space** → SDK **Docker** (Blank) → **Public** → hardware **CPU basic (free)**.
3. Di Space → **Files → Add file → Create new file**: buat `Dockerfile` dan `README.md` (timpa yang ada) dengan isi
   persis dari `deploy/huggingface/`.
4. Space → **Settings → Variables and secrets → New secret**:

| Nama | Nilai |
|---|---|
| `GITHUB_TOKEN` | token langkah 1 (dipakai hanya saat build) |
| `APP_KEY` | hasil `key:generate --show` |
| `SEED_USER_PASSWORD` | kata sandi akun contoh |
| `DB_URL` | URL Neon (langkah 2). **Kosongkan/hapus** bila log menunjukkan koneksi ke Neon gagal (port 5432 diblokir) → API memakai PostgreSQL di dalam container (data contoh terisi ulang tiap restart) |

   Variabel lain sudah ada di Dockerfile; `APP_URL` otomatis dari `SPACE_HOST`. `CORS_ALLOWED_ORIGINS` bisa
   ditambah sebagai **Variable** untuk menimpa `*`.
5. **Settings → Factory rebuild**. URL API: `https://<user>-<space>.hf.space` (cek `/up`). Setiap `git push` ke GitHub
   **tidak** otomatis membangun ulang Space — tekan **Factory rebuild**.
6. Space gratis tidur setelah 48 jam tanpa akses; bangun saat dibuka (perlu ±1–2 menit).

## 4. Vercel — Next.js
1. vercel.com → **Add New → Project** → impor repo GitHub.
2. **Root Directory:** `WEB ATAYLOR` (Framework: Next.js terdeteksi otomatis).
3. **Environment Variables:**

| Nama | Nilai |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api>.onrender.com/api/v1` atau `https://<user>-<space>.hf.space/api/v1` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` (menyembunyikan "Masuk cepat akun demo" & "Masuk sebagai") |

4. Deploy. Nilai `NEXT_PUBLIC_*` ditanam saat build — bila diubah, **Redeploy**.
5. Kembali ke Render: ubah `CORS_ALLOWED_ORIGINS` menjadi domain Vercel, mis. `https://ataylor.vercel.app` (tanpa `/` di akhir).

## Login online
Email akun contoh sama dengan lokal (`admin@`, `owner@`, `manager@`, `designer@ataylor.demo`), kata sandi = `SEED_USER_PASSWORD`.

## Keterbatasan versi sementara
- **Render paket gratis tidur setelah ±15 menit tanpa akses**; akses pertama bisa ±1 menit. Buka link beberapa menit sebelum presentasi.
- **Neon gratis** tidak kedaluwarsa, tapi database tidur saat sepi (bangun ±1 detik) dan kuota penyimpanan/compute kecil — cukup untuk data contoh.
- **File unggahan** (bukti bayar, mockup, foto QC) tersimpan di disk container dan **hilang saat deploy ulang/restart** — sampai disk dipindah ke Cloudflare R2.
- Token login masih di `localStorage` (lihat AI_GUA §6 sebelum dipakai sungguhan).
- Mengulang data contoh: di SQL Editor Neon jalankan `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` lalu ulangi
  `GRANT USAGE, CREATE ON SCHEMA public TO ataylor_app;`, kemudian deploy ulang API.
