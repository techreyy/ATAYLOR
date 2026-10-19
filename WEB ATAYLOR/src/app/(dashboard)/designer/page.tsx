"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Clock, CheckCircle2, MessageSquare, Play, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { designRepository } from "@/core/adapters/api/api-design.adapter";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { DesignBoardTicket, DesignTicketStatus } from "@/core/types/order.types";
import { useRole } from "@/components/shell/role-context";

const COLUMNS: { id: DesignTicketStatus; label: string }[] = [
  { id: "baru", label: "Baru" },
  { id: "dikerjakan", label: "Dikerjakan" },
  { id: "menunggu_acc", label: "Menunggu ACC" },
  { id: "revisi", label: "Revisi" },
  { id: "selesai", label: "Selesai" },
];

/** SLA hanya berjalan saat tiket ada di tangan Designer (sama dengan lonceng notifikasi). */
const SLA_RUNNING: DesignTicketStatus[] = ["baru", "dikerjakan", "revisi"];

function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}h ${hours}j`;
  return `${hours}j ${minutes % 60}m`;
}

function formatDateTime(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "";
}

export default function DesignerPage() {
  const { activeRole } = useRole();
  const isDesigner = activeRole === "designer";
  // SRS §2.3: Designer mengunggah mockup; Admin juga boleh (sama dengan detail pesanan). Peran lain memantau.
  const canUpload = isDesigner || activeRole === "admin";

  const [tickets, setTickets] = useState<DesignBoardTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [now, setNow] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    try {
      setTickets(await designRepository.getBoard());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hitung mundur SLA diperbarui tiap menit
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const act = async (ticket: DesignBoardTicket, run: () => Promise<string>) => {
    setBusyId(ticket.id);
    setNotice(null);
    try {
      const text = await run();
      setNotice({ tone: "success", text: `${ticket.orderCode}: ${text}` });
      await loadData();
    } catch (err) {
      setNotice({ tone: "error", text: `${ticket.orderCode}: ${errorMessage(err)}` });
    } finally {
      setBusyId(null);
    }
  };

  const startTicket = (ticket: DesignBoardTicket) =>
    act(ticket, async () => (await designRepository.startTicket(ticket.id)).message);

  const sendMockup = (ticket: DesignBoardTicket) =>
    act(ticket, async () => {
      const r = await orderRepository.sendDesignVersion(ticket.orderId, files[ticket.id]);
      setFiles((prev) => ({ ...prev, [ticket.id]: null }));
      return r.isPaidRevision ? `${r.message} Catatan: revisi ini melewati batas gratis (BR-17).` : r.message;
    });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {COLUMNS.map((c) => (
          <Skeleton key={c.id} className="h-96" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={loadData} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">CRM Designer & Tiket Mockup</h2>
            <Badge variant="emerald" className="whitespace-nowrap">Live · Database</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tiket dibuat otomatis saat pesanan masuk (BR-04). Ambil tiket, unggah mockup berversi; ACC & revisi dicatat Admin
            di detail pesanan (BR-06, BR-17).
            {!canUpload && " Peran Anda hanya dapat memantau."}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
        </Button>
      </div>

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {tickets.length === 0 ? (
        <EmptyState
          title="Belum ada tiket desain"
          description="Tiket desain muncul otomatis begitu Admin memasukkan pesanan baru."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const inColumn = tickets.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="flex flex-col bg-white/70 rounded-card border border-white p-2.5 md:min-h-[420px]">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 mb-2">
                  <h4 className="text-xs font-semibold text-zinc-800 leading-tight">{col.label}</h4>
                  <span className="text-[11px] font-mono tabular-nums px-1.5 rounded bg-white text-zinc-600 border border-zinc-200">
                    {inColumn.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {inColumn.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-zinc-400 italic">Kosong</div>
                  ) : (
                    inColumn.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        now={now}
                        busy={busyId === ticket.id}
                        disabled={busyId !== null}
                        canStart={isDesigner && ticket.status === "baru"}
                        canUpload={
                          canUpload &&
                          (["dikerjakan", "revisi", "menunggu_acc"].includes(ticket.status) ||
                            (ticket.status === "baru" && !isDesigner))
                        }
                        file={files[ticket.id] ?? null}
                        onFile={(f) => setFiles((prev) => ({ ...prev, [ticket.id]: f }))}
                        onStart={() => startTicket(ticket)}
                        onSend={() => sendMockup(ticket)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  now,
  busy,
  disabled,
  canStart,
  canUpload,
  file,
  onFile,
  onStart,
  onSend,
}: {
  ticket: DesignBoardTicket;
  now: number;
  busy: boolean;
  disabled: boolean;
  canStart: boolean;
  canUpload: boolean;
  file: File | null;
  onFile: (file: File | null) => void;
  onStart: () => void;
  onSend: () => void;
}) {
  const latest = ticket.versions[0];
  const slaMs = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() - now : null;
  const slaRunning = SLA_RUNNING.includes(ticket.status) && slaMs !== null;
  const late = slaRunning && slaMs! < 0;
  const nearDue = slaRunning && !late && slaMs! < 3 * 3600000;
  const freeLeft = ticket.freeRevisionLimit - ticket.revisionCount;
  const open = ticket.status !== "selesai";

  return (
    <Card className={`p-3 bg-white ${late ? "border-red-300" : "border-zinc-200"}`}>
      <div className="flex items-center justify-between mb-1">
        <Link href={`/orders/${ticket.orderId}`} className="font-mono font-bold text-xs text-zinc-900 tabular-nums hover:underline">
          {ticket.orderCode}
        </Link>
        {latest && <span className="text-[10px] font-mono tabular-nums text-zinc-400">v{latest.versionNo}</span>}
      </div>

      <h5 className="font-semibold text-xs text-zinc-900 line-clamp-1">{ticket.customerName}</h5>
      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
        {ticket.productName} · <span className="tabular-nums">{ticket.totalQty}</span> pcs
        {ticket.color ? ` · ${ticket.color}` : ""}
      </p>
      <p className="text-[11px] text-zinc-500 mt-0.5">
        Designer: {ticket.designerName ? <span className="text-zinc-800">{ticket.designerName}</span> : <em>belum diambil</em>}
      </p>

      {/* SLA desain (BR-04) */}
      {slaRunning && (
        <div
          className={`flex items-center justify-between mt-2 px-2 py-1 rounded-md border text-[11px] ${
            late
              ? "bg-dash-danger-soft border-dash-danger-line text-dash-danger-strong"
              : nearDue
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-zinc-50 border-zinc-200 text-zinc-700"
          }`}
        >
          <span className="flex items-center gap-1 font-medium">
            {late ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />} SLA
          </span>
          <span className="font-mono font-bold tabular-nums">
            {late ? `Terlambat ${formatDuration(slaMs!)}` : `Sisa ${formatDuration(slaMs!)}`}
          </span>
        </div>
      )}
      {ticket.status === "menunggu_acc" && latest && (
        <p className="mt-2 text-[11px] text-amber-800">Dikirim {formatDateTime(latest.sentAt)} · menunggu ACC pelanggan</p>
      )}
      {ticket.status === "selesai" && latest?.approval && (
        <p className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 shrink-0" /> ACC v{latest.versionNo} ·{" "}
          {latest.approval.channel === "wa_button" ? "tombol WA" : "manual Admin"} · {formatDateTime(latest.approval.approvedAt)}
        </p>
      )}

      {/* Kuota revisi gratis per produk (BR-17) */}
      <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-600">
        <span>Revisi gratis</span>
        <strong className="font-mono tabular-nums text-zinc-900">
          {Math.min(ticket.revisionCount, ticket.freeRevisionLimit)} / {ticket.freeRevisionLimit}
        </strong>
      </div>
      {open && freeLeft <= 0 && (
        <p className="mt-1">
          <Badge variant={freeLeft < 0 ? "red" : "amber"}>
            {freeLeft < 0 ? `${-freeLeft}x revisi berbayar` : "Revisi berikutnya berbayar"}
          </Badge>
        </p>
      )}

      {ticket.status === "revisi" && ticket.lastFeedback && (
        <div className="mt-2 p-2 rounded-md bg-dash-danger-soft border border-dash-danger-line text-[11px]">
          <span className="font-semibold text-dash-danger-strong flex items-center gap-1 mb-0.5">
            <MessageSquare className="w-3 h-3" /> Catatan revisi pelanggan
          </span>
          <p className="text-zinc-700 italic leading-snug">&ldquo;{ticket.lastFeedback}&rdquo;</p>
        </div>
      )}

      {latest?.mockupUrl && (
        <a
          href={latest.mockupUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Lihat mockup v{latest.versionNo}
        </a>
      )}

      {(canStart || canUpload) && (
        <div className="pt-2 mt-2 border-t border-zinc-100 space-y-2">
          {canStart && (
            <Button variant="primary" size="sm" className="w-full" disabled={disabled} onClick={onStart}>
              <Play className="w-3 h-3" /> {busy ? "Memproses…" : "Mulai Kerjakan"}
            </Button>
          )}
          {canUpload && (
            <>
              <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dash-line bg-white text-[11px] text-zinc-600 cursor-pointer hover:bg-zinc-50">
                <Upload className="w-3 h-3 shrink-0" />
                <span className="truncate">{file ? file.name : "Pilih file mockup"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button variant={file ? "primary" : "outline"} size="sm" className="w-full" disabled={disabled} onClick={onSend}>
                {busy ? "Mengirim…" : `Kirim Mockup v${(latest?.versionNo ?? 0) + 1}`}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
