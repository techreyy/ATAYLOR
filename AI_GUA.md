# AI_GUA.MD — MASTER CONTEXT & SINGLE SOURCE OF TRUTH (SSOT)
> **Proyek:** Sistem Omnichannel Agentic Konveksi & Production Tracking (White-Label Ready)
> **Pemilik Produk:** A-Taylor Kendari
> **Acuan Dokumen (folder `ATAYLOR BAHAN/`):** SRS v1.0, PRD v9.0, Blueprint Arsitektur v2.0, Pemodelan Analisis UML, Checklist 3 Hari v1.0.
> **Instruksi Wajib untuk AI (Claude & Gemini di Antigravity):**
> 1. Baca seluruh file ini sebelum menulis atau mengubah kode.
> 2. Patuhi Tech Stack, Batas Domain, Design System, dan Aturan Bisnis BR-01 s.d. BR-27 (lengkap di bagian 2).
> 3. Gunakan **Repository/Adapter Pattern** di Frontend agar modul yang belum memiliki endpoint backend nyata tetap berjalan dengan Mock Data (ditandai badge `MOCK`, lihat bagian 7) tanpa perlu menulis ulang komponen UI saat disambungkan ke API Laravel/FastAPI.
> 4. **Wajib:** Setiap selesai mengerjakan satu fitur/task, **tambahkan entri baru** di bagian **8. PROGRESS & AI HANDOFF LOG** (jangan hapus entri lama).

---

## 1. ARSITEKTUR & TECH STACK KUNCI
- **Pola Arsitektur:** Layered Architecture + Modular Monolith (Laravel) + AI Service terpisah (FastAPI).
- **Frontend Web:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS **3.4**, Lucide Icons, shadcn/ui pattern. Lokasi: folder `WEB ATAYLOR/`.
- **Backend Inti (Sumber Kebenaran Bisnis):** **Laravel 12** (PHP 8.3) + Sanctum (token API) — Pola: `Controller tipis -> FormRequest -> Service -> Eloquent -> PostgreSQL`. Lokasi: folder `API-ATAYLOR/` (API di `/api/v1`, aturan bisnis di `app/Services/`).
  - Ekspor Excel memakai `phpoffice/phpspreadsheet` ^5 (`app/Services/ExecutiveExcelExport.php`).
  - Catatan: spesifikasi awal menyebut Laravel 11, tetapi Laravel 11 sudah habis masa dukungan keamanan dan diblokir Composer karena 7 security advisory — **jangan turunkan ke 11**.
- **Lingkungan Dev Lokal (portable, tanpa admin):** `.devtools/` berisi PHP 8.3.35, Composer, PostgreSQL 16.15 (port **5433**, data di `.devtools/pgdata`), API Laravel lokal port **8001**. Jalankan semua dengan `JALANKAN-DEMO.bat`; kembalikan data demo dengan `RESET-DATA-DEMO.bat`.
  - **Setelah `git pull` cukup `JALANKAN-DEMO.bat`** (sejak 21 Okt 2026): `tools/cek-build.ps1` membandingkan waktu file `WEB ATAYLOR/src`, `public`, & file konfigurasi web dengan `.next/BUILD_ID` → bila lebih baru, `npm run build` otomatis; bila `package-lock.json`/`composer.lock` lebih baru dari hasil instal (`node_modules/.package-lock.json`, `vendor/composer/installed.json`) → pesan "[GAGAL] Ada library baru" → jalankan `SETUP-DEMO.bat` (butuh internet). JALANKAN-DEMO juga menjalankan `php artisan migrate --force` setiap kali (tanpa perubahan = "Nothing to migrate"). **Jika menambah library baru, ingatkan presenter bahwa SETUP-DEMO.bat wajib dijalankan ulang.**
  - **Versi beku presentasi:** tag Git **`v1.1-presentasi`** (mode fiks; `v1.0-presentasi` = versi sebelum mode fiks, masih bermode demo). Lihat `CARA-PASANG-DEMO.txt` Langkah 4 & checklist sehari sebelum presentasi. Presentasi berikutnya ditonton dari laptop presenter — **tidak perlu deploy online** (keputusan pemilik 21 Okt 2026).
  - `.devtools/php/php.ini`: `upload_max_filesize = 10M`, `post_max_size = 12M` (bawaan PHP 2M/8M membuat foto HP gagal diunggah). `.devtools` tidak di-commit — **set nilai yang sama di server produksi** (dan `client_max_body_size` bila memakai Nginx). Setelah mengubah php.ini, server API harus dijalankan ulang.
  - Upload foto (bukti bayar, foto QC) dikompres di browser lewat `prepareUpload()` (`src/lib/image.ts`, sisi terpanjang 1920px, JPEG) sebelum dikirim; mockup tidak dikompres, hanya dicek ukurannya. Batas (`UPLOAD_LIMITS_MB`): bukti bayar 5 MB, foto QC 8 MB, mockup 8 MB.
  - Akun demo (kata sandi `ataylor123`): `admin@`, `owner@`, `manager@`, `designer@`, `superadmin@ataylor.demo`; tenant uji isolasi: `admin@tenantb.demo`.
  - **Mode FIKS / DEMO (keputusan pemilik 21 Okt 2026 — saat ini MODE FIKS):** satu sakelar `NEXT_PUBLIC_DEMO_MODE` (`WEB ATAYLOR/.env.local`, dibaca lewat `src/lib/app-mode.ts`, ditanam saat build) + `DEMO_LOGIN_ENABLED` (`API-ATAYLOR/.env`). `false` = **fiks**: tanpa masuk cepat akun demo & menu "Masuk sebagai", email login kosong, `<DemoMockBadge />` tampil sebagai "Tahap berikutnya" (sidebar: "Segera"), judul Chatbot tanpa kata "Simulasi". `true` = **demo**: semua itu + label `MOCK`. Ganti di laptop dengan `MODE-FIKS.bat` / `MODE-DEMO.bat` (`tools/atur-mode.ps1` mengubah kedua file env) → tutup jendela demo → `JALANKAN-DEMO.bat` (build ulang otomatis karena `.env.local` berubah). Bawaan pemasangan baru (`.env.example`, template `.env` di `tools/setup-demo.ps1`) = fiks. **Untuk kembali ke mode demo atas permintaan pemilik:** jalankan `MODE-DEMO.bat` (atau set kedua variabel ke `true` + build ulang web + restart API), dan bila ingin bawaan baru juga demo, ubah `.env.example` & template di `setup-demo.ps1` kembali ke `true`. Test PHPUnit selalu `DEMO_LOGIN_ENABLED=true` (`phpunit.xml`).
- **Online sementara (demo):** Vercel (`WEB ATAYLOR/`) + API di **Hugging Face Spaces** (`deploy/huggingface/`, karena Render/Koyeb minta kartu; `API-ATAYLOR/Dockerfile` untuk Render tetap ada) + **Neon** gratis (PostgreSQL; API wajib memakai role `ataylor_app` buatan SQL tanpa BYPASSRLS & host tanpa `-pooler`). Langkah & env lengkap di **`DEPLOY.md`**. Online: `NEXT_PUBLIC_DEMO_MODE=false`, `DEMO_LOGIN_ENABLED=false`, kata sandi akun contoh dari `SEED_USER_PASSWORD`, CORS dari `CORS_ALLOWED_ORIGINS` (`config/cors.php`).
- **Version control:** repo Git di root (remote `origin` = `https://github.com/techreyy/ATAYLOR.git`) `R:JOBWeb ATAYLOR` (branch `main`). `.devtools/`, `skydash-free/`, `node_modules`, `vendor`, `.next`, dan semua `.env` **tidak** di-commit — jangan pernah commit password/APP_KEY.
- **Test otomatis (wajib dijalankan setelah mengubah backend):** klik `JALANKAN-TEST.bat` (atau di PowerShell: `cd API-ATAYLOR; & "...devtoolsphpphp.exe" artisan test` — `php` portable tidak ada di PATH Windows) → PHPUnit di `tests/Feature/` memakai database terpisah `ataylor_test` (data demo `ataylor` tidak tersentuh). Saat ini 40 test / 352 assertion: login & RLS antar-tenant, RBAC (termasuk Owner akses semua), BR-02/04/05/06/07/08/09/10/11/12/24/27, nomor urut >999, file privat, rincian ukuran × jenis lengan, harga custom OMS, sakelar High/Low Season (Owner saja, tersimpan di tenant), ekspor Excel, bukti bayar wajib (tunai & transfer) & batas ukurannya, notifikasi per peran, katalog produk & pola pesanan AI, board CRM Designer & ambil tiket. Helper `api()` di `tests/TestCase.php` mengosongkan konteks tenant sebelum tiap request agar perilaku RLS sama dengan request nyata.
- **Berkas upload (bukti bayar, mockup, foto QC):** disimpan di disk **privat** (`storage/app/private/tenants/{tenant_id}/...`); kolom `*_url` berisi path, dan API mengembalikan **tautan bertanda tangan yang kedaluwarsa 30 menit** (`GET /api/v1/files/{path}`, middleware `signed`). Jangan simpan upload ke disk `public`.
- **AI & Orkestrasi Service:** Python 3.12 + FastAPI (Webhook WA, LLM Abstraction Layer: Gemini 2.5 Flash [Utama] & Claude Haiku 4.5 [Eskalasi], Mini Agent, Dynamic Lead Time Engine).
- **Database & Multi-Tenant:** PostgreSQL 16 (Shared Database, Shared Schema dengan kolom wajib `tenant_id` + Row-Level Security / RLS). `tenant_id` ditentukan server dari membership user, **tidak pernah** dari input browser.
- **Queue, Cache & Storage:** Redis (Laravel Queue/Horizon) & Cloudflare R2 (S3-compatible untuk Mockup, Bukti Bayar, Foto QC).
- **Akses Sistem:** Web ini **hanya untuk internal toko** (Admin, Owner, Manager, Designer, Super Admin). **Owner dapat mengakses semua fitur tenant** (keputusan pemilik 21 Okt 2026) — dijamin di server oleh middleware `EnsureRole` (Owner selalu lolos `role:...`) dan di UI (aksi Admin/Designer juga tampil untuk Owner). Hak peran lain tidak berubah. **Tidak ada portal/halaman publik untuk pelanggan** — pelanggan berinteraksi hanya lewat WhatsApp (Chatbot & Mini Agent).

---

## 2. ATURAN BISNIS (BR-01 s.d. BR-27 — sumber: SRS v1.0 §6)
Nilai yang ditandai **[disetujui pemilik]** adalah parameter baseline yang sudah diputuskan.

### 2.1 Order & Antrean
- **BR-01:** Setiap pesanan, online maupun offline, masuk ke satu antrean produksi terpusat dan memiliki ID unik.
- **BR-02:** Pesanan offline wajib diinput Admin dan wajib memuat tag marketing closer (`marketing_closer_id`); tanpa tag, pesanan ditolak server. Marketing tidak punya login.
- **BR-03:** Kuota produksi dan stok harus diverifikasi sebelum jadwal dijanjikan ke pelanggan (anti over-order).
- **BR-23:** Pesanan pelanggan tidak boleh dicampur dengan stok gudang ready-stock.

### 2.2 Desain & ACC
- **BR-04:** Tiket desain dibuat otomatis begitu pesanan valid masuk, dengan SLA pengerjaan yang dikonfigurasi (`products.design_sla_hours`).
- **BR-05:** Produksi tidak boleh dimulai tanpa ACC desain yang sah.
- **BR-06:** Klik tombol ACC di WhatsApp adalah persetujuan sah, **hanya untuk versi desain yang dikirim** (`design_version_id`), sekali pakai, dengan bukti tercatat di `design_approvals`.
- **BR-17:** Revisi gratis per pesanan ditetapkan Owner — **3x [disetujui pemilik]**. Revisi ke-4 dst. tetap boleh, tetapi ditandai `is_paid = true` dan dapat dikenai biaya (UI wajib menampilkan peringatan).
- **BR-21:** Sakelar otomasi `Off` (Low Season) tidak menghapus data; tiket & pesanan tetap dilacak, Admin meneruskan proofing WA secara manual dan mencatat bukti ACC.

### 2.3 Slot Locking & Pembayaran
- **BR-07:** Slot Lock sementara berlaku **24 jam sejak ACC**; bila pembayaran belum valid, kuota dilepas otomatis (`slot_lock_status = expired`) dan pelanggan diberi tahu.
- **BR-08:** Kuota terkunci permanen hanya setelah pembayaran divalidasi Admin. Tidak ada integrasi mutasi bank/payment gateway — semua verifikasi manual.
  - **Bukti bayar wajib [disetujui pemilik, revisi 21 Okt 2026]** untuk **tunai** (foto nota/kwitansi) maupun **transfer/online** (bukti transfer); tanpa bukti, pembayaran ditolak server (422) dan tombol "Catat Pembayaran" nonaktif.
  - **Sumber bukti bayar [disetujui pemilik, 21 Okt 2026]:** pesanan **online** → pelanggan mengirim bukti bayar lewat **WhatsApp/chatbot**, bukti **langsung masuk ke sistem** sebagai pembayaran `pending` di antrean Kasir, lalu tetap divalidasi manual Admin. Pesanan **offline** → **Admin menginput manual** (nominal + unggah bukti). Detail pesanan online menampilkan tombol **"Catat manual (cadangan)"** — **tetap dipertahankan** setelah integrasi WA jadi, sebagai cadangan (mis. mode Low Season BR-21 atau WA gangguan) [disetujui pemilik, 21 Okt 2026]. Integrasi WA belum dibangun (Fase 4).
- **BR-10:** Minimal pembayaran sebelum produksi ditetapkan Owner **per produk** di `products.dp_min_percent` (default **50% [disetujui pemilik]**). Nilai per produk adalah sumber kebenaran; 50% hanya default.
- **BR-22:** Pembatalan setelah produksi dimulai: **DP tidak dikembalikan [disetujui pemilik]**.

### 2.4 SPK, Produksi & Serah Terima
- **BR-09:** SPK Final (PDF bernomor unik) hanya diterbitkan jika pembayaran `valid` **DAN** `slot_lock_status = permanent`.
- **BR-27:** Admin **hanya** menerbitkan SPK Final. Komunikasi vendor, pengiriman bahan baku, dan penyerahan SPK (dispatch) dilakukan **Owner atau Manager**. Vendor eksternal tidak punya login.
- **BR-12:** Kanban WIP hanya maju **1 tahap berurutan**:
  `Antrean` -> `Proses Jahit` -> `Proses Bordir/Sablon` -> `QC Pabrik` -> `Tiba di Gudang Toko`.
  Mundur (*rework*) **wajib alasan tertulis**, dicatat di `wip_histories` **dan** `audit_logs`.
- **BR-13:** Admin wajib memperbarui status Kanban paling lambat akhir hari kerja setelah perpindahan fisik terjadi.
- **BR-24:** Foto fisik hasil QC wajib dilampirkan sebelum notifikasi selesai dikirim.
- **BR-11:** Pelunasan ditagih saat status QC Selesai & Tiba di Gudang; barang diserahkan setelah lunas, kecuali ada persetujuan Owner.

### 2.5 Inventory & Lead Time
- **BR-14:** Fast Track hanya ditawarkan bila stok tersedia dan tidak sedang direservasi; stok direservasi saat pelanggan setuju.
- **BR-15:** Dynamic Lead Time = tanggal mulai tersedia (berdasarkan antrean) + durasi standar produk + durasi desain/revisi, dibatasi kapasitas harian.
- **BR-16:** Bila kapasitas penuh, chatbot menolak atau mengusulkan tanggal baru; tidak boleh menjanjikan di luar tanggal terhitung.

### 2.6 AI, Komisi & Platform
- **BR-18:** Komisi marketing dihitung dari pesanan yang pembayarannya valid; persentase & syarat dikonfigurasi Owner (rumus belum final → Leaderboard tetap `MOCK`).
- **BR-19:** Perubahan harga, produk, dan aturan negosiasi hanya oleh Owner dan berlaku setelah sinkronisasi.
- **BR-20:** Chatbot hanya boleh memakai harga & produk dari AI Training Dashboard; di luar itu wajib eskalasi.
- **BR-25:** Eskalasi ke Owner hanya untuk: komplain besar, diskon di luar batas, pelanggaran SLA kritis, anomali pembayaran (prinsip Owner Offloading).
- **BR-26:** Setiap tenant mengelola data, produk, dan persona AI-nya sendiri; tidak ada berbagi data antartenant.

### 2.7 Siklus Status Pesanan (`orders.status`, sumber: SRS §7.3)
`brief_lengkap` -> `desain_dikerjakan` -> `menunggu_acc` (<-> `revisi`) -> `acc_disetujui` (slot lock 24j) -> `menunggu_pembayaran` -> `pembayaran_valid` -> `spk_terbit` -> **produksi** (tahap detail di `orders.wip_stage`) -> `menunggu_pelunasan` -> `selesai`.
Status samping: `dibatalkan`, `kedaluwarsa`, `ditahan`.

---

## 3. UI/UX & WEB DESIGN SYSTEM — TEMA SKYDASH + WARNA EMAS LOGO (FINAL, keputusan pemilik 18 Okt 2026)
Layout, bentuk, dan animasi mengikuti template **Skydash Free** (referensi: folder `skydash-free/`). Tema **diterjemahkan ulang ke Tailwind** — Bootstrap, jQuery, Chart.js, dan JS bawaan template **tidak dipasang**. **Warna ungu bawaan Skydash diganti emas benang logo A-Taylor** atas permintaan pemilik.

### 3.1 Aturan Tetap
1. **DILARANG warna ungu/violet/indigo** (`violet-*`, `indigo-*`, `purple-*`, #4B49AC, #7978E9, #4747A1, dsb.) — keputusan pemilik.
2. **Hanya token tema.** Pakai kelas `dash-*` dari `WEB ATAYLOR/tailwind.config.ts`; jangan menulis hex baru di halaman kecuali benar-benar perlu.
3. **Tanpa library grafik/animasi berat** (Recharts, Chart.js, Framer Motion). Grafik = Pure CSS/SVG; animasi = keyframes Tailwind/CSS.
4. **Tanpa gradient** pada kartu & teks (Skydash memakai warna solid).
5. **Ubah tampilan lewat komponen dasar dulu** (`components/ui/*`, `components/shell/*`) sebelum mengedit kelas di halaman. Komponen form yang tersedia: `SegmentedControl` (pilihan pil), `Switch` (sakelar), `QtyStepper` (angka bulat ≥ 0 dengan tombol −/+).
6. **Bahasa UI untuk staf toko, bukan programmer (keputusan pemilik 21 Okt 2026):** jangan tampilkan kode aturan (`BR-xx`, `FR-xx`), "SSOT", "Slice", "RBAC", "SRS/PRD", nama tabel database, "Pure CSS", badge "Live · Database", atau istilah endpoint/API di teks halaman, judul, tombol, toast, pesan notifikasi, maupun dokumen cetak. Kode aturan boleh tetap di komentar kode, kolom `code` respons API, dan dokumen ini. `errorMessage()` (`components/ui/error-state.tsx`) tidak lagi menambahkan prefiks kode BR ke pesan. Badge `MOCK` tetap dipakai sebagai penanda simulasi.
7. **Wajib responsif HP (≥ 360px) tanpa mengubah desain desktop:** tabel dibungkus `overflow-x-auto` (judul kolom otomatis satu baris), grid mulai 1 kolom lalu `md:`/`lg:`, tinggi minimum kolom/kartu hanya di `md:` ke atas. Cek dengan lebar 375px: tidak boleh ada konten terpotong atau scroll horizontal halaman.

### 3.2 Palet Warna (token `dash-*`)
- **Primer (emas logo):** `dash-primary` #F5B800 (hover `dash-primary-hover` #E0A700, latar lembut `dash-primary-soft` #FFF5D1).
  - **Kontras wajib:** teks/ikon di atas latar emas = `text-dash-ink` (#1F1F1F), **jangan putih**. Teks/link emas di atas latar putih = `text-dash-primary-strong` (#9A6B00), **jangan `text-dash-primary`**.
- **Kanvas:** `dash-bg` #F7F6F2 (krem hangat); kartu `bg-white`; garis `dash-line` #ECEAE3; hover tabel `dash-hover` #F3F0E6; teks `dash-text` #1F1F1F; teks redup `dash-muted` #6C7383.
- **Kartu KPI (pola Skydash):** emas `dash-primary` (teks `dash-ink`) · arang `dash-charcoal` #232227 · biru langit `dash-tale` #7DA0FA · coral `dash-light-danger` #F3797E (tiga terakhir teks putih).
- **Semantik:** success #57B657 · warning #FFC100 · danger #FF4747 · info #248AFD · grafik sekunder `dash-sky` #98BDFF. Peringatan merah lembut: `dash-danger-soft` (latar) / `dash-danger-line` (garis) / `dash-danger-strong` (teks) — sama dengan `<Notice tone="error">`.
- **Badge status** (komponen `<Badge>`): pil `rounded-full`, latar lembut + teks warna semantik — `blue` (Brief/Baru), `amber` (Menunggu ACC/Bayar/Lock 24j), `emerald` (Valid/SPK/Selesai), `red` (Revisi/Rework/Terlambat), `zinc` → arang lembut (WIP Produksi), `slate` (netral). Penanda simulasi tetap `<DemoMockBadge />` bertuliskan `MOCK`.

### 3.3 Bentuk & Layout
- **Kartu:** `rounded-card` (20px), tanpa border, `shadow-card`, naik ke `shadow-card-hover` saat hover. Header kartu `px-5 pt-4/5`, judul tebal 15px.
- **Sidebar:** putih (lebar 250px, bisa diciutkan ke 78px lewat tombol ☰ di navbar, tersimpan di localStorage; **di bawah 1024px menjadi drawer** yang digeser masuk dari kiri dengan latar gelap, tertutup otomatis saat pindah halaman), menu aktif/hover = latar emas `dash-primary` teks `dash-ink` `rounded-lg`, label seksi huruf kapital abu.
- **Navbar:** putih tinggi 64px dengan `shadow-navbar`: tombol ☰, breadcrumb, **pencarian cepat pesanan** (`components/shell/order-search.tsx`: kode ORD / nama pelanggan / closer lewat `GET /orders?q=`, jeda ketik 250 ms, maks. 6 hasil + badge status, ↑/↓ + Enter membuka detail, Esc menutup, tombol `/` memfokuskan; desktop = kolom selalu tampil, HP = ikon kaca pembesar membuka panel selebar layar; disembunyikan untuk Super Admin), lonceng notifikasi (`components/shell/notification-bell.tsx`, data live `GET /notifications`). **Tanpa** pil Otomasi / Role (dihapus 19 Okt 2026 atas permintaan pemilik — terlihat seperti pajangan dan menggandakan info sidebar).
- **Profil (atas sidebar):** satu baris ringkas — inisial, nama, nama peran; klik membuka menu "Keluar". Menu "Masuk sebagai" (ganti peran demo, badge `MOCK`) hanya tampil di mode demo (`NEXT_PUBLIC_DEMO_MODE=true`); mode fiks & online = `false`. Jangan pakai istilah teknis seperti "Aktor RBAC" di UI.
- **Tombol:** primer emas teks gelap `rounded-lg`, efek angkat 1px + `shadow-primary` (bayangan emas) saat hover; `outline` = putih dengan hover emas lembut.
- **Input:** `rounded-lg border-dash-line`; fokus global (globals.css) = border emas + ring emas 3px.
- **Logo** A-Taylor berlatar hitam → selalu ditaruh di kotak gelap `bg-[#111] rounded-xl`.
- **Halaman Login (`/login`, revisi pemilik 21 Okt 2026):** desktop (≥ 1024px) = **dua kolom** `lg:grid-cols-[1.2fr_1fr]` — kiri panel brand `bg-dash-charcoal` (label "A-Taylor Kendari", logo jarum `/logo.png` [jarum putih, cocok di latar gelap] mengambang, judul "Pusat kendali konveksi, dari chat sampai jahitan terakhir.", 3 poin: Pesanan WA & Toko, Kasir & SPK, Produksi Real-time), kanan kartu form seperti sebelumnya. **HP/tablet (< 1024px) tetap satu kartu** (panel brand `hidden lg:flex`). Wordmark `/logo-text.png` berteks gelap → jangan dipakai di panel gelap.

### 3.4 Tipografi & Data
- Grafik tren omzet Executive = `components/charts/daily-revenue-chart.tsx` (CSS murni): **semua tanggal periode ditampilkan** (hari tanpa pesanan = garis abu tipis, bukan dilewati), sumbu Y dibulatkan (`formatRupiahShort`: rb/jt/M di `lib/currency.ts`) + garis bantu, label tanggal maks. ±10, tooltip saat batang disorot/difokus (tanggal, nominal, jumlah order), ringkasan total/rata-rata/hari aktif/tertinggi di atas grafik.
- Font UI **Nunito** (`next/font/google`, sesuai Skydash); `JetBrains Mono` untuk ID, kode SPK, tanggal teknis.
- **Wajib `tabular-nums`** untuk nominal Rp, DP, sisa tagihan, qty, dan hitungan mundur.

### 3.5 Animasi (halus, ringan)
- Login: ornamen lingkaran melayang pelan `animate-drift` (12s) / `animate-drift-slow` (16s, arah berlawanan), logo & titik emas `animate-float` (6s), isi kartu & panel brand muncul berurutan lewat `.reveal-stagger` (globals.css, jeda 0,08s per elemen; dulu bernama `.login-stagger`). Semua CSS murni, tanpa library.
- Ringkasan Sistem (`/`): angka kartu KPI **berhitung naik sekali** saat data pertama dimuat (`useCountUp`, `src/lib/use-count-up.ts`, ±0,8s ease-out; dilewati bila kurangi gerakan aktif; perubahan berikutnya langsung tampil), lingkaran kartu hero `animate-drift`/`animate-drift-slow` & logo `animate-float`, 6 kartu modul muncul bergantian (`.reveal-stagger`) dan panah "→" bergeser saat hover, kartu Slot Lock 24 Jam diberi **titik putih berdenyut** (`animate-ping`) hanya bila ada slot menunggu DP. **Jangan** pasang animasi terus-menerus di halaman kerja (tabel OMS, Kasir, Kanban).
- Pindah halaman/ganti peran: konten `animate-fade-in-up`; beranda memakai `.dash-stagger` (anak muncul berurutan). Keduanya memakai fill-mode `backwards` — **jangan diganti `both`/`forwards`**: transform yang tertinggal membuat modal `fixed` di dalam halaman terkurung di area konten.
- Modal: latar `animate-fade-in` + blur tipis, panel `animate-scale-in`. Notifikasi `animate-slide-down`.
- Skeleton: kilau `dash-shimmer animate-shimmer`. Grafik batang `animate-grow-up`, progress bar `animate-grow-right`.
- Hover: kartu KPI naik 4px, tombol naik 1px, ikon sidebar membesar sedikit. Lonceng notifikasi `animate-ping`.
- `prefers-reduced-motion` dihormati (animasi dimatikan) dan animasi dimatikan saat cetak.

---

## 4. SITEMAP & 11 MODUL FRONTEND (TARGET DEMO 3 HARI)
Setiap halaman wajib punya 4 state: *Normal, Loading (Skeleton), Empty State, Error State*.

| No | Modul & Route Next.js | Status Target 3 Hari | Fitur Utama yang Harus Tampil |
|---|---|---|---|
| 1 | **Auth & Global Shell** (`/login`, `/`) | **Live Layout + Role Switcher** | Login, Role Switcher demo (Admin/Owner/Manager/Designer/SuperAdmin), lonceng notifikasi "Perlu Ditindaklanjuti" per peran (live). Ringkasan Sistem (`/`): sapaan menampilkan jumlah hal yang perlu ditindaklanjuti (bukan teks tetap), kartu **"Perlu Ditindaklanjuti"** (6 item teratas dari `GET /notifications`, sama dengan lonceng) & **"Pesanan Terbaru"** (5 pesanan terakhir, tanpa nominal) menggantikan grid "Modul Operasional"; kartu angka Rupiah (Nilai Pesanan Aktif, Pembayaran Tervalidasi) **disembunyikan untuk Admin & Designer**; Owner melihat semua. |
| 2 | **OMS / Pesanan** (`/orders`, `/orders/new`, `/orders/[id]`) | **REAL BACKEND (Slice 1)** | Tabel order + filter (ID, kanal, status, tanggal) — **seluruh baris bisa diklik** ke detail (kode pesanan tetap tautan untuk keyboard), kolom **Pembayaran** = nominal dibayar/“Lunas” + persen + progress bar (emas; hijau bila lunas) + sisa; nominal Rupiah memakai font biasa `tabular-nums` (mono hanya untuk ID/kode/tanggal), form tambah order (wajib Closer jika Offline, rincian qty per ukuran × jenis lengan + toggle Custom Lanjutan + toggle **Harga Custom** per jenis lengan), kalkulasi Total, DP min (`dp_min_percent`), Saldo. |
| 3 | **Kasir & Pembayaran** (`/payments`) | **REAL BACKEND (Slice 1)** | Validasi bukti bayar manual dengan **thumbnail foto bukti di antrean validasi** (klik = perbesar di layar yang sama, PDF dibuka di tab baru; komponen `ProofThumb`, `components/ui/proof-viewer.tsx`), input tunai/transfer (bukti bayar wajib untuk keduanya), status Slot Lock 24j, tombol "Validasi Pembayaran" (kunci kuota permanen). |
| 4 | **Kanban WIP** (`/production/kanban`) | **REAL BACKEND (Slice 2)** | Board 5 kolom resmi (BR-12). Geser maju 1 tahap; modal wajib alasan jika mundur + log riwayat WIP. |
| 5 | **SPK & Dispatch** (`/production/spk`, `/production/spk/[id]/print`) | **REAL BACKEND (Slice 3)** | Gate BR-09. Preview A4 siap cetak/PDF bernomor unik + Form Dispatch Vendor (khusus Owner/Manager). |
| 6 | **Executive Dashboard** (`/executive`) | **REAL BACKEND (Slice 4)** | Header 2 baris (judul; lalu filter periode di kiri & tombol Cetak/CSV/Excel di kanan), filter periode, KPI (Omzet, Total Order, Online vs Offline, Bottleneck), Chart SVG, Leaderboard Marketing (`MOCK`), **Export CSV**, **Export Excel** (kolom kosong biaya produksi + rumus laba) & **Print/PDF Recap**. |
| 7 | **CRM Designer** (`/designer`) | **REAL BACKEND** | Board tiket nyata (`Baru`, `Dikerjakan`, `Menunggu ACC`, `Revisi`, `Selesai`; semua peran internal melihat), tombol "Mulai Kerjakan" (khusus Designer), SLA countdown, kuota revisi gratis per produk, upload mockup berversi (`v1`, `v2`; Designer & Admin), bukti ACC. ACC/Minta Revisi tetap di detail pesanan (Admin). |
| 8 | **Inventory Gudang** (`/inventory`) | **UI + Mock Adapter** | Daftar SKU (Produk, Ukuran, Warna), Stok Tersedia vs Reservasi Fast Track, modal Penyesuaian Stok + alasan audit. |
| 9 | **AI Training & Katalog** (`/ai-training`) | **Katalog & Pola Pesanan: REAL BACKEND**; persona, batas diskon, vector store, sakelar WA: Mock | CRUD Katalog nyata (khusus Owner, BR-19; nonaktif bukan hapus), panel "Yang Dipelajari AI dari Pesanan" (semua kanal termasuk input manual, tanpa data pelanggan), Persona/Tone AI, batas negosiasi, tombol Sync (<60s) & Sandbox Chat. |
| 10 | **Chatbot & Mini Agent** (`/agent-playground`) | **UI + Mock Adapter** | Simulasi chat WA, ringkasan Brief, simulasi kartu WA Proofing (ACC / Minta Revisi), Toggle High/Low Season. |
| 11 | **Platform & Multi-Tenant** (`/platform`) | **UI + Mock Adapter** | Manajemen User & Role, Pengaturan Tenant White-Label (Logo, Nama Toko, Nomor WA, Jam Kerja), Viewer Audit Log. |

Total **15 halaman** (`page.tsx`) di `WEB ATAYLOR/src/app/`. Portal pelacakan publik `/tracking` **sudah dihapus** (18 Okt 2026) — web hanya untuk internal toko.

---

## 5. SKEMA DATA INTI (DATABASE CONTRACT)
Seluruh tabel **kecuali `tenants`** wajib memiliki `id` (UUID), `tenant_id` (UUID, indexed, dilindungi RLS), `created_at`, `updated_at`. Semua nama kolom **snake_case**.

### 5.1 Platform & Identitas
1. `tenants`: `id, slug (unik), code (prefix nomor SPK, mis. AT), name, logo_url, wa_number, automation_mode (high_on/low_off), subscription_status, created_at, updated_at`
2. `users`: `id, tenant_id, name, email, role (admin/owner/manager/designer/super_admin), is_active`
3. `marketing_closers`: `id, tenant_id, name, phone, is_active`

### 5.2 Katalog & Inventory
4. `products`: `id, tenant_id, name, category, base_price, moq, std_duration_days, daily_capacity, design_sla_hours, dp_min_percent (default 50), free_revision_limit (default 3)`
5. `product_variants`: `id, tenant_id, product_id, sku_code (unik per tenant), color, size, is_ready_stock`
6. `inventory_balances`: `id, tenant_id, variant_id, qty_available, qty_reserved, min_stock` — invariant: `qty_available >= 0`
7. `inventory_reservations`: `id, tenant_id, variant_id, order_id, qty, status (active/consumed/released), expires_at`
8. `stock_ledger`: `id, tenant_id, variant_id, delta_qty, reason (adjustment/reservation/release/sale/opname), reason_note (wajib untuk adjustment), actor_id, created_at`

### 5.3 Order & Pembayaran
9. `orders`: `id, tenant_id, order_code (unik per tenant), customer_name, customer_wa, channel (online/offline), marketing_closer_id (wajib jika offline), status (lihat 2.7), wip_stage (null/antrean/proses_jahit/proses_bordir_sablon/qc_pabrik/tiba_di_gudang), total_amount, dp_required, paid_amount, remaining_balance, due_date, slot_lock_status (none/temp_24h/permanent/expired), slot_lock_expires_at, revision_count, notes, created_by`
   - Kolom tambahan yang sudah ada di migrasi: `payments.recorded_by`, `design_tickets.last_feedback`, `design_approvals.recorded_by`, `spk_documents.dispatched_at`. Nominal uang = `bigint` Rupiah.
   - RLS aktif (FORCE) di semua tabel bisnis; role DB aplikasi `ataylor_app` bukan superuser. Lihat `API-ATAYLOR/database/migrations/2026_10_18_100100_enable_tenant_rls.php`.
10. `order_items`: `id, tenant_id, order_id, product_id, variant_id (nullable), sku_code, color, size (S/M/L/XL/XXL/3XL), sleeve_type (pendek/panjang, default pendek), qty, unit_price, subtotal`
    - Satu baris = satu kombinasi (jenis lengan, ukuran) per pesanan. `POST /orders` menerima `product_id`, `color` (Kombinasi Warna Bahan) dan `items: [{sleeve_type, size, qty}]` (qty ≥ 1, kombinasi tidak boleh ganda); `unit_price` diambil dari `products.base_price`, kecuali Admin mengisi **harga custom** `custom_unit_prices: {pendek?, panjang?}` (integer ≥ 1.000, per jenis lengan; yang tidak diisi tetap harga katalog; harga katalog tidak ikut berubah; dicatat di audit `ORDER_CREATED` beserta `catalog_unit_price`). Harga per item dari browser (`items.*.unit_price`) tetap diabaikan. MOQ dicek terhadap **total qty** (server + UI). Konstanta: `OrderItem::SIZES/SLEEVE_TYPES` (backend), `ORDER_SIZES/SLEEVE_TYPES` di `src/lib/constants.ts` (frontend).
11. `payments`: `id, tenant_id, order_id, method (cash/transfer), amount, proof_url (wajib untuk pembayaran baru, tunai maupun transfer — data lama boleh kosong), status (pending/valid/rejected), verified_by, verified_at, notes`

### 5.4 Desain & Produksi
12. `design_tickets`: `id, tenant_id, order_id, designer_id, status (baru/dikerjakan/menunggu_acc/revisi/selesai), sla_due_at, revision_count`
13. `design_versions`: `id, tenant_id, design_ticket_id, version_no (1,2,3…), mockup_url, uploaded_by, sent_at, is_paid_revision`
14. `design_approvals`: `id, tenant_id, design_version_id (unik → ACC sekali pakai), order_id, channel (wa_button/manual_admin), approved_by_wa, approved_at, evidence_url`
15. `wip_histories`: `id, tenant_id, order_id, from_stage, to_stage, actor_id, reason_note (wajib jika mundur), created_at`
16. `spk_documents`: `id, tenant_id, order_id, spk_number (unik), issued_by, issued_at, vendor_name, material_sent_date, spk_receiver, vendor_due_date, dispatched_by`
17. `qc_records`: `id, tenant_id, order_id, photo_url (wajib, BR-24), checked_by, checked_at, notes`

### 5.5 Operasional
18. `audit_logs`: `id, tenant_id, actor_id, action, entity_type, entity_id, old_values (jsonb), new_values (jsonb), correlation_id, created_at` — append-only.

---

## 6. RENCANA EKSEKUSI (CHECKLIST KENDALI)
> Jadwal diubah pemilik pada 18 Okt 2026: target **versi setengah jadi siap presentasi malam ini (18 Okt)**, menggantikan pembagian Hari 2/Hari 3.

### Fase 1 — Fondasi Frontend & 11 Modul (selesai 17 Okt)
- [x] Frontend Next.js 15 + TypeScript + Tailwind di `WEB ATAYLOR/`.
- [x] App Shell, Role Switcher, Status Badges, Print CSS A4.
- [x] Kerangka 11 modul, lulus build.

### Fase 2 — Presentasi Malam Ini: Backend Nyata untuk Alur Inti (selesai 18 Okt)
- [x] Backend Laravel 12 + PostgreSQL 16 + RLS multi-tenant + Sanctum + RBAC server (SRS §2.3) di `API-ATAYLOR/`.
- [x] **Slice 1 OMS & Kasir:** list/filter, create order (BR-02 closer, MOQ, DP per produk BR-10), catat & validasi/tolak pembayaran manual (BR-08), pelunasan → selesai (BR-11).
- [x] Pendukung alur: tiket desain otomatis (BR-04), kirim mockup berversi, ACC sekali pakai per versi terakhir (BR-06), revisi berbayar > batas gratis (BR-17), Slot Lock 24 jam + kedaluwarsa otomatis (BR-07).
- [x] **Slice 2 Kanban WIP:** maju 1 tahap, rework wajib alasan (BR-12), foto QC wajib saat tiba di gudang (BR-24), riwayat WIP + audit log.
- [x] **Slice 3 SPK:** gate BR-05/BR-09, nomor SPK unik per tenant, cetak A4/PDF, dispatch khusus Owner/Manager (BR-27).
- [x] **Slice 4 Executive:** agregasi omzet/kas/kanal/status/bottleneck/leaderboard dari DB, ekspor CSV, cetak PDF, definisi metrik.
- [x] Login nyata (email+password) & masuk cepat akun demo; frontend OMS/Kasir/Kanban/SPK/Executive tersambung API.

### Fase 3 — Berikutnya (belum dikerjakan)
- [x] CRM Designer board tersambung backend (19 Okt 2026).
- [ ] Sambungkan modul MOCK ke backend: Inventory (tabel sudah ada), AI Training (persona, batas diskon, sakelar WA — katalog sudah nyata), Platform (user, tenant, viewer `audit_logs` — endpoint `GET /audit-logs` sudah ada).
- [x] Sakelar High/Low Season (BR-21) tersimpan di `tenants.automation_mode` (21 Okt 2026): `PATCH /api/v1/tenant/automation-mode` (`automation_mode`: `high_on`/`low_off`, khusus Owner, audit `AUTOMATION_MODE_CHANGED`); nilainya ikut di `user.automationMode` pada `/auth/login`, `/auth/me`. UI: kartu "Kirim WhatsApp Otomatis" di `/ai-training` (Owner), halaman Chatbot menampilkan status. Pengiriman WA sendiri belum ada (Fase 4).
- [ ] Verifikasi kapasitas harian & stok sebelum slot lock (BR-03, BR-15, BR-16) — belum ada tabel kapasitas.
- [ ] Komisi marketing (BR-18) setelah rumus disetujui Owner.
- [ ] Service FastAPI (webhook WA, LLM, Mini Agent) — notifikasi "pesanan selesai" saat ini hanya dicatat sebagai audit `CUSTOMER_NOTIFICATION_QUEUED_MOCK`.
- [ ] Redis queue/Horizon & Cloudflare R2 (upload saat ini ke disk lokal **privat**; tinggal arahkan disk ke R2).
- [x] Test otomatis PHPUnit (19 test) — tambah test untuk setiap fitur backend baru.
- [x] Git repo + commit pertama.
- [x] Nomor urut order/SPK dibandingkan sebagai angka (tidak bentrok setelah 999/9999).
- [ ] Sebelum online: `APP_DEBUG=false`, `DEMO_LOGIN_ENABLED=false`, batasi CORS ke domain frontend, ganti semua password DB, token login jangan di localStorage. *(19 Okt: semua sudah bisa diatur lewat env untuk demo online — lihat `DEPLOY.md`; token di localStorage **belum** diganti.)*

### Kebutuhan Fase 4 — Integrasi WhatsApp & AI (BELUM dikerjakan, daftar kebutuhan saja)
> Sumber: SRS v1.0 (FR-CB, FR-MA, FR-AT), Arsitektur v2.0 (§4.2, §5.3, §5.5, §7.1, §8.2, §9), PRD v9.0. Angka biaya **tidak ada** di folder `ATAYLOR BAHAN` (dokumen "Rekomendasi Arsitektur Sistem & Analisis Biaya Operasional" yang dirujuk belum tersedia).

**Alur:** Pelanggan WA → Meta Cloud API (webhook) → **FastAPI** (verifikasi signature, percakapan, LLM, Mini Agent) → API internal **Laravel** (sumber kebenaran harga, stok, kapasitas, jadwal, status bayar). **LLM tidak boleh menjadi sumber angka**; semua angka mengikat diambil dari Laravel.

**A. API / layanan eksternal**

| Layanan | Fungsi | Yang dibutuhkan |
|---|---|---|
| Meta WhatsApp Business Platform — **Cloud API langsung** (tanpa BSP) | Terima/kirim pesan, tombol ACC/Revisi, template | Lihat bagian B |
| Google **Gemini 2.5 Flash** | Model utama percakapan rutin | API key (AI Studio/Vertex AI) + billing |
| Anthropic **Claude Haiku 4.5** | Model eskalasi (negosiasi, ambigu, komplain) | API key + billing |
| Cloudflare **R2** (S3-compatible) | Media privat (mockup, bukti bayar, foto QC); mockup harus dapat diambil Meta | Bucket + access key; ganti disk `local` → R2 |
| **VPS + domain + HTTPS** | Endpoint webhook publik (Meta tidak bisa ke localhost); uji coba boleh lewat tunnel | Docker Compose: reverse proxy, web, Laravel app/worker, FastAPI, Redis, PostgreSQL |
| **Redis** + Laravel Queue/Horizon | Webhook dijawab cepat, proses AI di antrean; antrean dipisah per prioritas | Terpasang di VPS |
| Email/SMTP (opsional) | Eskalasi Owner & laporan | Akun SMTP |

Semua panggilan LLM wajib lewat **satu abstraction layer** (timeout, retry aman, routing model, redaksi PII, log token/biaya, budget guard, fallback eskalasi ke Admin) agar model bisa diganti tanpa mengubah logika bisnis.

**B. Yang harus disiapkan Owner/klien (paling lama — mulai lebih dulu)**
- [ ] **Meta Business Portfolio** terverifikasi (dokumen usaha).
- [ ] **Nomor WhatsApp khusus bisnis** yang tidak aktif di aplikasi WA/WA Business di HP (atau dimigrasikan) + **nama tampilan** disetujui Meta.
- [ ] Kredensial Meta Developer: **App ID, App Secret** (verifikasi signature webhook), **Phone Number ID, WhatsApp Business Account ID, token akses permanen (System User)**, verify token webhook. Disimpan di `.env`, **tidak boleh** masuk git/log.
- [ ] **Template pesan disetujui Meta** (wajib di luar jendela 24 jam — FR-MA-08): proofing desain + tombol ACC/Minta Revisi (FR-MA-01), pengingat ACC (FR-MA-06), instruksi pembayaran setelah ACC (FR-MA-03), slot dilepas (BR-07), pesanan selesai + foto QC + tagihan pelunasan (FR-MA-07, BR-24).
- [ ] Persetujuan Owner: batas diskon/negosiasi, komitmen yang boleh diucapkan AI, kondisi eskalasi (BR-25), kebijakan retensi chat & consent, batas biaya WA/LLM per tenant.

**C. Fungsi yang harus dipenuhi**
- **Chatbot (FR-CB-01..12):** 24/7; kumpulkan brief (produk, kain, qty, warna, ukuran, logo, tenggat); jawab katalog/size chart/MOQ; cek stok & tawarkan Fast Track (BR-14); hitung Dynamic Lead Time & tolak/usulkan tanggal saat penuh (BR-15, BR-16); patuhi persona & daftar harga, tanpa diskon di luar batas (BR-20); eskalasi ke Admin bila ragu/diminta/komplain; simpan riwayat chat terkait pesanan; terima gambar & pesan suara; bahasa Indonesia.
- **Mini Agent (FR-MA-01..09):** kirim mockup dengan tombol ACC/Revisi (sekali pakai per versi); catat bukti ACC (waktu, nomor, versi, ID pesan); picu slot lock 24 jam + instruksi bayar; buka tiket revisi; pengingat ACC; notifikasi selesai + foto QC + tagihan; mode Off = hanya buat tiket tanpa kirim WA (BR-21).
- **AI Training Dashboard (FR-AT-01..08):** CRUD produk/harga/MOQ/kapasitas/SLA, tone & larangan kata, aturan negosiasi, sinkron ke chatbot ≤ 60 detik, versi + rollback, sandbox chat, validasi input, terisolasi per tenant.

**D. Yang belum ada di sistem (harus dibangun)**
- [ ] Service **FastAPI** (Python 3.12): adapter webhook (signature, normalisasi, deduplikasi message ID, pemetaan integrasi → tenant), percakapan, prompt/model routing, guardrail, Mini Agent.
- [ ] Tabel: `customers`, `conversations`, `messages`, `channel_integrations`, `webhook_events`, `ai_configs`, `ai_config_versions`, `knowledge_documents`, `knowledge_chunks`, `conversation_ai_runs` (Arsitektur §8.2) — semua `tenant_id` + RLS.
- [ ] API internal Laravel untuk AI (kredensial service-to-service, tidak diekspos publik): `get_product_context`, `check_inventory`, `calculate_lead_time`, `create_design_ticket`, `get_order_status`, `submit_handoff`, `send_customer_update`, **`submit_payment_proof`** (gambar bukti bayar dari WA pesanan online → simpan ke disk privat → buat `payments` `pending` dengan `proof_url`, dicatat audit; validasi tetap manual Admin, BR-08; idempoten per message ID); endpoint `POST /api/v1/webhooks/whatsapp/{integration_id}`.
- [ ] **Mesin kapasitas & Dynamic Lead Time** deterministik (BR-03, BR-15, BR-16) — prasyarat chatbot menjanjikan tanggal.
- [ ] AI Training Dashboard & Inventory tersambung database (sekarang MOCK).
- [ ] Idempotensi: webhook ganda tidak boleh membuat ACC/order/pembayaran ganda; status pesan sent/delivered/failed & rate limit ditangani.
- [ ] Observabilitas & biaya: latency p50/p95 webhook→kirim, token & biaya per tenant/model, rasio eskalasi, guardrail trips; runbook (token WA kedaluwarsa, LLM down, lonjakan biaya).

**E. Komponen biaya (cek halaman harga resmi sebelum penawaran)**
- WhatsApp: biaya per pesan template (kategori marketing/utility); balasan di dalam jendela 24 jam setelah pelanggan chat umumnya tidak dikenai biaya.
- Gemini & Claude: per token input/output.
- VPS, domain, R2: bulanan.

**F. Urutan kerja yang disarankan**
1. Klien mulai verifikasi Meta Business & nomor WA (paralel).
2. Mesin kapasitas/lead time → AI Training & Inventory nyata → API internal AI.
3. FastAPI (webhook + percakapan + LLM) diuji dengan nomor tes Meta + tunnel.
4. Mini Agent setelah template disetujui.
5. Pengamanan sebelum online (Fase 3) → deploy VPS → uji tenant uji.

---

## 7. PROTOKOL KERJA AI (CLAUDE & GEMINI)
1. **Jangan Menulis Ulang Fondasi:** Gunakan komponen tabel, badge, modal, dan layout yang sudah ada.
2. **Validasi Ganda:** Aturan kritis (Closer wajib untuk Offline, DP minimum, Gate SPK, Urutan Kanban, ACC per versi) divalidasi di Backend Service **DAN** diberi feedback jelas di UI.
3. **Transparansi Mock (label tunggal):**
   - Badge: selalu pakai komponen `<DemoMockBadge />` (`src/components/ui/demo-mock-badge.tsx`): **`MOCK`** di mode demo, **"Tahap berikutnya"** di mode fiks (diatur otomatis oleh `DEMO_MODE`). Jangan menulis label sendiri di halaman; jangan menghapus badge dari modul yang belum tersambung data asli (modul tetap tampil, tapi audiens harus tahu belum berfungsi penuh — keputusan pemilik pilihan "b").
   - Toast untuk aksi simulasi: `"Simulasi Demo: Perubahan dicatat pada sesi lokal"`.
4. **Laporan Jujur:** Di handoff log, tulis hasil apa adanya (error, langkah yang dilewati, hal yang belum diverifikasi). Hindari klaim seperti "100%" atau "0ms".
5. **Jangan pakai route model binding** (`function x(Product $product)`) untuk model ber-tenant: binding berjalan sebelum middleware `tenant` menyalakan RLS sehingga hasilnya selalu 404. Terima ID string lalu `Model::findOrFail($id)` di controller/service (pola semua controller).

---

## 8. PROGRESS & AI HANDOFF LOG (APPEND-ONLY)
> *Setiap AI menambahkan entri baru **di paling atas** daftar ini. Entri lama jangan dihapus atau ditimpa.*
> Format: `### [YYYY-MM-DD] — <AI> — <judul singkat>` lalu *Dikerjakan*, *File diubah*, *Verifikasi*, *Next Action*.

### [2026-10-21] — Claude (Claude Code) — Mode FIKS untuk Presentasi (bisa dikembalikan ke Mode Demo)
- **Permintaan pemilik:** presentasi berikutnya harus terlihat sebagai sistem jadi, bukan demo; modul yang belum tersambung tetap tampil tetapi berlabel halus "Tahap berikutnya" (pilihan b, bukan disembunyikan); nanti pemilik bisa meminta kembali ke mode demo.
- **Dikerjakan:**
  1. `src/lib/app-mode.ts` (baru): `DEMO_MODE` tunggal, dipakai login, `role-switcher`, sidebar, `DemoMockBadge`, halaman Chatbot.
  2. `DemoMockBadge`: mode fiks → pil emas lembut "Tahap berikutnya" (tooltip: data masih contoh & belum tersimpan); sidebar → "Segera". Judul Chatbot tanpa "Simulasi" di mode fiks.
  3. Data contoh: akhiran "(Contoh)" dihapus dari 8 nama pelanggan & vendor SPK di `DatabaseSeeder`; `CatalogTest` kini memastikan nama pelanggan asli tidak bocor di pola pesanan AI. Teks komisi di `ExecutiveService` tanpa "(MOCK)" (badge di UI sudah menandai).
  4. `MODE-FIKS.bat`, `MODE-DEMO.bat`, `tools/atur-mode.ps1` (baru, CRLF): mengubah `NEXT_PUBLIC_DEMO_MODE` & `DEMO_LOGIN_ENABLED`. Bawaan baru = fiks (`WEB ATAYLOR/.env.example`, template `.env` API di `setup-demo.ps1`). Pesan akhir `JALANKAN-DEMO.bat` & `setup-demo.ps1` disesuaikan.
  5. `CARA-PASANG-DEMO.txt`: bagian "MODE FIKS / MODE DEMO", login tanpa tombol masuk cepat, checklist langkah 2b `MODE-FIKS.bat`.
  6. Mac pengembang: `.env.local` & `.env` API diset fiks (tidak di-commit); data demo lokal **tidak di-reset** — "(Contoh)" dihapus langsung lewat `UPDATE` (8 pesanan, 4 SPK) agar data uji lain tetap utuh; API & web dijalankan ulang.
- **Cara kembali ke mode demo:** lihat §1 "Mode FIKS / DEMO".
- **Tag:** `v1.0-presentasi` (sudah di-push, bermode demo) **tidak dipindahkan** (perlu force push); versi fiks diberi tag baru **`v1.1-presentasi`** pada commit entri ini, dan `CARA-PASANG-DEMO.txt` kini merujuk `v1.1-presentasi`.
- **File diubah:** `WEB ATAYLOR/src/lib/app-mode.ts` (baru), `src/components/ui/demo-mock-badge.tsx`, `src/components/shell/{sidebar,role-switcher}.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(dashboard)/agent-playground/page.tsx`, `WEB ATAYLOR/.env.example`; `API-ATAYLOR/database/seeders/DatabaseSeeder.php`, `app/Services/ExecutiveService.php`, `tests/Feature/CatalogTest.php`; `MODE-FIKS.bat`, `MODE-DEMO.bat`, `tools/atur-mode.ps1` (baru), `tools/setup-demo.ps1`, `JALANKAN-DEMO.bat`, `CARA-PASANG-DEMO.txt`, `AI_GUA.md` (§1, §3.3, §7, §8).
- **Verifikasi:** `php artisan test --testsuite=Feature` → 40 passed (352 assertions); `tsc --noEmit` bersih; `npm run build` lulus. Mac: `POST /auth/demo-login` → 404 (nonaktif); screenshot login tanpa tombol masuk cepat & email kosong; beranda Owner tanpa "(Contoh)", sidebar "Segera"; halaman Chatbot "WhatsApp Bot & Mini Agent" + "Tahap berikutnya". **`MODE-FIKS.bat`/`MODE-DEMO.bat`/`atur-mode.ps1` belum dijalankan di Windows** (tidak ada PowerShell di Mac). Email akun masih berakhiran `@ataylor.demo` (terlihat saat mengetik di login) — sengaja tidak diubah karena dipakai test, masuk cepat, & dokumentasi.
- **Next Action:** laptop presenter: tutup jendela → `git pull` → `MODE-FIKS.bat` → `JALANKAN-DEMO.bat` → `RESET-DATA-DEMO.bat` (agar nama tanpa "(Contoh)") → coba login.

### [2026-10-21] — Claude (Claude Code) — Versi Beku `v1.0-presentasi`, JALANKAN-DEMO Build Ulang Otomatis, Ralat Catatan
- **Permintaan pemilik:** presentasi berikutnya cukup ditonton dari laptop presenter (tanpa online); bekukan versi, perbaiki JALANKAN-DEMO agar build ulang otomatis, ralat catatan, commit & push.
- **Ralat (penting):** entri-entri 21 Okt sebelumnya (mis. "Owner Akses Semua Fitur", "Commit & Push…", "Grafik Tren Omzet…") menulis bahwa setelah `git pull` cukup `JALANKAN-DEMO.bat` karena "build ulang sekali". **Itu keliru pada saat ditulis**: JALANKAN-DEMO hanya build ulang bila alamat API di build lama bukan port 8001 (`tools/pindah-port.ps1`), sehingga setelah `git pull` biasa tampilan lama tetap dipakai. Yang benar saat itu adalah menjalankan ulang `SETUP-DEMO.bat` (sesuai `CARA-PASANG-DEMO.txt`). Mulai entri ini, perilaku JALANKAN-DEMO diperbaiki sehingga klaim tersebut kini benar. Entri lama tidak diubah (append-only).
- **Dikerjakan:**
  1. `tools/cek-build.ps1` (baru): exit 0 = build sesuai kode; 1 = file web lebih baru dari `.next/BUILD_ID` → build ulang; 2 = library npm/composer berubah sejak SETUP → minta SETUP-DEMO.
  2. `JALANKAN-DEMO.bat`: memanggil cek-build setelah pindah-port; `php artisan migrate --force --no-interaction` setelah PostgreSQL menyala; hasil `npm run build` kini dicek (sebelumnya kegagalan build diabaikan); pesan baru `[GAGAL]` untuk library berubah, migrasi gagal, build gagal (tutup jendela "A-Taylor Web" lama).
  3. `tools/setup-demo.ps1`: setelah `composer install`, waktu `vendor/composer/installed.json` diperbarui sebagai penanda SETUP (Composer tidak selalu menulis ulang file itu).
  4. `CARA-PASANG-DEMO.txt`: cara ambil versi terbaru (tutup jendela → `git pull` → JALANKAN-DEMO), cara memakai persis versi `v1.0-presentasi` (`git fetch --tags` → `git checkout v1.0-presentasi`; kembali: `git checkout main` + `git pull`), **checklist sehari sebelum presentasi** (termasuk `RESET-DATA-DEMO.bat` agar data uji — mis. pembayaran uji ORD-2026-002 yang ditolak — hilang), 2 entri masalah baru.
  5. Tag Git beranotasi **`v1.0-presentasi`** pada commit entri ini, di-push ke GitHub.
- **File diubah:** `JALANKAN-DEMO.bat` (CRLF), `tools/cek-build.ps1` (baru, CRLF), `tools/setup-demo.ps1` (CRLF), `CARA-PASANG-DEMO.txt`, `AI_GUA.md` (§1, §8).
- **Verifikasi:** **script .bat/.ps1 belum dijalankan di Windows** (Mac pengembang tidak punya PowerShell). Logika `cek-build.ps1` disimulasikan setara dengan Python pada folder ini: build terbaru → 0; satu file `src` disentuh (meniru `git pull`) → 1; dikembalikan → 0. Akhir baris CRLF dicek dengan `file`. Kode aplikasi tidak berubah.
- **Next Action:** presenter jalankan checklist di `CARA-PASANG-DEMO.txt` sehari sebelum presentasi; kirim foto layar bila muncul `[GAGAL]`.

### [2026-10-21] — Claude (Claude Code) — Grafik Tren Omzet Diperbaiki & Pencarian Cepat di Navbar
- **Permintaan pemilik:** perbaiki grafik tren omzet & tambahkan pencarian pesanan di navbar.
- **Dikerjakan:**
  1. **Grafik** (`components/charts/daily-revenue-chart.tsx`, baru; menggantikan grafik lama di `executive/page.tsx`): sebelumnya hanya tanggal yang ada omzet yang digambar → jarak antar-tanggal tidak terlihat dan tren menyesatkan. Kini semua tanggal `period.from`..`period.to` digambar (kosong = garis abu), sumbu Y dibulatkan dengan garis bantu 0/½/maks., label tanggal dijarangkan (7 hari semua, 30 hari tiap 3, 90 hari tiap 9), tooltip gelap saat hover/fokus keyboard (di dalam area grafik, rata tepi untuk batang di ujung), ringkasan Total periode / Rata-rata per hari / Hari dengan pesanan / Tertinggi. Helper baru `formatRupiahShort()`.
  2. **Pencarian cepat** (`components/shell/order-search.tsx`, baru; dipasang di `topbar.tsx`): lihat §3.3 Navbar. Memakai endpoint yang sudah ada (`GET /orders?q=`), tanpa perubahan backend.
- **File diubah:** `WEB ATAYLOR/src/components/charts/daily-revenue-chart.tsx` (baru), `src/components/shell/{order-search.tsx (baru),topbar.tsx}`, `src/lib/currency.ts`, `src/app/(dashboard)/executive/page.tsx`, `AI_GUA.md` (§3.3, §3.4, §8).
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. Chrome headless (CDP) sebagai Owner: grafik 30 hari (30 batang, tooltip "Sab, 26 Sep · Rp 9.750.000 · 1 order" saat disorot) & 90 hari (90 batang, label tiap 9 hari) di 1440px; ketik "futsal" → 1 hasil ORD-2026-002 → Enter membuka `/orders/{id}`; HP 390px: ikon cari → ketik "ORD-2026" → 6 hasil di panel selebar layar. Dua masalah yang ditemukan saat uji sudah diperbaiki: ikon × ganda (kolom `type=search` bawaan browser → `type=text`) dan panel HP terpotong di kiri (→ `fixed inset-x-4`). Tidak ada data yang diubah. Backend tidak diubah (test tidak perlu dijalankan ulang).
- **Next Action:** commit + push bila pemilik setuju; laptop presenter `git pull` + `JALANKAN-DEMO.bat`.

### [2026-10-21] — Claude (Claude Code) — Commit & Push, Uji Bukti Bayar, Sakelar Season ke Database, Tabel OMS
- **Permintaan pemilik:** jalankan rekomendasi Claude (commit/push → uji → sakelar High/Low Season ke database → tabel OMS).
- **Dikerjakan:**
  1. Commit `31393c6` (login, animasi beranda, perapian frontend) di-push ke `origin/main`.
  2. **Uji bukti bayar berfoto (data demo):** pembayaran uji Rp1.000 transfer + foto JPEG buatan dicatat di **ORD-2026-002** lewat API Admin → thumbnail tampil di Kasir, klik membuka modal perbesar (screenshot CDP) → pembayaran itu **ditolak** dengan catatan "Pembayaran uji tampilan bukti bayar (Claude)…" sehingga saldo tidak berubah; barisnya tetap ada di riwayat Kasir sebagai "Ditolak" (hapus dengan `RESET-DATA-DEMO.bat` bila perlu). Thumbnail kini `object-top` agar kepala struk/bukti transfer yang tinggi terlihat.
  3. **Sakelar High/Low Season ke database:** `TenantController@updateAutomationMode` (baru) + route `PATCH tenant/automation-mode` (`role:owner`); `AuthController` mengirim `automationMode`; `Tenant::getTenantIdAttribute()` agar audit log tercatat di tenant yang benar (RLS). Frontend: `role-context` tidak lagi memakai localStorage (`ataylor_automation_mode` dihapus) — nilai dari `user.automationMode`, `toggleAutomationMode()` memanggil API; `/ai-training` menampilkan error bila gagal & teks "tersimpan untuk seluruh pengguna toko".
  4. **Tabel OMS:** baris bisa diklik (tombol "Detail" diganti panah ›), kolom "Dibayar & Sisa" → "Pembayaran" dengan progress bar, nominal tanpa font mono, badge slot lock tanpa font mono.
- **File diubah:** `API-ATAYLOR/app/Http/Controllers/Api/V1/{TenantController (baru),AuthController}.php`, `app/Models/Tenant.php`, `routes/api.php`, `tests/Feature/AutomationModeTest.php` (baru); `WEB ATAYLOR/src/components/shell/role-context.tsx`, `src/app/(dashboard)/{ai-training,orders}/page.tsx`, `src/components/ui/proof-viewer.tsx`; `AI_GUA.md` (§1, §4, §6, §8).
- **Verifikasi:** `php artisan test --testsuite=Feature` → **40 passed (352 assertions)** (baru: Owner ganti mode → Admin & Designer melihat nilai baru + audit log bertenant; Admin/Manager 403; nilai tak dikenal 422). `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. Chrome headless (CDP) sebagai Owner di `/ai-training`: sakelar Aktif → klik → Nonaktif → reload tetap Nonaktif → akun Admin menerima `low_off` → diklik lagi, **dikembalikan ke Aktif**. OMS 1440px & 390px di-screenshot; klik sel baris ke-2 membuka `/orders/{id}`.
- **Next Action:** laptop presenter `git pull` + `JALANKAN-DEMO.bat` (build ulang sekali). Berikutnya disarankan: grafik tren omzet (tanggal kosong + angka saat hover), pencarian cepat di navbar; Owner mulai verifikasi Meta Business & nomor WA.

### [2026-10-21] — Claude (Claude Code) — Perapian Frontend: Bahasa Staf, Foto Bukti di Kasir, Header Executive, Beranda Berguna
- **Permintaan pemilik:** kerjakan saran desain nomor 1–4.
- **Dikerjakan:**
  1. **Istilah teknis dihapus dari tampilan** (aturan baru §3.1 no. 6): badge "Live · Database" di 8 tempat, "Tabel: orders", "Pure CSS bars", kode `BR-xx` di judul/subjudul/label/toast (OMS, form & detail pesanan, Kasir, Kanban, SPK + cetak SPK, CRM Designer, AI Training, panel pola pesanan, form produk), "RBAC" di Platform, "Sesuai SRS v1.0 & PRD v9.0" di login (→ "© A-Taylor Kendari · Sejak 2020"), "Server API Tidak Terjangkau" → "Server Tidak Terjangkau". `errorMessage()` tidak lagi menempelkan "BR-xx:" di pesan error. Backend: teks notifikasi (`NotificationService`: BR-07/11/27), pesan ACC (`DesignController`), dan catatan komisi (`ExecutiveService`) tanpa kode BR. Kode aturan tetap ada di komentar & field `code` API.
  2. **Kasir — foto bukti bayar langsung:** antrean "Bukti Bayar Menunggu Validasi" menampilkan thumbnail 80px per pembayaran (`ProofThumb`): foto → klik untuk diperbesar dalam modal (Esc/klik latar menutup, tombol "Tab baru"); PDF → ikon dibuka di tab baru; gagal dimuat (tautan bertanda tangan kedaluwarsa 30 menit) → ikon "Buka file"; tanpa bukti (data lama) → kotak "Tanpa bukti" + peringatan merah "cek manual sebelum validasi". Aturan Kasir no. 1 ditulis ulang tanpa istilah "API/Gateway".
  3. **Header Executive Dashboard:** judul satu baris + periode; baris kedua = preset & rentang tanggal (dengan "s.d.") di kiri, Cetak/CSV/Excel di kanan (sebelumnya judul terlipat dan "Unduh Excel" turun sendirian).
  4. **Beranda:** grid "Modul Operasional (Sesuai Spesifikasi SSOT)" diganti kartu **Perlu Ditindaklanjuti** (6 item teratas notifikasi per peran + jumlah mendesak; "+N lainnya" mengarah ke lonceng) dan **Pesanan Terbaru** (5 terakhir: kode, kanal, pelanggan, badge status — tanpa nominal sehingga aman untuk Admin/Designer). "Semua sistem berjalan normal" (teks tetap) diganti jumlah hal yang perlu ditindaklanjuti. Super Admin melihat keterangan bahwa data pesanan tenant tidak diakses.
- **File diubah:** `WEB ATAYLOR/src/app/(dashboard)/{page.tsx,payments,orders,orders/new,orders/[id],production/kanban,production/spk,production/spk/[id]/print,designer,ai-training,platform,executive}/…`, `src/app/(auth)/login/page.tsx`, `src/components/ui/{proof-viewer.tsx (baru),error-state.tsx}`, `src/components/catalog/{order-insights-panel,product-form-modal}.tsx`; `API-ATAYLOR/app/Services/{NotificationService,ExecutiveService}.php`, `app/Http/Controllers/Api/V1/DesignController.php`; `AI_GUA.md` (§3.1, §4, §8).
- **Verifikasi:** `php artisan test --testsuite=Feature` → 38 passed (334 assertions); `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. Screenshot login nyata lewat Chrome headless (CDP): beranda Owner & Admin 1440px, beranda & Kasir Admin 390px, Kasir & Executive Owner 1440px — tata letak rapi, tanpa scroll horizontal di HP. **Belum diuji:** thumbnail foto & modal perbesar dengan bukti sungguhan (data demo hanya punya 1 pembayaran pending dan tanpa bukti — tampil "Tanpa bukti"); kode BR di halaman mock (Inventory/Chatbot/Platform) yang tidak terdeteksi pencarian teks belum dicek satu per satu.
- **Next Action:** pemilik cek di browser; commit + push (bersama perubahan login & animasi beranda yang belum di-commit).

### [2026-10-21] — Claude (Claude Code) — Animasi Halus di Ringkasan Sistem (Beranda)
- **Permintaan pemilik:** beranda diberi animasi; pemilik memilih rekomendasi Claude (nomor 1–4).
- **Dikerjakan:** `src/app/(dashboard)/page.tsx` — (1) angka KPI berhitung naik dari 0 saat data dimuat lewat hook baru `src/lib/use-count-up.ts` (`KpiTile` kini menerima angka + fungsi format; "…" saat memuat seperti sebelumnya); (2) lingkaran kartu hero melayang (`animate-drift`, `animate-drift-slow`) & logo mengambang (`animate-float`); (3) grid 6 kartu modul `.reveal-stagger` + panah bergeser `group-hover:translate-x-1`; (4) titik berdenyut di kartu Slot Lock 24 Jam bila `lockedCount > 0`. Kelas `.login-stagger` diganti nama menjadi `.reveal-stagger` (dipakai login & beranda). Aturan peran tidak berubah (Admin & Designer tetap tanpa kartu Rupiah; animasi berlaku di kartu WIP & Slot Lock).
- **File diubah:** `WEB ATAYLOR/src/app/(dashboard)/page.tsx`, `src/lib/use-count-up.ts` (baru), `src/app/globals.css`, `src/app/(auth)/login/page.tsx` (nama kelas saja), `AI_GUA.md` (§3.5, §8).
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. **Belum dilihat langsung di browser** (beranda butuh login; screenshot headless tidak dibuat) — gerak hitung naik & denyut belum dicek mata. Catatan: di mode `npm run dev` (React Strict Mode) hitung naik bisa langsung lompat ke angka akhir; di build produksi (`next start`) berjalan normal.
- **Next Action:** pemilik cek beranda sebagai Owner & Admin; commit + push bila sudah sesuai.

### [2026-10-21] — Claude (Claude Code) — Halaman Login Lebar (Desktop) + Animasi Halus
- **Permintaan pemilik:** halaman login dibuat lebar menyesuaikan layar desktop dan diberi animasi gerak. Disepakati: dua kolom di desktop (panel brand arang + form), HP tetap satu kartu; animasi halus (ornamen melayang, isi muncul berurutan, logo mengambang).
- **Dikerjakan:** `src/app/(auth)/login/page.tsx` — panel brand kiri (hanya `lg:`), form kanan dibungkus `<main>`; logika login & tombol masuk cepat demo **tidak diubah**. Teks "White-Label Ready…" di kartu disembunyikan di desktop (sudah ada di panel). `tailwind.config.ts` — keyframes `float`, `drift` + animasi `float`, `drift`, `drift-slow`. `globals.css` — kelas `.login-stagger`. Animasi tak berujung otomatis berhenti bila pengguna memilih kurangi gerakan (aturan `prefers-reduced-motion` yang sudah ada).
- **File diubah:** `WEB ATAYLOR/src/app/(auth)/login/page.tsx`, `WEB ATAYLOR/tailwind.config.ts`, `WEB ATAYLOR/src/app/globals.css`, `AI_GUA.md` (§3.3, §3.5, §8).
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. Screenshot Chrome headless: 1440×900 & 1024×700 → dua kolom rapi tanpa terpotong; lebar < 1024 → satu kartu seperti sebelumnya, di 375px (iframe) kartu muat dengan jarak tepi. Gerakan animasi hanya dicek lewat kode/frame diam (headless tidak merekam gerak); login sungguhan tidak diklik ulang.
- **Next Action:** pemilik cek di browser; commit + push bila sudah sesuai.

### [2026-10-21] — Claude (Claude Code) — Owner Akses Semua Fitur & Alur Bukti Bayar Online (WA) vs Offline (Manual)
- **Permintaan pemilik:** "Owner bisa akses semuanya, yang lain tetap, cuma Owner yang diubah". Pembayaran: pesanan online → pelanggan kirim bukti bayar di bot/WA dan bukti langsung masuk sistem; pesanan offline → Admin input manual.
- **Dikerjakan:**
  1. **Owner akses semua:** `EnsureRole` meloloskan Owner di setiap `role:...` (input pesanan, Kasir/validasi/tolak, ACC/revisi, unggah mockup, ambil tiket desain, Kanban, terbitkan SPK, dll.). UI: tombol "Buat Pesanan Baru" & form `/orders/new`, aksi detail pesanan (ACC, catat/validasi pembayaran, terbitkan SPK), geser Kanban, terbitkan SPK (label "Khusus Admin & Owner"), CRM Designer (Mulai Kerjakan & unggah mockup) kini aktif untuk Owner. Peran lain tidak berubah; Ringkasan Sistem tetap seperti entri sebelumnya (Rupiah disembunyikan untuk Admin & Designer, Manager tetap melihat).
  2. **Alur bukti bayar per kanal:** detail pesanan **offline** → form input manual Admin (bukti wajib) seperti sebelumnya. Detail pesanan **online** → keterangan "pelanggan mengirim bukti bayar lewat WhatsApp/chatbot dan bukti langsung masuk ke antrean Kasir" + tombol "Catat manual (sementara)" yang membuka form yang sama, karena integrasi WA belum ada. Kebutuhan endpoint `submit_payment_proof` ditambahkan ke Fase 4 (§6 D). Tidak ada perubahan database.
- **File diubah:** `API-ATAYLOR/app/Http/Middleware/EnsureRole.php`, `routes/api.php` (komentar), `tests/Feature/{AuthAndTenancyTest,DesignBoardTest}.php`; `WEB ATAYLOR/src/app/(dashboard)/{orders/page.tsx,orders/new/page.tsx,orders/[id]/page.tsx,production/kanban/page.tsx,production/spk/page.tsx,designer/page.tsx}`, `AI_GUA.md` (§1, §2.3, §6, §8).
- **Verifikasi:**
  - `php artisan test --testsuite=Feature` → **38 passed (334 assertions)**. Test baru `test_owner_can_access_every_feature` (Owner: `/payments`, `/kanban`, `/design-tickets` 200, `POST /orders` lolos otorisasi → 422 validasi; Manager `/payments` & Designer `POST /orders` tetap 403). Test lama yang mengharuskan Owner ditolak (input pesanan, ambil tiket desain) disesuaikan.
  - `tsc --noEmit` bersih; `npm run build` lulus; `next start` dijalankan ulang. API demo: login Owner → `GET /payments`, `/kanban`, `/design-tickets`, `/spk` = 200.
  - **Belum diuji klik di browser** (tombol-tombol Owner & tampilan pembayaran online/offline).
- **Next Action:** saat Fase 4, bangun `submit_payment_proof` dari FastAPI/WA. **Keputusan pemilik (21 Okt 2026):** tombol input manual untuk pesanan online **tetap disimpan sebagai cadangan** — label diganti dari "Catat manual (sementara)" menjadi "Catat manual (cadangan)".

### [2026-10-21] — Claude (Claude Code) — Revisi Pemilik: Bukti Bayar Wajib, Harga Custom OMS, Rupiah Ringkasan per Peran
- **Permintaan (revisi pemilik):** (1) upload bukti bayar untuk pembayaran tunai maupun online; (2) fitur harga custom di OMS; (3) Admin & Designer tidak boleh melihat angka Rupiah di Ringkasan Sistem, Owner melihat semua. Pemilik meminta tidak mengubah hal lain.
- **Dikerjakan:**
  1. **Bukti bayar wajib (tunai & transfer):** `StorePaymentRequest` — `proof` dari `nullable` → `required` + pesan "Bukti bayar wajib dilampirkan, baik pembayaran tunai maupun transfer."; `PaymentController::store` selalu menyimpan berkas. Detail pesanan (Langkah 2): label tombol unggah "Bukti bayar * (foto nota)" untuk tunai / "(bukti transfer)" untuk transfer; "Catat Pembayaran" nonaktif sampai berkas dipilih. Pembayaran lama tanpa bukti tidak diubah.
  2. **Harga Custom OMS:** payload `POST /orders` menerima `custom_unit_prices` opsional per jenis lengan (`pendek`/`panjang`, integer 1.000–100.000.000; kunci lain ditolak). `OrderService` memakai harga itu untuk `unit_price`/subtotal/total/DP; jenis lengan tanpa harga custom tetap harga katalog. Audit `ORDER_CREATED` mencatat `custom_unit_prices` + `catalog_unit_price`. Harga katalog (`products.base_price`) tidak berubah. Form `/orders/new`: sakelar **Harga Custom** (di bawah Custom Lanjutan) memunculkan input "Harga/pcs (Rp)" di tiap blok varian (awal = harga katalog, kembali ke harga katalog bila produk diganti); Kalkulasi Otomatis memakai harga custom dan menampilkan rinciannya; Simpan nonaktif bila harga < Rp1.000. Tanpa migrasi database.
  3. **Ringkasan Sistem (`/`):** kartu "Nilai Pesanan Aktif" & "Pembayaran Tervalidasi" disembunyikan untuk peran Admin & Designer (hanya tampilan; kartu WIP & Slot Lock tetap). Owner (dan Manager, tidak disebut dalam revisi sehingga tidak diubah) tetap melihat semua.
- **File diubah:** `API-ATAYLOR/app/Http/Requests/{StorePaymentRequest,StoreOrderRequest}.php`, `app/Http/Controllers/Api/V1/PaymentController.php`, `app/Services/OrderService.php`, `tests/Feature/{OrderLifecycleTest,OrderItemsTest,SequenceAndFilesTest}.php`; `WEB ATAYLOR/src/app/(dashboard)/{page.tsx,orders/new/page.tsx,orders/[id]/page.tsx}`, `src/core/types/order.types.ts`, `AI_GUA.md` (§1, §2.3, §4, §5.3, §8).
- **Verifikasi:**
  - `php artisan test --testsuite=Feature` (Mac pengembang, PHP Herd 8.5) → **37 passed (326 assertions)**. Test baru: pembayaran tunai & transfer tanpa bukti → 422 tanpa data tercatat, tunai dengan bukti → 201; harga custom panjang Rp110.000 + pendek katalog → total/DP/unit price benar, harga katalog tetap, audit mencatat; harga custom < 1.000 / bukan angka / kunci jenis lengan tidak dikenal → 422. Test lama yang mencatat pembayaran kini melampirkan bukti palsu (`Storage::fake`).
  - `tsc --noEmit` bersih; `npm run build` lulus (16 rute); `next start` port 3000 dijalankan ulang dengan build baru.
  - API demo yang sedang berjalan: `POST /orders/{id}/payments` tanpa bukti (cash & transfer) → 422 dengan pesan baru (tidak ada data tercatat).
  - **Belum diuji di browser**: tampilan sakelar Harga Custom, tombol pembayaran nonaktif, dan Ringkasan per peran belum dicek klik demi klik / lebar 375px. Tidak ada pesanan uji yang dibuat di data demo.
- **Next Action:** pemilik cek di browser (Admin: form pesanan + catat pembayaran; Owner vs Admin/Designer: Ringkasan Sistem). Konfirmasi apakah Manager juga perlu disembunyikan angka Rupiahnya. Catatan: API `GET /orders` masih mengirim nominal ke semua peran yang berhak membaca pesanan (Admin butuh untuk kasir) — penyembunyian di Ringkasan bersifat tampilan.

### [2026-10-19] — Claude (Claude Code) — API Lokal Pindah ke Port 8001
- **Dikerjakan:** port 8000 di laptop presenter dipakai aplikasi lain → atas permintaan pemilik, API lokal/demo pindah ke **8001**. Diubah: default `client.ts`, `WEB ATAYLOR/.env.example`, template `.env` di `tools/setup-demo.ps1` (APP_URL), `config/sanctum.php` (stateful), `JALANKAN-DEMO.bat`, `tools/cek-api.ps1`, `CARA-PASANG-DEMO.txt`. `tools/pindah-port.ps1` (baru, dipanggil JALANKAN-DEMO sebelum API start): mengganti `127.0.0.1:8000`→`8001` di `API-ATAYLOR/.env` & `WEB ATAYLOR/.env.local` lama, dan exit 1 bila build `.next` belum memuat URL 8001 → JALANKAN-DEMO menjalankan `npm run build` sekali. Dockerfile (HF Spaces, port 8000 di dalam container) tidak diubah.
- **File diubah:** lihat di atas + `.env`/`.env.local` laptop pengembang (tidak di-commit).
- **Verifikasi:** `JALANKAN-DEMO.bat` dijalankan penuh di laptop pengembang dengan port 8000 sengaja tetap terpakai: setelan dimigrasi, web di-build ulang (0 chunk berisi `:8000`), API :8001 `/up` OK, `/login` 200, `POST /api/v1/auth/login` admin demo → 200 + token, CORS `*`.
- **Next Action:** presenter `git pull` → `JALANKAN-DEMO.bat` (build ulang otomatis ±1-3 menit, sekali saja).

### [2026-10-19] — Claude (Claude Code) — JALANKAN-DEMO.bat: Cek Kesehatan Sebelum Buka Browser
- **Dikerjakan:** laporan presenter: login gagal "Tidak dapat terhubung ke server API" (pesan `client.ts` hanya muncul saat fetch gagal total → API :8000 tidak menyala). `JALANKAN-DEMO.bat` kini memeriksa: hasil SETUP (php.exe, pg_ctl, `vendor/`, `.env`, `node_modules`), `php -v` (gagal → arahkan ke VC++ Redistributable), start PostgreSQL (gagal → tampilkan 15 baris `pg.log`), port 8000 dipakai aplikasi lain (tampilkan prosesnya), lalu menunggu `GET /up` maks 30 detik sebelum membuka browser; tiap kegagalan menampilkan `[GAGAL]` + solusi lalu `pause`. Bila API sudah menyala, start API/scheduler dilewati. `tools/cek-api.ps1` (baru): exit 0 = API menjawab `/up`, 1 = port kosong, 2 = port dipakai lain; `-Tunggu N`. `CARA-PASANG-DEMO.txt`: entri masalah baru untuk pesan tersebut.
- **File diubah:** `JALANKAN-DEMO.bat` (CRLF), `tools/cek-api.ps1` (baru), `CARA-PASANG-DEMO.txt`.
- **Verifikasi:** `cek-api.ps1` diuji ketiga kondisi (port kosong → 1, listener lain di 8000 → 2, `php artisan serve` → 0). Salinan bat di folder tanpa `.devtools` → pesan "SETUP belum selesai" + exit 1. Alur penuh (PG + web + browser) tidak dijalankan ulang di laptop pengembang.
- **Next Action:** presenter `git pull`, jalankan `JALANKAN-DEMO.bat`, kirim pesan `[GAGAL]` yang muncul bila masih gagal. Tidak di-commit/push.

### [2026-10-19] — Claude (Claude Code) — CARA-PASANG-DEMO.txt: Panduan Presenter
- **Dikerjakan:** `CARA-PASANG-DEMO.txt` (baru) — panduan langkah demi langkah berbahasa awam untuk teman presenter: pasang Git + Node LTS → `git clone` ke `C:\ATAYLOR` (atau ZIP) → `SETUP-DEMO.bat` → `JALANKAN-DEMO.bat` + akun demo → `RESET-DATA-DEMO.bat` / `git pull` → tabel masalah umum. Repo publik (kata pemilik), jadi langkah undangan collaborator tidak diperlukan.
- **File diubah:** `CARA-PASANG-DEMO.txt` (baru), `AI_GUA.md` (§8).
- **Verifikasi:** isi dicocokkan dengan `SETUP-DEMO.bat`, `tools/setup-demo.ps1`, `JALANKAN-DEMO.bat`, `RESET-DATA-DEMO.bat`. Tidak di-commit/push.
- **Next Action:** pemilik commit + push bila ingin file ini ikut ter-clone oleh presenter.

### [2026-10-19] — Claude (Claude Code) — SETUP-DEMO.bat: Demo Offline di Laptop Presenter
- **Latar:** semua host gratis yang dicoba minta kartu (Render, Koyeb, alwaysdata) dan Docker Space Hugging Face kini wajib PRO → **keputusan pemilik:** teman presenter (luar kota) clone dari GitHub dan menjalankan demo di laptopnya sendiri.
- **Dikerjakan:** `SETUP-DEMO.bat` + `tools/setup-demo.ps1` (baru) — sekali jalan setelah clone: unduh PHP 8.3.35 NTS x64 & PostgreSQL 16.15 (checksum SHA-256 sama dengan `.devtools/dl` laptop pengembang) + Composer, `php.ini` (ekstensi sama), `initdb` port 5433 + role `ataylor_app` non-superuser + DB `ataylor` & `ataylor_test`, `.env` lokal + `key:generate`, `composer install`, `migrate:fresh --seed`, `.env.local` dari contoh, `npm ci` + build. Bisa diulang (langkah selesai dilewati). Ekstraksi pakai .NET ZipFile (tar.exe gagal di path Unicode); berhenti dengan pesan jelas bila path folder berisi karakter non-ASCII (PostgreSQL Windows tidak bisa jalan di path seperti itu). `.gitattributes`: `*.bat`/`*.ps1` CRLF. `DEPLOY.md` §0 (panduan presenter) + catatan HF wajib PRO.
- **File diubah:** `SETUP-DEMO.bat` (baru), `tools/setup-demo.ps1` (baru), `.gitattributes`, `DEPLOY.md`, `AI_GUA.md` (§8).
- **Verifikasi:** clone bersih di folder sementara (port 5439 agar DB lokal tak terganggu, unduhan PHP/PG dari cache, Composer & npm unduh sungguhan) → setup selesai exit 0; DB berisi 2 tenant / 6 user, role `ataylor_app` tidak superuser/BYPASSRLS. `JALANKAN-DEMO.bat` di clone tersebut tidak diuji (port 8000/3000 sedang dipakai laptop pengembang). Uji pertama dengan unduhan PHP/PG asli akan terjadi di laptop presenter.
- **Next Action:** undang presenter sebagai collaborator GitHub; presenter jalankan setup sehari sebelum berangkat.

### [2026-10-19] — Claude (Claude Code) — API Online di Hugging Face Spaces (Render & Koyeb Minta Kartu)
- **Keputusan pemilik:** tetap gratis; Render (Web Service juga) dan Koyeb tidak bisa tanpa kartu → pemilik menyerahkan pilihan host ke AI → **Hugging Face Spaces (Docker)**.
- **Dikerjakan:** `deploy/huggingface/{Dockerfile,README.md}` (baru) — Space Public tapi kode tetap privat: Dockerfile meng-clone repo GitHub privat saat build lewat secret `GITHUB_TOKEN` (`RUN --mount=type=secret`). Jalan sebagai uid 1000 di port 7860; env non-rahasia ditanam di Dockerfile, rahasia (`APP_KEY`, `SEED_USER_PASSWORD`, `DB_URL`) di Settings Space. `API-ATAYLOR/docker/start-hf.sh` (baru): `APP_URL` dari `SPACE_HOST`; bila `DB_URL` kosong, menjalankan PostgreSQL di dalam container dengan role `ataylor_app` non-superuser (RLS tetap berlaku; data sementara, data contoh terisi ulang) — cadangan karena laporan forum HF menyebut port keluar 5432 (Neon) kadang diblokir. Lalu memanggil `docker/start.sh` yang sama dengan Render. `DEPLOY.md` §3b.
- **File diubah:** `deploy/huggingface/Dockerfile` (baru), `deploy/huggingface/README.md` (baru), `API-ATAYLOR/docker/start-hf.sh` (baru), `DEPLOY.md`, `AI_GUA.md` (§8).
- **Verifikasi:** **belum diuji** — Docker tidak terpasang di laptop; build pertama di Space adalah ujinya. `start-hf.sh` harus sudah di-push ke GitHub sebelum Space dibangun.
- **Next Action:** push → token GitHub → buat Space → secret → cek `/up` & log (`RLS aktif`) → isi `NEXT_PUBLIC_API_URL` Vercel → Redeploy → `CORS_ALLOWED_ORIGINS` = domain Vercel.

### [2026-10-19] — Claude (Claude Code) — Database Online Pindah ke Neon (Gratis)
- **Keputusan pemilik:** tetap paket **gratis** (Render berbayar tidak dipakai); database **Neon** karena Render meminta kartu.
- **Dikerjakan:** `DEPLOY.md` langkah 2 diganti Neon. Role bawaan Neon (`neondb_owner`, anggota `neon_superuser`) ber-**BYPASSRLS** sehingga RLS tak berlaku → API memakai role `ataylor_app` buatan SQL Editor (GRANT CONNECT/CREATE database + USAGE/CREATE schema `public`). `DB_URL` wajib host **tanpa `-pooler`** karena konteks tenant memakai `set_config(..., false)` per sesi (PgBouncer mode transaksi bisa mencampur konteks antar-request), plus `?sslmode=require`. Cara reset data contoh di Neon ditambahkan.
- **File diubah:** `DEPLOY.md`, `AI_GUA.md` (§1, §8). Tidak ada perubahan kode.
- **Verifikasi:** belum diuji online (butuh akun Neon/Render pemilik). Di log Render harus muncul `Role database non-superuser: RLS aktif.`
- **Next Action:** buat project Neon + role `ataylor_app` → Web Service Render (instance **Free**) → isi env Vercel lalu Redeploy. Bila Web Service Render pun meminta kartu, cari host API lain.

### [2026-10-19] — Claude (Claude Code) — Persiapan Online Sementara (Vercel + Render)
- **Keputusan pemilik:** online sementara untuk presentasi (konfigurasi produksi menyusul), web di **Vercel**, **hanya login email + kata sandi** (tanpa masuk cepat demo), repo `https://github.com/techreyy/ATAYLOR.git`. Backend & database dipilih **Render** karena role database-nya bukan superuser (RLS tetap berlaku; superuser seperti `postgres` di Railway melewati RLS).
- **Dikerjakan:**
  1. Login: blok "Masuk cepat akun demo" (+ sandi `ataylor123`) dan email bawaan hanya tampil bila `NEXT_PUBLIC_DEMO_MODE=true`.
  2. Backend: `config/cors.php` (origin dari `CORS_ALLOWED_ORIGINS`, bawaan `*` untuk lokal); `trustProxies('*')` di `bootstrap/app.php` agar tautan file bertanda tangan memakai https di balik proxy; kata sandi akun seeder dari `config('app.seed_user_password')` / env `SEED_USER_PASSWORD` (bawaan tetap `ataylor123`); perintah `app:prepare-deploy` (isi data contoh hanya bila tabel `tenants` kosong + peringatan bila role DB superuser/BYPASSRLS).
  3. `API-ATAYLOR/Dockerfile` (FrankenPHP PHP 8.3 + pdo_pgsql, zip, gd, intl, bcmath, opcache), `docker/start.sh` (config/route cache → migrate → prepare-deploy → `schedule:work` → server di `$PORT`), `.dockerignore`; `.gitattributes` memaksa LF untuk `*.sh`/Dockerfile.
  4. `DEPLOY.md`: langkah Render (Postgres + Web Service Docker) dan Vercel, daftar env, keterbatasan versi gratis.
- **File diubah:** `WEB ATAYLOR/src/app/(auth)/login/page.tsx`, `API-ATAYLOR/{bootstrap/app.php,config/app.php,config/cors.php (baru),database/seeders/DatabaseSeeder.php,app/Console/Commands/PrepareDeploy.php (baru),Dockerfile (baru),docker/start.sh (baru),.dockerignore (baru)}`, `.gitattributes` (baru), `DEPLOY.md` (baru), `AI_GUA.md` (§1, §6).
- **Verifikasi:** `php artisan test` → 34 passed (301 assertions) pada 11 dari 12 kali jalan; **1 kali gagal 1 test** di awal dan detailnya tidak tertangkap (kemungkinan bentrok dengan proses `JALANKAN-TEST.bat` yang masih menggantung, belum terbukti). `tsc --noEmit` bersih; `next build` dengan env online (`NEXT_PUBLIC_DEMO_MODE=false`, API URL contoh) lulus dan URL API tertanam di bundle; build lokal dikembalikan & server 3000 dijalankan ulang. **Dockerfile belum diuji** (Docker tidak terpasang di laptop) — build pertama di Render adalah uji pertamanya. Deploy Render/Vercel belum dilakukan (butuh akun pemilik).
- **Next Action:** push ke GitHub → Render → Vercel sesuai `DEPLOY.md`; untuk produksi: R2 untuk upload, token di cookie httpOnly, VPS.

### [2026-10-19] — Claude (Claude Code) — CRM Designer Tersambung Data Nyata
- **Keputusan pemilik:** (1) ada tombol "Mulai Kerjakan" — tiket menjadi milik Designer yang menekannya; (2) semua peran internal boleh melihat board, unggah mockup hanya Designer & Admin; (3) ACC / Minta Revisi tetap khusus Admin di detail pesanan (BR-06).
- **Dikerjakan:**
  1. **Backend:** `GET /design-tickets` (admin/owner/manager/designer) → `DesignService::board()`: semua tiket berjalan (SLA terdekat dulu) + 12 tiket selesai terbaru, tanpa pesanan dibatalkan. `DesignTicketResource` menambah konteks pesanan bila relasi `order` dimuat (kode, status pesanan, pelanggan, tenggat, produk, warna, total qty, `freeRevisionLimit`) — detail pesanan tidak berubah. `POST /design-tickets/{id}/start` (khusus designer) → `DesignService::start()`: hanya tiket `baru` + pesanan `brief_lengkap`; tiket → `dikerjakan` + `designer_id`, pesanan → `desain_dikerjakan`, audit `DESIGN_TICKET_STARTED`; selain itu 422 `BR-04`. Unggah mockup tetap memakai endpoint lama `POST /orders/{id}/design-versions`.
  2. **Frontend `/designer`** ditulis ulang (data mock `SEED_DESIGN_TICKETS` + tipe `DesignTicket` lama dihapus): 5 kolom status, kartu berisi kode pesanan (tautan ke detail), pelanggan, produk · qty · warna, Designer/"belum diambil", hitung mundur SLA (berjalan di Baru/Dikerjakan/Revisi; kuning ≤ 3 jam, merah bila terlambat; diperbarui tiap menit), info kirim/ACC terakhir, kuota revisi gratis `x / batas` + peringatan berbayar (BR-17), catatan revisi pelanggan, tautan mockup terakhir. Aksi: "Mulai Kerjakan" (Designer, tiket Baru); pilih file + "Kirim Mockup vN" (Designer di Dikerjakan/Revisi/Menunggu ACC; Admin juga di Baru). State loading/kosong/gagal, tombol Muat Ulang. Repository/adapter baru `design`. Label `MOCK` di sidebar dihapus.
  3. Halaman SPK: status `desain_dikerjakan` ikut dihitung sebagai kandidat pra-SPK (status ini sebelumnya tidak pernah dipakai).
  4. §1 baris batas upload yang rusak (kalimat terduplikasi) diperbaiki.
- **File diubah:** `API-ATAYLOR/app/Services/DesignService.php`, `app/Http/Controllers/Api/V1/DesignController.php`, `app/Http/Resources/DesignTicketResource.php`, `routes/api.php`, `tests/Feature/DesignBoardTest.php` (baru); `WEB ATAYLOR/src/app/(dashboard)/designer/page.tsx`, `src/core/repositories/design.repository.ts` (baru), `src/core/adapters/api/api-design.adapter.ts` (baru), `src/core/types/{order,catalog}.types.ts`, `src/core/seeds/seed-data.ts`, `src/components/shell/sidebar.tsx`, `src/app/(dashboard)/production/spk/page.tsx`, `AI_GUA.md` (§1, §4, §6).
- **Verifikasi:**
  - `php artisan test` → 34 passed (301 assertions). Test baru: board berisi konteks pesanan untuk Designer/Admin/Owner/Manager, tiket berjalan tampil sebelum tiket selesai, pesanan dibatalkan & tenant lain tidak terlihat, hanya Designer bisa ambil tiket (Admin/Owner 403), ambil dua kali / tiket yang sudah berjalan → 422 BR-04, audit tercatat, unggah v1 → Menunggu ACC. (`JALANKAN-TEST.bat` sempat macet menunggu `pg_ctl start`, jadi test dijalankan langsung dengan `artisan test`.)
  - `tsc --noEmit` bersih; `npm run build` lulus; server API (8000) & `next start` (3000) dinyalakan (sebelumnya mati).
  - Chrome: sebagai Owner board tampil tanpa tombol aksi; sebagai Designer **ORD-2026-012** diambil (pindah ke Dikerjakan, "Rian Desain") lalu mockup v1 diunggah (pindah ke Menunggu ACC, tautan mockup muncul). Lebar 375px: tanpa scroll horizontal; tidak ada error konsol. Peran browser dikembalikan ke Owner.
  - **Data demo berubah:** ORD-2026-012 kini Menunggu ACC dengan mockup v1 (gambar `teks logo.png`). ORD-2026-005 sengaja tidak disentuh agar tetap bisa didemokan dari "Baru".
- **Catatan:** di data demo hampir semua tiket sudah Selesai; yang berjalan hanya ORD-005 (Baru), ORD-012 & ORD-009 (Menunggu ACC). Sidebar masih menampilkan semua menu untuk semua peran (kondisi lama, server tetap menolak lewat RBAC).
- **Next Action:** opsional — filter "Tiket saya" untuk Designer; notifikasi WA proofing saat mockup dikirim (Fase 4).

### [2026-10-19] — Claude (Claude Code) — Perbaikan: Sesi Antar-Tab Tidak Sinkron
- **Masalah:** token login disimpan di `localStorage` yang dipakai bersama semua tab. Login/ganti peran/keluar di satu tab mengganti token untuk semua tab, tetapi tab lain tetap menampilkan nama & peran lama → aksi ditolak 403 ("Diizinkan: owner") padahal sidebar menulis Owner.
- **Dikerjakan:** `role-context.tsx` mendengarkan event `storage` (hanya dipicu dari tab lain): token berganti → muat ulang `/auth/me` dan perbarui user (halaman ikut dimuat ulang karena `key` layout memakai `user.id`); token dihapus → user dikosongkan sehingga layout mengarahkan ke `/login`. Sakelar "Kirim WhatsApp Otomatis" ikut disinkronkan antar-tab. `TOKEN_KEY` diekspor dari `src/core/api/client.ts`.
- **File diubah:** `WEB ATAYLOR/src/components/shell/role-context.tsx`, `src/core/api/client.ts`, `AI_GUA.md`.
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; server 3000 dijalankan ulang. Chrome dua tab: tab B ganti peran Owner → Admin lewat menu "Masuk sebagai" → tab A (Kanban) langsung menampilkan "Budi Santoso · Admin Sentral" tanpa reload; dikembalikan ke Owner → tab A ikut "H. Ahmad Fauzi · Owner". Jalur "keluar di tab lain → tab ini ke /login" **tidak** diuji di browser (agar sesi pemilik tidak dicabut); hanya diperiksa lewat kode.
- **Catatan:** ini memperbaiki tampilan basi; penyimpanan token di `localStorage` tetap harus diganti cookie httpOnly sebelum online (§6).

### [2026-10-19] — Claude (Claude Code) — Katalog AI Training Nyata (Owner) & Panel "Yang Dipelajari AI dari Pesanan"
- **Keputusan pemilik:** katalog bisa diedit **khusus Owner**; pesanan input manual juga harus "dipelajari" AI; panel dikerjakan sekalian; persona/batas diskon belum.
- **Dikerjakan:**
  1. **Katalog nyata:** tabel di `/ai-training` kini membaca tabel `products` (sebelumnya `SEED_PRODUCTS` mock yang berbeda dari data form pesanan). Owner: "Tambah Produk" & "Ubah" per baris (modal: nama, kategori, harga, MOQ, durasi, kapasitas harian, SLA desain, DP min %, revisi gratis, aktif/nonaktif). Produk **tidak dihapus**, hanya dinonaktifkan (hilang dari form pesanan, pesanan baru ditolak BR-20). Harga baru hanya untuk pesanan baru (`order_items.unit_price` lama tetap) — modal memberi peringatan saat harga diubah. Peran lain hanya melihat.
     - API: `POST /products`, `PATCH /products/{id}` (role `owner`), `GET /products?include_inactive=1` (hanya berlaku untuk Owner). `ProductRequest` (validasi + nama unik per tenant), `ProductService` (audit `PRODUCT_CREATED` / `PRODUCT_UPDATED` hanya field yang berubah), `ProductResource`.
     - Tombol palsu "Sinkronkan Pengetahuan" dihapus → diganti "Katalog terakhir diubah …". Menu sidebar AI Training tidak lagi berlabel `MOCK`; kartu yang masih simulasi (persona, vector store, WhatsApp) diberi `MOCK` masing-masing.
  2. **Panel "Yang Dipelajari AI dari Pesanan"** (`GET /ai/order-insights?days=30|90|365`, admin/owner/manager; `OrderInsightsService`): dari **semua** pesanan (online + input manual, satu antrean BR-01) kecuali dibatalkan — jumlah pesanan manual vs online, total & rata-rata pcs, pelanggan berulang, produk terlaris, sebaran ukuran & jenis lengan, lama produksi nyata (SPK terbit → tiba di gudang) vs standar, dan daftar **"Ringkasan untuk chatbot"** (kalimat yang nanti jadi konteks AI). Hanya angka agregat — tanpa nama/nomor pelanggan. Harga & jadwal tetap dari katalog/kapasitas, bukan dari panel ini.
  3. **Bug ditemukan saat uji browser & diperbaiki:** `PATCH /products/{product}` memakai route model binding → selalu 404 karena binding berjalan sebelum middleware tenant (RLS). Diganti ID string + `findOrFail` dan aturannya ditulis di §7 butir 5. Test tidak menangkapnya karena konteks tenant tersisa antar-request di proses test → `TestCase::api()` kini mengosongkan konteks tenant; dibuktikan: kode lama gagal 3 test, kode baru lulus.
- **File diubah:** `API-ATAYLOR/app/Http/Controllers/Api/V1/{ProductController (baru),MasterDataController}.php`, `app/Http/Requests/ProductRequest.php`, `app/Http/Resources/ProductResource.php`, `app/Services/{ProductService,OrderInsightsService}.php` (baru), `app/Models/Product.php` (cast integer), `routes/api.php`, `tests/Feature/CatalogTest.php` (baru), `tests/TestCase.php`; `WEB ATAYLOR/src/components/catalog/{product-form-modal,order-insights-panel}.tsx` (baru), `src/core/repositories/{catalog (baru),order}.repository.ts`, `src/core/adapters/api/api-catalog.adapter.ts` (baru), `src/app/(dashboard)/ai-training/page.tsx`, `src/components/shell/sidebar.tsx`, `AI_GUA.md` (§1, §4, §6, §7).
- **Verifikasi:**
  - `JALANKAN-TEST.bat` → 30 passed (252 assertions). Test baru: hanya Owner bisa tambah/ubah (Admin/Manager 403), ubah harga → pesanan baru pakai harga baru & pesanan lama tetap 95.000, audit log berisi field yang berubah saja, nonaktif tersembunyi dari form & ditolak BR-20, `include_inactive` diabaikan untuk Admin, validasi (nama ganda, harga < 1000, DP > 100, MOQ 0), insight memuat pesanan manual & lengan panjang tanpa nama/nomor pelanggan, Designer 403.
  - `tsc --noEmit` bersih; `npm run build` lulus; server 3000 dijalankan ulang.
  - Chrome sebagai Owner: katalog 5 produk dari database, panel insight (12 pesanan: 8 manual, 4 online, 653 pcs) dan ringkasan chatbot tampil, modal Ubah terbuka (menutup layar penuh). Simpan pertama gagal 404 (bug di atas). Setelah perbaikan, simpan di browser ditolak 403 karena **token di browser sudah berganti ke Admin** — pemilik sedang memakai aplikasi di tab lain (token tersimpan bersama di localStorage per browser). Simpan lalu diverifikasi lewat API dengan token Owner terpisah: MOQ Polo 15 → 16 (200) lalu dikembalikan ke 15 (200); token uji dicabut. Simpan dari modal browser setelah perbaikan **belum** dilihat langsung.
- **Temuan lain:** ganti peran/login di satu tab mengganti sesi di semua tab, tetapi tab lain tidak ikut memperbarui tampilan (nama/peran di sidebar basi sampai dimuat ulang). Bagian dari catatan "token login jangan di localStorage" di §6.
- **Next Action:** persona & batas diskon ke database (FR-AT); versi + rollback katalog (FR-AT); sinkronkan tampilan sesi antar-tab (event `storage`) atau pindah token ke cookie httpOnly.

### [2026-10-19] — Claude (Claude Code) — Lonceng Notifikasi "Perlu Ditindaklanjuti"
- **Masalah:** lonceng navbar hanya hiasan bawaan template (tanpa aksi, titik berkedip selalu menyala).
- **Dikerjakan (opsi A pemilik):**
  1. **Backend** `GET /api/v1/notifications` (semua peran login) → `NotificationService`: dihitung langsung dari data terkini, tanpa tabel baru; item hilang sendiri setelah ditangani. Urutan: danger → warning → info, lalu terbaru; maks 30 item + `total` & `urgent`.
     - **Admin:** pembayaran menunggu validasi, slot lock 24 jam masih berjalan (danger bila ≤ 6 jam), siap terbitkan SPK (gerbang BR-09 lengkap), SLA desain terlewat/≤ 3 jam, pesanan lewat tenggat, menunggu pelunasan.
     - **Owner:** lewat tenggat, SPK belum diserahkan ke vendor (BR-27), menunggu pelunasan.
     - **Manager:** lewat tenggat, SPK belum diserahkan ke vendor. **Designer:** SLA desain. **Super Admin:** kosong.
     - Pesanan selesai/dibatalkan/kedaluwarsa tidak dihitung tenggatnya.
  2. **Frontend** `components/shell/notification-bell.tsx` (+ repository/adapter `notification`): angka di lonceng (merah + berdenyut bila ada yang mendesak, emas bila tidak; hilang bila kosong), panel "Perlu Ditindaklanjuti" berisi titik warna, judul, kode pesanan, keterangan; klik item membuka pesanan (SPK belum didispatch → `/production/spk`). Dimuat ulang saat pindah halaman, setiap 60 detik, dan saat dibuka; tombol muat ulang; state loading/kosong/gagal. Tutup dengan klik di luar / Esc.
- **File diubah:** `API-ATAYLOR/app/Services/NotificationService.php` (baru), `app/Http/Controllers/Api/V1/NotificationController.php` (baru), `routes/api.php`, `tests/Feature/NotificationTest.php` (baru); `WEB ATAYLOR/src/components/shell/{notification-bell (baru),topbar}.tsx`, `src/core/types/notification.types.ts`, `src/core/repositories/notification.repository.ts`, `src/core/adapters/api/api-notification.adapter.ts` (baru), `AI_GUA.md` (§1, §3.3, §4).
- **Verifikasi:** `JALANKAN-TEST.bat` → 25 passed (205 assertions); test baru: isi Admin (pending/tenggat/pelunasan, tanpa dispatch), urutan danger dulu, Owner melihat SPK belum didispatch, Designer hanya SLA desain, item hilang setelah pembayaran ditolak. `tsc --noEmit` bersih, `npm run build` lulus, server 3000 dijalankan ulang. Chrome (Admin, data demo): lonceng "3", panel berisi SLA desain terlewat ORD-2026-005, lewat tenggat ORD-2026-006, siap terbitkan SPK ORD-2026-004; klik item membuka ORD-2026-006 dan panel menutup. Lebar 375px: panel pas (16px kiri-kanan). Tampilan Owner/Manager/Designer hanya diuji lewat test, belum dilihat di browser.
- **Next Action:** bila nanti perlu "tandai sudah dibaca" atau notifikasi WA/email, tambahkan tabel notifikasi tersendiri.

### [2026-10-19] — Claude (Claude Code) — Profil Sidebar Ringkas & Sakelar Otomasi Pindah ke Owner
- **Dikerjakan (keputusan pemilik: opsi A):**
  1. **Navbar:** pil "Otomasi: High/Low Season" dan pil "Role" dihapus; tersisa ☰, breadcrumb, lonceng.
  2. **Profil sidebar** (`role-switcher.tsx` ditulis ulang): satu baris inisial + nama + nama peran (tanpa "Aktor RBAC · Akun Demo", tanpa dropdown besar). Klik → menu kecil: "Masuk sebagai" (5 peran, badge `MOCK`, hanya bila `NEXT_PUBLIC_DEMO_MODE=true`) dan "Keluar". Menutup dengan klik di luar / Esc. Inisial melewati gelar ("H. Ahmad Fauzi" → AF).
  3. **Sakelar BR-21** pindah ke kartu **"Kirim WhatsApp Otomatis"** di `/ai-training`: sakelar Aktif/Nonaktif + penjelasan bahasa sehari-hari untuk tiap pilihan; **hanya Owner** yang bisa mengubah (peran lain terkunci dengan keterangan). Tetap `MOCK` dan dinyatakan jujur di kartu: belum tersambung WhatsApp, tersimpan di browser saja. Halaman Chatbot kini hanya menampilkan status "WhatsApp otomatis: Aktif · atur di AI Training".
  4. `Switch` mendapat prop `disabled`. Flag `NEXT_PUBLIC_DEMO_MODE=true` ditambahkan ke `.env.local` (lokal) dan `.env.example`.
- **File diubah:** `WEB ATAYLOR/src/components/shell/{topbar,role-switcher}.tsx`, `src/components/ui/switch.tsx`, `src/app/(dashboard)/{ai-training,agent-playground}/page.tsx`, `.env.example`, `AI_GUA.md` (§3.3, §6).
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; server port 3000 dijalankan ulang. Chrome: sebagai Owner — profil ringkas tampil, menu terbuka/tertutup (Esc), sakelar Aktif↔Nonaktif berfungsi lalu dikembalikan ke Aktif; ganti peran ke Admin lewat menu "Masuk sebagai" berhasil; sebagai Admin sakelar terkunci; halaman Chatbot menampilkan status. Tampilan HP (drawer) untuk profil baru belum dicek ulang.
- **Next Action:** simpan sakelar ke `tenants.automation_mode` saat integrasi WhatsApp (Fase 4) dimulai.

### [2026-10-19] — Claude (Claude Code) — Perbaikan: Pembayaran Gagal Saat Melampirkan Bukti
- **Masalah (laporan pemilik):** catat pembayaran **dengan** bukti bayar gagal, tanpa bukti berhasil.
- **Penyebab (terbukti):** PHP portable memakai batas bawaan `upload_max_filesize = 2M`, sedangkan aturan aplikasi mengizinkan 5 MB dan foto HP umumnya 2–5 MB. PHP membuang file sebelum sampai ke Laravel → 422 "The proof failed to upload." (direproduksi dengan file 3 MB). Foto QC (Kanban) dan mockup terkena masalah yang sama.
- **Dikerjakan:**
  1. `.devtools/php/php.ini`: `upload_max_filesize` 2M → 10M, `post_max_size` 8M → 12M; server API (`php artisan serve`) dijalankan ulang. Ditemukan **dua** instance `artisan serve` aktif (script demo sempat dijalankan dua kali) — keduanya dihentikan, satu dijalankan ulang di jendela "A-Taylor API".
  2. Frontend: `src/lib/image.ts` — `prepareUpload()` mengompres foto di browser (maks 1920px, JPEG 85%; PDF/GIF/file < 500 KB dikirim apa adanya) lalu menolak dengan pesan jelas bila masih melebihi batas. Dipakai di adapter bukti bayar & foto QC; mockup hanya dicek ukurannya (tanpa kompres agar kualitas desain terjaga).
  3. Backend: pesan validasi bahasa Indonesia untuk `uploaded`/`max`/tipe file di `StorePaymentRequest`, `MoveStageRequest`, `DesignVersionRequest`.
- **File diubah:** `.devtools/php/php.ini` (lokal, tidak di-commit), `WEB ATAYLOR/src/lib/image.ts` (baru), `src/core/adapters/api/{api-payment,api-kanban,api-order}.adapter.ts`, `API-ATAYLOR/app/Http/Requests/{StorePaymentRequest,MoveStageRequest,DesignVersionRequest}.php`, `tests/Feature/SequenceAndFilesTest.php`, `AI_GUA.md` (§1).
- **Verifikasi:**
  - Sebelum: file 3 MB → 422 "The proof failed to upload.". Sesudah: file 3 MB lolos sampai validasi Laravel; file 6 MB → "Bukti bayar maksimal 5 MB." (diuji dengan nominal sengaja tidak valid agar tidak ada data tercatat).
  - Chrome (Admin): pesanan uji baru **ORD-2026-012** (Kaos 24 pcs) — catat DP Rp 780.000 dengan foto JPEG 4000×3000 berukuran **6,9 MB** (di atas batas 5 MB) → berhasil, file tersimpan **1,09 MB** setelah dikompres → klik **Validasi** → status Valid.
  - `JALANKAN-TEST.bat` → 22 passed (181 assertions), termasuk test baru bukti > 5 MB ditolak tanpa membuat pembayaran. `tsc --noEmit` bersih, `npm run build` lulus.
  - Belum diuji: upload langsung dari kamera HP sungguhan dan format HEIC iPhone (bila browser tidak mengonversi ke JPEG, `createImageBitmap` bisa gagal → file asli dikirim dan ditolak server sebagai tipe tidak valid).
- **Next Action:** saat deploy, samakan `upload_max_filesize`/`post_max_size` di php.ini server (dan batas body Nginx).

### [2026-10-19] — Claude (Claude Code) — Simulasi Alur Admin, Ekspor Excel Executive, Responsif HP
- **Dikerjakan:**
  1. **Simulasi alur admin sampai selesai (UI):** dijalankan penuh di Chrome sebagai Admin — ORD-2026-011 (Jaket Bomber, Pendek M6 L6, Rp 2.640.000): input form → kirim mockup v1 → catat ACC manual → catat DP Rp 1.320.000 → validasi → gerbang SPK hijau → terbitkan SPK-AT-2026-0007 → Kanban maju 4 tahap (Tiba di Gudang dengan unggah foto QC) → status Menunggu Pelunasan → catat & validasi pelunasan → **Selesai**, sisa Rp 0. Tidak ada langkah yang macet; tidak perlu perubahan logika. Dispatch vendor tetap khusus Owner/Manager (BR-27) dan tidak menghalangi Kanban.
  2. **Ekspor Excel Executive** (`GET /api/v1/executive/export.xlsx`, khusus Owner, periode sama dengan filter): tombol "Unduh Excel" di samping "Unduh CSV". Isi workbook:
     - **Ringkasan** — KPI periode + "Estimasi Laba" yang merujuk total sheet rincian.
     - **Rincian & Modal** (sheet yang terbuka pertama) — per item: order, tanggal, pelanggan, status, produk, warna, jenis lengan, ukuran, qty, **Harga Jual / pcs (otomatis)**, subtotal, **Biaya Produksi / pcs (kosong, latar kuning, isi manual, validasi angka ≥ 0)**, lalu rumus Total Biaya Produksi, Laba Kotor, Margin. Baris TOTAL; margin total hanya dari baris yang biayanya sudah diisi. Freeze pane + autofilter. Pesanan dibatalkan tidak disertakan.
     - **Rekap Pesanan** — per pesanan (seperti CSV + total qty).
  3. **Responsif HP tanpa mengubah desain desktop:** sidebar menjadi drawer di bawah 1024px (☰ membuka, latar gelap/klik menu menutup); tabel AI Training, Platform (2), Inventory diberi `overflow-x-auto` (sebelumnya terpotong); judul kolom tabel yang bisa digeser tidak terlipat; kolom Kanban tidak memaksa tinggi 420px di HP; padding pratinjau cetak SPK mengecil di HP dan tabel ukuran bisa digeser (cetak A4 tidak berubah).
  4. **Perbaikan modal:** animasi `fade-in-up`/`.dash-stagger` memakai fill `both` sehingga `transform` tertinggal dan modal `fixed` (rework/foto QC/riwayat Kanban) hanya menutup area konten. Diganti `backwards` — tampilan animasi sama.
- **File diubah:** `API-ATAYLOR/composer.{json,lock}` (+ `phpoffice/phpspreadsheet` 5.10, tanpa advisory), `app/Services/ExecutiveExcelExport.php` (baru), `app/Http/Controllers/Api/V1/ExecutiveController.php`, `routes/api.php`, `tests/Feature/ExecutiveExcelTest.php` (baru); `WEB ATAYLOR/src/app/(dashboard)/layout.tsx`, `src/components/shell/sidebar.tsx`, `src/app/(dashboard)/executive/page.tsx`, `src/core/repositories/spk.repository.ts`, `src/core/adapters/api/api-spk.adapter.ts`, `src/app/(dashboard)/{ai-training,platform,inventory,production/kanban,production/spk/[id]/print}/page.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `AI_GUA.md` (§1, §3, §4, §8).
- **Verifikasi:**
  - `JALANKAN-TEST.bat` → 21 passed (177 assertions). Test baru: workbook punya 3 sheet, J5 harga terisi, L5 kosong, setelah L5 diisi rumus Total Biaya & Laba Kotor benar, ada Lengan Pendek & Panjang, Ringkasan merujuk sheet rincian; Admin ditolak 403.
  - `tsc --noEmit` bersih; `npm run build` lulus (16 rute). Server `next start` port 3000 dijalankan ulang dengan build baru.
  - Chrome: alur ORD-2026-011 di atas; Executive sebagai Owner menampilkan tombol Excel; endpoint dipanggil dari halaman → 200, tipe xlsx, 13 KB, header ZIP valid; isi workbook dari data demo dibaca ulang dengan PhpSpreadsheet dan sesuai. **Tombol "Unduh Excel" tidak diklik** (agar tidak menyimpan file ke folder Downloads tanpa izin) dan file belum dibuka di Microsoft Excel/LibreOffice.
  - Lebar 375px (iframe, karena jendela Chrome tidak bisa di-resize): 15 halaman diperiksa skrip pencari elemen terpotong + screenshot beranda, OMS, form, detail, Kanban, Executive; drawer buka/tutup diuji dengan klik. Tabel AI Training/Platform/Inventory dan pratinjau SPK yang tadinya terpotong sudah diperbaiki, tetapi **belum dicek ulang di browser** setelah perbaikan (hanya lolos build).
  - Data demo kini berisi tambahan ORD-2026-011 (selesai) + SPK-AT-2026-0007; foto QC uji = `public/logo.png`.
- **Next Action:** opsional — simpan biaya produksi per produk di database (sekarang hanya di file Excel) agar laba bisa tampil di dashboard.

### [2026-10-19] — Claude (Claude Code) — Rincian Pesanan per Ukuran × Jenis Lengan
- **Dikerjakan:**
  1. **Form `/orders/new`:** "Ukuran Pokok" + "Jumlah / Qty" diganti blok varian: pilihan Lengan Pendek/Panjang (`SegmentedControl`), grid S–3XL (`QtyStepper`, bilangan bulat ≥ 0, tombol −/+; 6 kolom desktop, 3 kolom HP), subtotal per blok. Toggle **Custom Lanjutan** (`Switch`) memunculkan "+ Tambah Varian"; jenis lengan tidak bisa dobel (opsi terpakai dinonaktifkan, tombol tambah hilang jika semua terpakai); blok tambahan bisa dihapus, blok pertama tidak; mematikan toggle saat blok tambahan berisi qty meminta konfirmasi inline (bukan `window.confirm`). **Total Qty** read-only dipakai untuk peringatan MOQ (merah), Total, DP minimum, Saldo; tombol Simpan nonaktif jika total 0. Hanya ukuran dengan qty > 0 yang dikirim.
  2. **Backend:** migrasi baru `2026_10_19_100000_add_sleeve_type_to_order_items` (enum `pendek|panjang`, default `pendek` → baris lama otomatis "pendek"; migrasi lama tidak diubah). **Payload `POST /orders` berubah:** `product_id` & `color` di level pesanan, `items: [{sleeve_type, size, qty}]` (format lama `items.*.product_id/color` tidak diterima lagi). `StoreOrderRequest`: ukuran S/M/L/XL/XXL/3XL, qty integer ≥ 1, sleeve_type valid, kombinasi (lengan, ukuran) ganda ditolak, minimal 1 item. `OrderService`: harga dari `products.base_price`, subtotal = qty × harga, MOQ dicek terhadap total qty. `OrderItemResource` mengembalikan `sleeveType`.
  3. **Tampilan rincian:** tabel per jenis lengan (kolom S–3XL, jumlah, subtotal) di detail `/orders/[id]` dan di cetak SPK `/production/spk/[id]/print` (helper `src/lib/order-items.ts`). Kanban & daftar SPK kini menampilkan **total** qty (sebelumnya qty baris pertama saja — akan salah untuk pesanan multi-ukuran).
  4. Seeder: ORD-2026-005 kini berisi 2 jenis lengan (total tetap 120 pcs). Token baru `dash-danger-soft/line/strong` (dipakai juga oleh `<Notice>`).
- **File diubah:** `API-ATAYLOR/database/migrations/2026_10_19_100000_add_sleeve_type_to_order_items.php` (baru), `app/Models/OrderItem.php`, `app/Http/Requests/StoreOrderRequest.php`, `app/Services/OrderService.php`, `app/Http/Resources/OrderItemResource.php`, `database/seeders/DatabaseSeeder.php`, `tests/Feature/OrderItemsTest.php` (baru), `tests/Feature/{OrderLifecycleTest,SequenceAndFilesTest}.php` (payload baru); `WEB ATAYLOR/src/components/ui/{segmented-control,switch,qty-stepper}.tsx` (baru), `src/lib/order-items.ts` (baru), `src/lib/constants.ts`, `src/core/types/order.types.ts`, `src/components/ui/error-state.tsx`, `tailwind.config.ts`, `src/app/(dashboard)/{orders/new,orders/[id],production/spk,production/spk/[id]/print,production/kanban}/page.tsx`, `AI_GUA.md` (§1, §3, §4, §5, §6).
- **Verifikasi:**
  - `JALANKAN-TEST.bat` → 19 passed (160 assertions); 7 test baru: multi-ukuran + 2 jenis lengan (total & total_amount), qty 0/negatif/kosong ditolak, ukuran & jenis lengan tidak valid ditolak, kombinasi ganda ditolak (ukuran sama beda lengan tetap boleh), total < MOQ ditolak (tiap baris < MOQ tapi total ≥ MOQ diterima), harga dari browser diabaikan, baris lama tanpa `sleeve_type` = "pendek".
  - `tsc --noEmit` bersih; `npm run build` lulus (16 rute).
  - `php artisan migrate` dijalankan di DB demo `ataylor` (data lama tetap, terisi "pendek"). **Data demo tidak di-reset**, jadi perubahan seeder ORD-2026-005 baru terlihat setelah `RESET-DATA-DEMO.bat`.
  - Chrome (admin): buat **ORD-2026-010** (Jaket Bomber, Pendek M10 L8 + Panjang L5 = 23 pcs, Rp 5.060.000) lewat form → detail menampilkan 2 baris lengan benar; konfirmasi mematikan toggle muncul & tombol Batal bekerja; opsi lengan terpakai nonaktif dan "+ Tambah Varian" hilang. Pesanan itu lalu dibawa sampai SPK terbit lewat API (mockup, ACC manual, DP, validasi) → cetak SPK menampilkan tabel per lengan, total 23 pcs. ORD-2026-010 + SPK-nya **tertinggal di data demo** (hapus dengan reset bila perlu).
  - Lebar HP dicek lewat iframe 375px: grid 3 kolom, tanpa scroll horizontal. Catatan: sidebar 250px tidak menyusut otomatis di HP (kondisi shell lama, bukan bagian tugas ini). Dialog cetak tidak dibuka.
- **Next Action:** shell/sidebar responsif untuk HP; bila nanti satu pesanan perlu >1 produk/warna, payload perlu dikembangkan (saat ini 1 produk + 1 warna per pesanan).

### [2026-10-18] — Claude (Claude Code) — Daftar Kebutuhan Integrasi WhatsApp & AI
- **Dikerjakan:** Menambah subbagian **§6 "Kebutuhan Fase 4 — Integrasi WhatsApp & AI"** (dokumentasi saja, belum ada kode): alur WA → FastAPI → Laravel, daftar API eksternal (Meta Cloud API, Gemini 2.5 Flash, Claude Haiku 4.5, R2, VPS/HTTPS, Redis, SMTP), syarat yang harus disiapkan klien (verifikasi Meta, nomor WA, kredensial, template), fungsi FR-CB/FR-MA/FR-AT, komponen yang belum dibangun, komponen biaya, dan urutan kerja. Sumber: SRS v1.0, Arsitektur v2.0, PRD v9.0.
- **Catatan:** angka biaya tidak tersedia di `ATAYLOR BAHAN`; dokumen "Rekomendasi Arsitektur Sistem & Analisis Biaya Operasional" belum ada.

### [2026-10-18] — Claude (Claude Code) — Script JALANKAN-TEST.bat
- **Dikerjakan:** `JALANKAN-TEST.bat` di root: menyalakan PostgreSQL bila mati, menjalankan `php artisan test` dengan PHP portable, menampilkan ringkasan lulus/gagal. §1 diperbarui (perintah `php` biasa tidak dikenali karena PHP portable tidak ada di PATH).
- **Verifikasi:** script dijalankan → 12 passed (112 assertions), "SEMUA TEST LULUS".

### [2026-10-18] — Claude (Claude Code) — Langkah 2: Git, Test Permanen, Nomor Urut, Upload Privat
- **Dikerjakan:**
  1. **Nomor urut:** `SequenceService` kini mencari nomor terbesar secara **angka**, bukan teks — sebelumnya order ke-1001 bentrok karena "ORD-2026-1000" < "ORD-2026-999" (begitu juga SPK setelah 9999).
  2. **Upload privat:** `FileStorage` menyimpan ke disk privat dan membuat tautan bertanda tangan 30 menit; route baru `GET /api/v1/files/{path}` (`FileController`, middleware `signed`, cegah `..`). `PaymentResource`, `DesignTicketResource`, `OrderResource` mengubah path menjadi tautan itu. Nilai lama berupa URL absolut/path `/...` tetap dikembalikan apa adanya.
  3. **Test permanen:** PHPUnit memakai PostgreSQL DB `ataylor_test` (dibuat, owner `ataylor_app`); `tests/TestCase.php` (helper `api(role, ...)` login via token demo asli, `db()` bypass RLS); `tests/Feature/{AuthAndTenancyTest, OrderLifecycleTest, SequenceAndFilesTest}.php` menggantikan smoke test sementara; ExampleTest bawaan dihapus.
  4. **Git:** `git init -b main` di root, `.gitignore` root (toolchain, template, build, `.env`), commit pertama. Password DB dikeluarkan dari `phpunit.xml` (diambil dari `.env`).
- **File diubah:** `API-ATAYLOR/app/Services/{SequenceService,FileStorage}.php`, `app/Http/Controllers/Api/V1/FileController.php` (baru), `app/Http/Resources/{Payment,DesignTicket,Order}Resource.php`, `routes/api.php`, `phpunit.xml`, `tests/**`, `.gitignore` (baru), `AI_GUA.md` (§1, §6).
- **Verifikasi:** `php artisan test` → 12 passed (112 assertions); test nomor urut dirancang gagal pada kode lama. API dev yang berjalan: `GET /orders` 200, file tanpa tanda tangan 403. Pemindaian file staged: tidak ada password/APP_KEY. Frontend tidak diubah (tautan file dibuka seperti biasa).
- **Next Action:** langkah 3 (pengamanan sebelum online, lihat §6 Fase 3) dan fitur Fase 3.

### [2026-10-18] — Claude (Claude Code) — Perbaikan Pra-Presentasi: Tanggal WITA & Cetak KPI
- **Dikerjakan:** (1) Tanggal "hari ini" di frontend kini menurut WITA lewat helper `localDate()` di `src/lib/date.ts` — sebelumnya memakai UTC sehingga mundur sehari sebelum 08.00 WITA (rentang Executive, tenggat form pesanan, penanda Terlambat di OMS & Kanban, tanggal dispatch SPK). **Aturan:** jangan pakai `toISOString().slice(0, 10)` untuk tanggal lokal. (2) Cetak/PDF kini memaksa warna latar ikut tercetak (`print-color-adjust: exact` di `globals.css`) agar teks putih kartu KPI tidak hilang.
- **File diubah:** `WEB ATAYLOR/src/lib/date.ts` (baru), `src/app/globals.css`, `src/app/(dashboard)/{executive,orders,orders/new,production/kanban,production/spk}/page.tsx`.
- **Verifikasi:** simulasi 06.30 WITA: cara lama = 18 Okt, `localDate()` = 19 Okt; `tsc` & `npm run build` lulus; di Chrome rentang Executive = 19 Sep–18 Okt (WITA) dan aturan cetak termuat. Dialog cetak tidak dibuka otomatis (harus dicoba manual).
- **Next Action:** langkah 2 analisis — `git init`, pindahkan smoke test ke `tests/`, perbaiki urutan nomor order/SPK (>999/>9999), simpan upload di disk privat.

### [2026-10-18] — Claude (Claude Code) — Warna Tema: Ungu → Emas Logo
- **Dikerjakan:** Atas permintaan pemilik (ungu/violet dilarang), warna primer Skydash #4B49AC diganti **emas benang logo #F5B800**; kanvas lavender → krem hangat #F7F6F2; kartu KPI = emas, arang, biru langit, coral; badge WIP → arang lembut; bayangan & fokus input ikut emas. Kontras dijaga: teks di atas emas memakai `dash-ink`, teks emas di atas putih memakai `dash-primary-strong` (#9A6B00). Layout, animasi, logika, dan API tidak berubah. Perbaikan kecil: sapaan beranda melewati gelar berakhiran titik ("H. Ahmad" → "Ahmad").
- **File diubah:** `WEB ATAYLOR/tailwind.config.ts`, `src/app/globals.css`, `src/components/ui/{button,badge,empty-state}.tsx`, `src/components/shell/{sidebar,topbar,role-switcher}.tsx`, kelas warna di `src/app/(auth)/login` dan beberapa `src/app/(dashboard)/**/page.tsx`, `AI_GUA.md` §3.
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus; dicek di Chrome (beranda, Executive, Kanban) — tidak ada warna ungu tersisa; grep kode tidak menemukan #4B49AC/#7978E9/#4747A1.
- **Next Action:** tetap §6 Fase 3.

### [2026-10-18] — Claude (Claude Code) — Ganti Tema ke Skydash (tampilan saja)
- **Dikerjakan:** Tema Skydash Free (`skydash-free/`) diterapkan ke seluruh frontend **tanpa mengubah logika, API, atau alur**. Template tidak dipasang (tanpa Bootstrap/jQuery/Chart.js); warna, radius, font, dan pola layout-nya diterjemahkan ke token Tailwind `dash-*`. Bagian 3 dokumen ini ditulis ulang (aturan Clean Carbon lama dihapus).
  - Token tema + keyframes animasi di `tailwind.config.ts`; kanvas, fokus input, shimmer, stagger, reduced-motion di `globals.css`; font Nunito.
  - Komponen dasar: `Card` (20px, bayangan lembut), `Button` (ungu, efek angkat), `Badge` (pil), `Skeleton` (shimmer), `EmptyState`, `ErrorState`/`Notice` (animasi masuk), `DemoMockBadge`.
  - Shell: sidebar putih ala Skydash (bisa diciutkan), navbar putih + tombol ☰, kartu profil RBAC, layout dengan animasi pindah halaman.
  - Beranda: sapaan "Selamat Datang" + kartu hero + 4 kartu KPI berwarna Skydash. Executive: KPI berwarna, batang grafik ungu beranimasi. Login: gaya halaman auth Skydash.
  - Halaman lain: kelas warna/radius diganti massal ke token tema (header kartu, tabel, input, segmented control, modal, Kanban).
- **File diubah:** `WEB ATAYLOR/tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/{button,card,badge,skeleton,empty-state,error-state,demo-mock-badge}.tsx`, `src/components/shell/{sidebar,topbar,role-switcher}.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/(auth)/login/page.tsx`, dan kelas gaya di semua `src/app/(dashboard)/**/page.tsx`.
- **Verifikasi:** `tsc --noEmit` bersih; `npm run build` lulus. Dicek di Chrome: login, beranda, OMS list, detail ORD-2026-002, Kanban, Executive (Owner), AI Training — tampil sesuai tema, data live tetap muncul.
- **Next Action:** tetap §6 Fase 3. Bila menambah halaman baru, ikuti §3 (token `dash-*`, komponen dasar).

### [2026-10-18] — Claude (Claude Code) — Backend Laravel + PostgreSQL & Integrasi Frontend (Fase 2, siap presentasi)
- **Dikerjakan:**
  1. Pasang toolchain portable di `.devtools/` (PHP 8.3.35 checksum cocok rilis resmi, Composer, PostgreSQL 16.15 port 5433). Laravel 11 diblokir advisory keamanan → dipakai Laravel 12.70.
  2. Backend `API-ATAYLOR/`: migrasi skema §5 (UUID, `tenant_id`), RLS FORCE + role DB non-superuser, `TenantContext` + global scope, Sanctum, middleware `role:`, `BusinessRuleException` (HTTP 422 + kode BR), `AuditLogger` dengan `correlation_id`, Services (Order, Design, Payment, Spk, Kanban, Executive), command terjadwal `orders:expire-slot-locks` (BR-07), seeder 8 skenario demo + tenant B untuk uji isolasi.
  3. Frontend: API client + adapter repository (`src/core/adapters/api/`), sesi login nyata (`role-context.tsx`), guard login di layout dashboard, halaman OMS list/new/detail (alur Desain → Bayar → SPK), Kasir, Kanban (modal rework & foto QC), SPK & Dispatch, Cetak SPK, Executive (periode, CSV), ringkasan beranda. Konstanta status/tahap diseragamkan dengan backend (`antrean`, `proses_jahit`, ...). Adapter mock & seed OMS lama dihapus; seed modul MOCK lain dipertahankan.
  4. Skrip `JALANKAN-DEMO.bat` & `RESET-DATA-DEMO.bat`.
- **Verifikasi:**
  - Smoke test E2E HTTP 41/41 lulus: BR-02, MOQ, BR-05/06/07/09/11/12/24/27, RBAC (owner tidak bisa buat order, admin tidak bisa executive/dispatch, manager tidak bisa terbitkan SPK), isolasi tenant B, CSV, audit log.
  - `tsc --noEmit` bersih; `npm run build` lulus (16 rute).
  - Dicek di Chrome: login admin, beranda, OMS list, detail ORD-2026-004 (gate SPK hijau), Kanban, Executive sebagai Owner; tidak ada error konsol.
  - `RESET-DATA-DEMO.bat` dijalankan & berhasil. `JALANKAN-DEMO.bat` belum diuji dari awal (server sudah menyala saat sesi).
- **Keterbatasan diketahui:** modul CRM Designer/Inventory/AI Training/Chatbot/Platform masih MOCK; kapasitas harian (BR-03/15/16) belum dicek; upload ke disk lokal; scheduler perlu `php artisan schedule:work` (sudah dibuka oleh `JALANKAN-DEMO.bat`), selain itu kedaluwarsa slot juga dicek saat data dibaca.
- **Next Action:** lihat §6 Fase 3.

### [2026-10-18] — Claude (Claude Code) — Perapian AI_GUA.md & Hapus Portal Tracking
- **Dikerjakan:**
  1. BR-01 s.d. BR-27 ditulis lengkap dari SRS v1.0 §6; siklus status pesanan ditambahkan (SRS §7.3).
  2. Skema DB dilengkapi: `product_variants`, `inventory_balances`, `inventory_reservations`, `stock_ledger`, `design_tickets`, `design_versions`, `design_approvals`, `qc_records`, kolom `orders.wip_stage` & enum `status`; `dp_Required` → `dp_required`.
  3. Penomoran & hitungan dirapikan (bagian 8, 11 modul, 15 halaman); label mock disatukan menjadi `MOCK`.
  4. Tag `[cite: N]` dihapus; pilihan final: Sidebar Carbon Matte, CTA Carbon Ink.
  5. Portal publik `/tracking` dihapus (keputusan pemilik: pelanggan tidak mengakses web, cukup toko). Handoff log diubah menjadi append-only.
- **File diubah:**
  - `AI_GUA.md`
  - `WEB ATAYLOR/src/app/tracking/` (dihapus)
  - `WEB ATAYLOR/src/app/(auth)/login/page.tsx` (link "Lacak Pesanan" dihapus)
  - `WEB ATAYLOR/src/components/shell/topbar.tsx` (tombol "Lacak Order" & breadcrumb `/tracking` dihapus)
- **Verifikasi:** `npm run build` lulus (exit 0, lint & type check OK), 15 rute aplikasi + `/_not-found`; `/tracking` tidak ada lagi.
- **Next Action:** Hari 2 — tentukan folder backend Laravel, lalu Backend Slice 1 (OMS Order Intake + Kasir & Verifikasi Pembayaran).

### [2026-10-17] — Gemini (Antigravity) — Integrasi Logo Resmi A-Taylor & Refactoring Anti-AI Slop
- **Dikerjakan:**
  1. Komponen `<BrandLogo />` (`src/components/logo/brand-logo.tsx`) menggantikan icon `Scissors`; logo disalin ke `public/logo.png` & `public/logo-a-taylor.png`; dipakai di Sidebar, Login, Kop SPK A4, dan Favicon (`layout.tsx`).
  2. `Plus Jakarta Sans` + `JetBrains Mono` via `next/font/google`, utility `.tabular-nums`.
  3. Penghapusan indigo/violet, `shadow-lg/xl/2xl`, `rounded-2xl/3xl`, dan gradient.
  4. Palet Clean Carbon: kanvas `#FAFAFA`, kartu putih hairline `border-zinc-200`, sidebar `bg-zinc-950`, CTA Carbon Ink & Cobalt.
  5. Tabel padding rapat; grafik Executive Dashboard Pure CSS/SVG (First Load JS ~119 kB).
- **Verifikasi:** `npm run build` sukses, 0 error (Next.js 15.5.28).
