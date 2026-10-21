import React from "react";
import { formatRupiah, formatRupiahShort } from "@/lib/currency";

export interface DailyRevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

/** Semua tanggal `from`..`to` (YYYY-MM-DD); tanggal tanpa pesanan bernilai 0 agar tren tidak menyesatkan. */
function fillDays(from: string, to: string, points: DailyRevenuePoint[]): DailyRevenuePoint[] {
  const byDate = new Map(points.map((p) => [p.date, p]));
  const days: DailyRevenuePoint[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && days.length < 400) {
    const key = d.toISOString().slice(0, 10);
    days.push(byDate.get(key) ?? { date: key, revenue: 0, orders: 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** Batas atas sumbu Y yang dibulatkan (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", { timeZone: "UTC", ...opts });

/**
 * Grafik batang omzet harian (CSS murni). Sorot / fokus batang untuk melihat tanggal, nominal, dan jumlah order.
 */
export function DailyRevenueChart({ from, to, points }: { from: string; to: string; points: DailyRevenuePoint[] }) {
  const days = fillDays(from, to, points);
  const total = days.reduce((sum, d) => sum + d.revenue, 0);
  const activeDays = days.filter((d) => d.revenue > 0);
  const best = activeDays.reduce<DailyRevenuePoint | null>((top, d) => (!top || d.revenue > top.revenue ? d : top), null);
  const max = niceMax(best?.revenue ?? 0);
  // Label tanggal maksimal ±10 agar tidak bertumpuk (7 hari: semua, 30 hari: tiap 3, 90 hari: tiap 9)
  const labelEvery = Math.max(1, Math.ceil(days.length / 10));
  const dense = days.length > 45;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-dash-muted tabular-nums">
        <span>
          Total periode: <strong className="text-dash-text">{formatRupiah(total)}</strong>
        </span>
        <span>
          Rata-rata/hari: <strong className="text-dash-text">{formatRupiah(Math.round(total / Math.max(1, days.length)))}</strong>
        </span>
        <span>
          Hari dengan pesanan: <strong className="text-dash-text">{activeDays.length}</strong> dari {days.length}
        </span>
        {best && (
          <span>
            Tertinggi: <strong className="text-dash-text">{dayLabel(best.date, { day: "numeric", month: "short" })}</strong> ({formatRupiahShort(best.revenue)})
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {/* Sumbu Y */}
        <div className="relative w-12 shrink-0 h-44 text-[10px] text-dash-muted tabular-nums text-right">
          <span className="absolute right-0 top-0 -translate-y-1/2">{formatRupiahShort(max)}</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">{formatRupiahShort(max / 2)}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>

        <div className="flex-1 overflow-x-auto pt-1">
          <div style={{ minWidth: days.length * (dense ? 8 : 14) }}>
            <div className="relative h-44">
              {/* Garis bantu */}
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-dash-line" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-dash-line" />
              <div className={`absolute inset-0 flex items-end border-b border-zinc-200 ${dense ? "gap-px" : "gap-1"}`}>
                {days.map((d, i) => {
                  const height = d.revenue > 0 ? Math.max(2, (d.revenue / max) * 100) : 0;
                  // Tooltip di dalam area grafik (wadah overflow-x memotong yang keluar); rata tepi untuk batang di ujung
                  const edge = i < 3 ? "left-0" : i >= days.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <div
                      key={d.date}
                      tabIndex={0}
                      aria-label={`${dayLabel(d.date, { weekday: "long", day: "numeric", month: "long" })}: ${formatRupiah(d.revenue)}, ${d.orders} order`}
                      className="relative flex-1 h-full flex items-end justify-center group outline-none"
                    >
                      {d.revenue > 0 ? (
                        <div
                          className="w-full max-w-[40px] bg-dash-primary rounded-t-md origin-bottom animate-grow-up transition-colors duration-150 group-hover:bg-dash-primary-hover group-focus:bg-dash-primary-hover"
                          style={{ height: `${height}%` }}
                        />
                      ) : (
                        <div className="w-full max-w-[40px] h-[2px] rounded-full bg-zinc-200" />
                      )}
                      {/* Tooltip */}
                      <div className={`pointer-events-none absolute top-0 ${edge} z-10 hidden group-hover:block group-focus:block whitespace-nowrap rounded-lg bg-dash-charcoal px-2.5 py-1.5 text-[11px] text-white shadow-card-hover tabular-nums`}>
                        <p className="font-semibold">{dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                        <p>{formatRupiah(d.revenue)}</p>
                        <p className="text-white/70">{d.orders} order</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Label tanggal */}
            <div className={`flex mt-1 ${dense ? "gap-px" : "gap-1"}`}>
              {days.map((d, i) => {
                const show = i % labelEvery === 0 || i === days.length - 1;
                const pos = i === 0 ? "left-0" : i === days.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <span key={d.date} className="relative flex-1 h-4">
                    {show && (
                      <span className={`absolute top-0 ${pos} text-[10px] text-dash-muted tabular-nums whitespace-nowrap`}>
                        {dayLabel(d.date, { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
