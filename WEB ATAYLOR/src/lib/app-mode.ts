/**
 * Sakelar tunggal tampilan: `NEXT_PUBLIC_DEMO_MODE=true` (mode demo) menampilkan masuk cepat akun demo,
 * menu "Masuk sebagai", dan label `MOCK`. Selain "true" = mode fiks: fitur demo disembunyikan dan modul
 * yang belum tersambung data asli diberi label "Tahap berikutnya". Nilai ditanam saat build — ubah lewat
 * MODE-FIKS.bat / MODE-DEMO.bat, lalu build ulang (JALANKAN-DEMO.bat melakukannya otomatis).
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
