"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Printer, Award, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { executiveRepository } from "@/core/adapters/api/api-spk.adapter";
import { ExecutiveSummary } from "@/core/types/production.types";
import { KANBAN_STAGES, orderStatusMeta, stageLabel } from "@/lib/constants";
import { formatRupiah } from "@/lib/currency";
import { localDate } from "@/lib/date";

const isoDate = (offset = 0) => localDate(offset);

const PRESETS = [
  { id: "7", label: "7 Hari", days: 6 },
  { id: "30", label: "30 Hari", days: 29 },
  { id: "90", label: "90 Hari", days: 89 },
];

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export default function ExecutiveDashboardPage() {
  const [from, setFrom] = useState(isoDate(-29));
  const [to, setTo] = useState(isoDate());
  const [data, setData] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await executiveRepository.getSummary({ from, to }));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportCsv = async () => {
    setDownloading(true);
    setNotice(null);
    try {
      await executiveRepository.downloadCsv({ from, to });
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={load} />;

  const kpi = data?.kpi;
  const online = data?.channels.find((c) => c.channel === "online");
  const offline = data?.channels.find((c) => c.channel === "offline");
  const channelRevenue = (online?.revenue ?? 0) + (offline?.revenue ?? 0);
  const maxDaily = Math.max(1, ...(data?.dailyRevenue.map((d) => d.revenue) ?? [1]));
  const maxWip = Math.max(1, ...Object.values(data?.wipStages ?? { x: 1 }));

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">Executive Dashboard & Rekap</h2>
            <Badge variant="emerald">Live · Database</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
            Periode {from} s.d. {to}
            {data && <> · data per {new Date(data.generatedAt).toLocaleString("id-ID")}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex rounded-lg border border-dash-line p-0.5 bg-zinc-50">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setFrom(isoDate(-p.days));
                  setTo(isoDate());
                }}
                className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-all duration-200 ${
                  from === isoDate(-p.days) && to === isoDate() ? "bg-dash-primary text-dash-ink shadow-primary" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1 text-xs rounded-lg border border-dash-line font-mono" aria-label="Dari tanggal" />
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="px-2 py-1 text-xs rounded-lg border border-dash-line font-mono" aria-label="Sampai tanggal" />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Cetak / PDF
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportCsv} disabled={downloading}>
            <Download className="w-3.5 h-3.5" /> {downloading ? "Mengunduh..." : "Unduh CSV"}
          </Button>
        </div>
      </div>

      {notice && <Notice tone="error" onClose={() => setNotice(null)}>{notice}</Notice>}

      {/* KPI */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${loading ? "opacity-60" : ""}`}>
        {!kpi ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Kpi title="Omzet Terkonfirmasi" value={formatRupiah(kpi.revenue)} note={`${kpi.confirmedOrders} pesanan dengan DP valid`} />
            <Kpi title="Kas Masuk (Pembayaran Valid)" value={formatRupiah(kpi.cashIn)} note={`Piutang: ${formatRupiah(kpi.outstanding)}`} tone="emerald" />
            <Kpi
              tone="blue"
              title="Total Order & Kanal"
              value={`${kpi.totalOrders} Order`}
              note={`Offline ${offline?.orders ?? 0} · Online ${online?.orders ?? 0}`}
            />
            <Kpi
              title="Bottleneck Produksi"
              value={data?.bottleneckStage ? stageLabel(data.bottleneckStage) : "Tidak ada WIP"}
              note={data?.bottleneckStage ? `${data.wipStages[data.bottleneckStage]} pesanan menumpuk` : "Semua tahap kosong"}
              tone="amber"
            />
          </>
        )}
      </div>

      {/* Tren harian */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Tren Omzet Harian (berdasarkan tanggal pesanan)</CardTitle>
          <span className="text-[11px] text-zinc-400 font-mono">Pure CSS bars</span>
        </CardHeader>
        <CardContent className="p-4">
          {!data || data.dailyRevenue.length === 0 ? (
            <EmptyState title="Belum ada omzet terkonfirmasi" description="Tidak ada pesanan dengan DP valid pada periode ini." />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1.5 h-40 pt-4 border-b border-zinc-200 min-w-full" style={{ minWidth: data.dailyRevenue.length * 36 }}>
                {data.dailyRevenue.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title={`${d.date}: ${formatRupiah(d.revenue)} (${d.orders} order)`}>
                    <span className="text-[10px] font-mono text-zinc-500 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                      {(d.revenue / 1_000_000).toFixed(1)}jt
                    </span>
                    <div className="w-full max-w-[40px] bg-dash-primary hover:bg-dash-primary-hover rounded-t-md origin-bottom animate-grow-up transition-all duration-150" style={{ height: `${Math.max(4, pct(d.revenue, maxDaily))}%` }} />
                    <span className="text-[10px] text-zinc-500 font-mono tabular-nums">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kanal */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold">Kanal: Online vs Offline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {[
              { label: "Offline (Toko & Closer)", c: offline, color: "bg-dash-primary" },
              { label: "Online (WhatsApp)", c: online, color: "bg-dash-sky" },
            ].map(({ label, c, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-800">{label}</span>
                  <span className="font-mono font-bold tabular-nums">{formatRupiah(c?.revenue ?? 0)}</span>
                </div>
                <div className="w-full bg-[#EEF0F7] rounded-full h-2 overflow-hidden">
                  <div className={`${color} h-2 rounded-full origin-left animate-grow-right`} style={{ width: `${pct(c?.revenue ?? 0, channelRevenue)}%` }} />
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                  {c?.orders ?? 0} order · {pct(c?.revenue ?? 0, channelRevenue)}% omzet
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* WIP per tahap */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold">Beban WIP per Tahap (saat ini)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {KANBAN_STAGES.map((s) => {
              const n = data?.wipStages[s.id] ?? 0;
              return (
                <div key={s.id} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className={data?.bottleneckStage === s.id ? "font-semibold text-amber-700" : "text-zinc-700"}>{s.label}</span>
                    <span className="font-mono tabular-nums">{n}</span>
                  </div>
                  <div className="w-full bg-[#EEF0F7] rounded-full h-1.5 overflow-hidden">
                    <div className={`${data?.bottleneckStage === s.id ? "bg-dash-light-danger" : "bg-dash-primary"} h-1.5 rounded-full origin-left animate-grow-right`} style={{ width: `${pct(n, maxWip)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Distribusi status */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold">Distribusi Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-1.5 text-xs">
              {Object.entries(data?.statusDistribution ?? {}).map(([status, n]) => {
                const meta = orderStatusMeta(status);
                return (
                  <li key={status} className="flex items-center justify-between">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="font-mono tabular-nums font-semibold">{n}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-zinc-700" /> Leaderboard Marketing Closer
            </CardTitle>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              Omzet live · komisi <DemoMockBadge />
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {(data?.closerLeaderboard.length ?? 0) === 0 ? (
              <div className="p-6">
                <EmptyState title="Belum ada closing offline" description="Leaderboard muncul setelah ada pesanan offline dengan DP valid." />
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dash-line text-zinc-500 text-[11px] uppercase font-semibold tracking-wider">
                    <th className="py-2 px-3">Nama Closer</th>
                    <th className="py-2 px-3 text-right">Order Closing</th>
                    <th className="py-2 px-3 text-right">Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data!.closerLeaderboard.map((closer, i) => (
                    <tr key={closer.closerId}>
                      <td className="py-2.5 px-3 font-semibold text-zinc-800">
                        <span className="inline-flex w-4 h-4 mr-2 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] items-center justify-center font-bold font-mono tabular-nums">
                          {i + 1}
                        </span>
                        {closer.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-right">{closer.orders}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 tabular-nums">{formatRupiah(closer.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Definisi metrik (Checklist: tampilkan definisi & waktu data) */}
        <Card className="bg-zinc-50/70">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-600" /> Definisi Metrik
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-[11px] text-zinc-600 space-y-1.5 leading-relaxed">
            {Object.entries(data?.definitions ?? {}).map(([k, v]) => (
              <p key={k}>• {v}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Kartu KPI berwarna khas Skydash
function Kpi({ title, value, note, tone }: { title: string; value: string; note: string; tone?: "emerald" | "amber" | "blue" }) {
  const color =
    tone === "emerald" ? "bg-dash-charcoal" : tone === "amber" ? "bg-dash-light-danger" : tone === "blue" ? "bg-dash-tale" : "bg-dash-primary";
  const onGold = color === "bg-dash-primary";
  return (
    <div
      className={`${color} relative overflow-hidden rounded-card p-5 ${onGold ? "text-dash-ink" : "text-white"} transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover`}
    >
      <span className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
      <p className="relative text-[13px] font-semibold opacity-90">{title}</p>
      <h3 className="relative text-2xl font-bold mt-2 tabular-nums">{value}</h3>
      <p className="relative text-xs opacity-80 mt-1 tabular-nums">{note}</p>
    </div>
  );
}
