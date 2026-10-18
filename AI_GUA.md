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
  - Catatan: spesifikasi awal menyebut Laravel 11, tetapi Laravel 11 sudah habis masa dukungan keamanan dan diblokir Composer karena 7 security advisory — **jangan turunkan ke 11**.
- **Lingkungan Dev Lokal (portable, tanpa admin):** `.devtools/` berisi PHP 8.3.35, Composer, PostgreSQL 16.15 (port **5433**, data di `.devtools/pgdata`). Jalankan semua dengan `JALANKAN-DEMO.bat`; kembalikan data demo dengan `RESET-DATA-DEMO.bat`.
  - Akun demo (kata sandi `ataylor123`): `admin@`, `owner@`, `manager@`, `designer@`, `superadmin@ataylor.demo`; tenant uji isolasi: `admin@tenantb.demo`.
- **Version control:** repo Git di root `R:JOBWeb ATAYLOR` (branch `main`). `.devtools/`, `skydash-free/`, `node_modules`, `vendor`, `.next`, dan semua `.env` **tidak** di-commit — jangan pernah commit password/APP_KEY.
- **Test otomatis (wajib dijalankan setelah mengubah backend):** `cd API-ATAYLOR && php artisan test` → PHPUnit di `tests/Feature/` memakai database terpisah `ataylor_test` (data demo `ataylor` tidak tersentuh). Saat ini 12 test / 112 assertion: login & RLS antar-tenant, RBAC, BR-02/04/05/06/07/08/09/10/11/12/24/27, nomor urut >999, file privat.
- **Berkas upload (bukti bayar, mockup, foto QC):** disimpan di disk **privat** (`storage/app/private/tenants/{tenant_id}/...`); kolom `*_url` berisi path, dan API mengembalikan **tautan bertanda tangan yang kedaluwarsa 30 menit** (`GET /api/v1/files/{path}`, middleware `signed`). Jangan simpan upload ke disk `public`.
- **AI & Orkestrasi Service:** Python 3.12 + FastAPI (Webhook WA, LLM Abstraction Layer: Gemini 2.5 Flash [Utama] & Claude Haiku 4.5 [Eskalasi], Mini Agent, Dynamic Lead Time Engine).
- **Database & Multi-Tenant:** PostgreSQL 16 (Shared Database, Shared Schema dengan kolom wajib `tenant_id` + Row-Level Security / RLS). `tenant_id` ditentukan server dari membership user, **tidak pernah** dari input browser.
- **Queue, Cache & Storage:** Redis (Laravel Queue/Horizon) & Cloudflare R2 (S3-compatible untuk Mockup, Bukti Bayar, Foto QC).
- **Akses Sistem:** Web ini **hanya untuk internal toko** (Admin, Owner, Manager, Designer, Super Admin). **Tidak ada portal/halaman publik untuk pelanggan** — pelanggan berinteraksi hanya lewat WhatsApp (Chatbot & Mini Agent).

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
5. **Ubah tampilan lewat komponen dasar dulu** (`components/ui/*`, `components/shell/*`) sebelum mengedit kelas di halaman.

### 3.2 Palet Warna (token `dash-*`)
- **Primer (emas logo):** `dash-primary` #F5B800 (hover `dash-primary-hover` #E0A700, latar lembut `dash-primary-soft` #FFF5D1).
  - **Kontras wajib:** teks/ikon di atas latar emas = `text-dash-ink` (#1F1F1F), **jangan putih**. Teks/link emas di atas latar putih = `text-dash-primary-strong` (#9A6B00), **jangan `text-dash-primary`**.
- **Kanvas:** `dash-bg` #F7F6F2 (krem hangat); kartu `bg-white`; garis `dash-line` #ECEAE3; hover tabel `dash-hover` #F3F0E6; teks `dash-text` #1F1F1F; teks redup `dash-muted` #6C7383.
- **Kartu KPI (pola Skydash):** emas `dash-primary` (teks `dash-ink`) · arang `dash-charcoal` #232227 · biru langit `dash-tale` #7DA0FA · coral `dash-light-danger` #F3797E (tiga terakhir teks putih).
- **Semantik:** success #57B657 · warning #FFC100 · danger #FF4747 · info #248AFD · grafik sekunder `dash-sky` #98BDFF.
- **Badge status** (komponen `<Badge>`): pil `rounded-full`, latar lembut + teks warna semantik — `blue` (Brief/Baru), `amber` (Menunggu ACC/Bayar/Lock 24j), `emerald` (Valid/SPK/Selesai), `red` (Revisi/Rework/Terlambat), `zinc` → arang lembut (WIP Produksi), `slate` (netral). Penanda simulasi tetap `<DemoMockBadge />` bertuliskan `MOCK`.

### 3.3 Bentuk & Layout
- **Kartu:** `rounded-card` (20px), tanpa border, `shadow-card`, naik ke `shadow-card-hover` saat hover. Header kartu `px-5 pt-4/5`, judul tebal 15px.
- **Sidebar:** putih (lebar 250px, bisa diciutkan ke 78px lewat tombol ☰ di navbar, tersimpan di localStorage), menu aktif/hover = latar emas `dash-primary` teks `dash-ink` `rounded-lg`, label seksi huruf kapital abu.
- **Navbar:** putih tinggi 64px dengan `shadow-navbar`, pil Otomasi & Role `rounded-full`.
- **Tombol:** primer emas teks gelap `rounded-lg`, efek angkat 1px + `shadow-primary` (bayangan emas) saat hover; `outline` = putih dengan hover emas lembut.
- **Input:** `rounded-lg border-dash-line`; fokus global (globals.css) = border emas + ring emas 3px.
- **Logo** A-Taylor berlatar hitam → selalu ditaruh di kotak gelap `bg-[#111] rounded-xl`.

### 3.4 Tipografi & Data
- Font UI **Nunito** (`next/font/google`, sesuai Skydash); `JetBrains Mono` untuk ID, kode SPK, tanggal teknis.
- **Wajib `tabular-nums`** untuk nominal Rp, DP, sisa tagihan, qty, dan hitungan mundur.

### 3.5 Animasi (halus, ringan)
- Pindah halaman/ganti peran: konten `animate-fade-in-up`; beranda memakai `.dash-stagger` (anak muncul berurutan).
- Modal: latar `animate-fade-in` + blur tipis, panel `animate-scale-in`. Notifikasi `animate-slide-down`.
- Skeleton: kilau `dash-shimmer animate-shimmer`. Grafik batang `animate-grow-up`, progress bar `animate-grow-right`.
- Hover: kartu KPI naik 4px, tombol naik 1px, ikon sidebar membesar sedikit. Lonceng notifikasi `animate-ping`.
- `prefers-reduced-motion` dihormati (animasi dimatikan) dan animasi dimatikan saat cetak.

---

## 4. SITEMAP & 11 MODUL FRONTEND (TARGET DEMO 3 HARI)
Setiap halaman wajib punya 4 state: *Normal, Loading (Skeleton), Empty State, Error State*.

| No | Modul & Route Next.js | Status Target 3 Hari | Fitur Utama yang Harus Tampil |
|---|---|---|---|
| 1 | **Auth & Global Shell** (`/login`, `/`) | **Live Layout + Role Switcher** | Login, Role Switcher demo (Admin/Owner/Manager/Designer/SuperAdmin). |
| 2 | **OMS / Pesanan** (`/orders`, `/orders/new`, `/orders/[id]`) | **REAL BACKEND (Slice 1)** | Tabel order + filter (ID, kanal, status, tanggal), form tambah order (wajib Closer jika Offline), kalkulasi Total, DP min (`dp_min_percent`), Saldo. |
| 3 | **Kasir & Pembayaran** (`/payments`) | **REAL BACKEND (Slice 1)** | Validasi bukti bayar manual, input tunai/transfer, status Slot Lock 24j, tombol "Validasi Pembayaran" (kunci kuota permanen). |
| 4 | **Kanban WIP** (`/production/kanban`) | **REAL BACKEND (Slice 2)** | Board 5 kolom resmi (BR-12). Geser maju 1 tahap; modal wajib alasan jika mundur + log riwayat WIP. |
| 5 | **SPK & Dispatch** (`/production/spk`, `/production/spk/[id]/print`) | **REAL BACKEND (Slice 3)** | Gate BR-09. Preview A4 siap cetak/PDF bernomor unik + Form Dispatch Vendor (khusus Owner/Manager). |
| 6 | **Executive Dashboard** (`/executive`) | **REAL BACKEND (Slice 4)** | Filter periode, KPI (Omzet, Total Order, Online vs Offline, Bottleneck), Chart SVG, Leaderboard Marketing (`MOCK`), **Export CSV** & **Print/PDF Recap**. |
| 7 | **CRM Designer** (`/designer`) | **UI + Mock Adapter** | Board tiket (`Baru`, `Dikerjakan`, `Menunggu ACC`, `Revisi`, `Selesai`), SLA countdown, upload mockup berversi (`v1`, `v2`), log ACC. |
| 8 | **Inventory Gudang** (`/inventory`) | **UI + Mock Adapter** | Daftar SKU (Produk, Ukuran, Warna), Stok Tersedia vs Reservasi Fast Track, modal Penyesuaian Stok + alasan audit. |
| 9 | **AI Training Dashboard** (`/ai-training`) | **UI + Mock Adapter** | CRUD Katalog (Harga, MOQ, Kapasitas Harian, SLA Desain, DP min), Persona/Tone AI, batas negosiasi, tombol Sync (<60s) & Sandbox Chat. |
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
10. `order_items`: `id, tenant_id, order_id, product_id, variant_id (nullable), sku_code, color, size, qty, unit_price, subtotal`
11. `payments`: `id, tenant_id, order_id, method (cash/transfer), amount, proof_url, status (pending/valid/rejected), verified_by, verified_at, notes`

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
- [ ] Sambungkan modul MOCK ke backend: CRM Designer board, Inventory (tabel sudah ada), AI Training (CRUD produk), Platform (user, tenant, viewer `audit_logs` — endpoint `GET /audit-logs` sudah ada).
- [ ] Sakelar High/Low Season (BR-21) simpan ke `tenants.automation_mode` (sekarang masih localStorage).
- [ ] Verifikasi kapasitas harian & stok sebelum slot lock (BR-03, BR-15, BR-16) — belum ada tabel kapasitas.
- [ ] Komisi marketing (BR-18) setelah rumus disetujui Owner.
- [ ] Service FastAPI (webhook WA, LLM, Mini Agent) — notifikasi "pesanan selesai" saat ini hanya dicatat sebagai audit `CUSTOMER_NOTIFICATION_QUEUED_MOCK`.
- [ ] Redis queue/Horizon & Cloudflare R2 (upload saat ini ke disk lokal **privat**; tinggal arahkan disk ke R2).
- [x] Test otomatis PHPUnit (12 test) — tambah test untuk setiap fitur backend baru.
- [x] Git repo + commit pertama.
- [x] Nomor urut order/SPK dibandingkan sebagai angka (tidak bentrok setelah 999/9999).
- [ ] Sebelum online: `APP_DEBUG=false`, `DEMO_LOGIN_ENABLED=false`, batasi CORS ke domain frontend, ganti semua password DB, token login jangan di localStorage.

---

## 7. PROTOKOL KERJA AI (CLAUDE & GEMINI)
1. **Jangan Menulis Ulang Fondasi:** Gunakan komponen tabel, badge, modal, dan layout yang sudah ada.
2. **Validasi Ganda:** Aturan kritis (Closer wajib untuk Offline, DP minimum, Gate SPK, Urutan Kanban, ACC per versi) divalidasi di Backend Service **DAN** diberi feedback jelas di UI.
3. **Transparansi Mock (label tunggal):**
   - Badge: selalu pakai komponen `<DemoMockBadge />` (`src/components/ui/demo-mock-badge.tsx`) yang bertuliskan **`MOCK`**. Jangan membuat varian teks lain (`Demo`, `DEMO / MOCK`, dll.).
   - Toast untuk aksi simulasi: `"Simulasi Demo: Perubahan dicatat pada sesi lokal"`.
4. **Laporan Jujur:** Di handoff log, tulis hasil apa adanya (error, langkah yang dilewati, hal yang belum diverifikasi). Hindari klaim seperti "100%" atau "0ms".

---

## 8. PROGRESS & AI HANDOFF LOG (APPEND-ONLY)
> *Setiap AI menambahkan entri baru **di paling atas** daftar ini. Entri lama jangan dihapus atau ditimpa.*
> Format: `### [YYYY-MM-DD] — <AI> — <judul singkat>` lalu *Dikerjakan*, *File diubah*, *Verifikasi*, *Next Action*.

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
