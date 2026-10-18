/** Zona waktu operasional toko (Kendari = WITA, UTC+8), sama dengan APP_TIMEZONE backend. */
export const APP_TIMEZONE = "Asia/Makassar";

/**
 * Tanggal `YYYY-MM-DD` menurut WITA, digeser `offsetDays` hari.
 * Jangan pakai `toISOString().slice(0, 10)` — itu tanggal UTC dan mundur sehari sebelum pukul 08.00 WITA.
 */
export function localDate(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (!offsetDays) return today;

  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
