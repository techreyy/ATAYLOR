"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Brain, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { catalogRepository } from "@/core/adapters/api/api-catalog.adapter";
import type { OrderInsights } from "@/core/repositories/catalog.repository";
import { sleeveLabel } from "@/lib/constants";

type Days = 30 | 90 | 365;
const PERIODS: { value: `${Days}`; label: string }[] = [
  { value: "30", label: "30 Hari" },
  { value: "90", label: "90 Hari" },
  { value: "365", label: "1 Tahun" },
];

/**
 * Pola dari SEMUA pesanan (online & input manual) yang nanti dipakai chatbot sebagai konteks.
 * Hanya angka agregat — tanpa nama/nomor pelanggan.
 */
export function OrderInsightsPanel() {
  const [days, setDays] = useState<Days>(90);
  const [data, setData] = useState<OrderInsights | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    setError(null);
    catalogRepository.getOrderInsights(days).then(setData).catch(setError);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const maxSizePcs = Math.max(1, ...(data?.sizes.map((x) => x.pcs) ?? [1]));
  const sleeveTotal = data?.sleeves.reduce((sum, x) => sum + x.pcs, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="px-5 pt-4 pb-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-zinc-600" /> Yang Dipelajari AI dari Pesanan
          </CardTitle>
          <Badge variant="emerald">Live · Database</Badge>
        </div>
        <SegmentedControl ariaLabel="Periode data" value={`${days}` as `${Days}`} onChange={(v) => setDays(Number(v) as Days)} options={PERIODS} />
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        <p className="text-dash-muted">
          Dihitung dari semua pesanan — termasuk yang diinput manual di toko — karena semua masuk satu antrean (BR-01). Hanya angka ringkasan, tanpa
          nama atau nomor pelanggan. Harga & jadwal yang dijanjikan chatbot tetap diambil dari katalog dan kapasitas, bukan dari sini.
        </p>

        {error ? (
          <ErrorState error={error} onRetry={load} />
        ) : !data || !s ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Stat label="Pesanan" value={s.orders} />
              <Stat label="Input manual (toko)" value={s.offline} note={s.orders ? `${Math.round((s.offline / s.orders) * 100)}%` : undefined} />
              <Stat label="Online (WhatsApp)" value={s.online} />
              <Stat label="Total pcs" value={s.pcs} note={`± ${s.avgPcsPerOrder} pcs / pesanan`} />
              <Stat label="Pelanggan berulang" value={s.repeatCustomers} />
            </div>

            {/* Ringkasan yang akan menjadi konteks chatbot */}
            <div className="rounded-lg bg-dash-primary-soft/60 border border-dash-primary/30 p-3">
              <p className="font-semibold text-dash-text flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-dash-primary-strong" /> Ringkasan untuk chatbot
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-dash-text tabular-nums">
                {data.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Produk */}
              <div className="lg:col-span-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-dash-line text-zinc-500 uppercase text-[10px] font-semibold">
                      <th className="py-2 pr-3">Produk</th>
                      <th className="py-2 px-2 text-right">Pesanan</th>
                      <th className="py-2 px-2 text-right">Pcs</th>
                      <th className="py-2 px-2 text-right">Rata-rata</th>
                      <th className="py-2 pl-2 text-right">Lama produksi nyata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-dash-muted">Belum ada pesanan pada periode ini.</td>
                      </tr>
                    ) : (
                      data.products.map((p) => (
                        <tr key={p.productId}>
                          <td className="py-2 pr-3 font-semibold text-zinc-900">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums">{p.orders}</td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums">{p.pcs}</td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums">{p.avgPcsPerOrder} pcs</td>
                          <td className="py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                            {p.actualDurationDays === null ? (
                              <span className="text-dash-muted">belum ada data</span>
                            ) : (
                              <span className={p.actualDurationDays > p.stdDurationDays ? "text-dash-danger-strong" : "text-zinc-900"}>
                                {p.actualDurationDays} hari
                              </span>
                            )}
                            <span className="text-dash-muted"> / std {p.stdDurationDays}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ukuran & lengan */}
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-dash-text mb-1.5">Sebaran ukuran (pcs)</p>
                  <div className="space-y-1">
                    {data.sizes.map((x) => (
                      <div key={x.size} className="flex items-center gap-2">
                        <span className="w-9 font-mono text-dash-muted">{x.size}</span>
                        <div className="flex-1 h-2 rounded-full bg-dash-bg overflow-hidden">
                          <div className="h-full rounded-full bg-dash-primary animate-grow-right origin-left" style={{ width: `${(x.pcs / maxSizePcs) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right font-mono tabular-nums">{x.pcs}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-dash-text mb-1.5">Jenis lengan</p>
                  {data.sleeves.map((x) => (
                    <div key={x.sleeveType} className="flex items-center justify-between py-0.5">
                      <span className="text-dash-muted">{sleeveLabel(x.sleeveType)}</span>
                      <span className="font-mono tabular-nums">
                        {x.pcs} pcs{sleeveTotal ? ` · ${Math.round((x.pcs / sleeveTotal) * 100)}%` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-lg border border-dash-line p-2.5">
      <p className="text-[11px] text-dash-muted">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums text-dash-text">{value}</p>
      {note && <p className="text-[10px] text-dash-muted tabular-nums">{note}</p>}
    </div>
  );
}
