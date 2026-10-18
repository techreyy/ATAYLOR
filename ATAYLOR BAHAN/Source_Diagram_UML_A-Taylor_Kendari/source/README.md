# Pemodelan Analisis — Omnichannel Agentic Ecosystem A-taylor Kendari

Basis utama: SRS v1.0 tanggal 12 Oktober 2026 yang diunggah pengguna. Diagram mencakup seluruh UC-01 s.d. UC-26 melalui empat view use case, satu activity diagram, satu sequence diagram, dan satu class diagram.

## Isi folder
- `diagrams/*.svg` — diagram vektor yang dapat diedit di Inkscape, Figma (import SVG), Illustrator, atau editor SVG.
- `diagrams/*.png` — versi raster untuk dokumen/presentasi.
- `source/*.puml` — sumber tekstual PlantUML untuk penyuntingan semantik dan regenerasi diagram.
- `Pemodelan_Analisis_A-Taylor_Kendari.docx` — dokumen hasil yang siap dibaca/dimasukkan ke laporan.

## Catatan analisis
1. Empat view use case dipisahkan berdasarkan domain supaya relasi aktor tidak terlalu padat; total mencakup UC-01 sampai UC-26. UC-10 muncul lagi sebagai konteks Slot Locking pada view desain, bukan use case tambahan.
2. Pembayaran/Bank tidak dimodelkan sebagai integrasi sistem karena SRS secara eksplisit menyatakan verifikasi bank dilakukan Admin secara manual.
3. Vendor produksi eksternal tidak memiliki akses sistem; komunikasi, pengiriman bahan, dan serah SPK dilakukan Owner/Manager di luar sistem, sementara dispatch dicatat di OMS.
4. Activity/sequence menampilkan alur end-to-end pesanan custom. Detail jalur Fast Track tidak dijelaskan sebagai lifecycle terpisah dalam SRS, sehingga direpresentasikan sebagai reservasi stok yang kembali ke alur order/pembayaran.
5. Nama entitas mengacu daftar pada SRS §7.1. Atribut dan operasi pada class diagram adalah rancangan analisis awal/inferensi yang diperlukan agar model dapat dibaca; SRS belum menetapkan seluruh skema database dan operasi kelas secara rinci. Validasi lanjutan diperlukan saat desain teknis.
