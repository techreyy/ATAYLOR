"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, History, CheckCircle2, X, Camera, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { kanbanRepository } from "@/core/adapters/api/api-kanban.adapter";
import { KANBAN_STAGES, KanbanStageId, orderStatusMeta, stageLabel } from "@/lib/constants";
import { Order } from "@/core/types/order.types";
import { WipHistory } from "@/core/types/production.types";
import { useRole } from "@/components/shell/role-context";
import { formatRupiah } from "@/lib/currency";
import { localDate } from "@/lib/date";

const EMPTY: Record<KanbanStageId, Order[]> = {
  antrean: [],
  proses_jahit: [],
  proses_bordir_sablon: [],
  qc_pabrik: [],
  tiba_di_gudang: [],
};

type Pending = { order: Order; target: KanbanStageId; kind: "rework" | "qc" };

export default function KanbanPage() {
  const { activeRole } = useRole();
  const canMove = activeRole === "admin"; // SRS §2.3: Admin memperbarui Kanban (BR-13)
  const [stageOrders, setStageOrders] = useState<Record<KanbanStageId, Order[]>>(EMPTY);
  const [histories, setHistories] = useState<WipHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [qcPhoto, setQcPhoto] = useState<File | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [data, hists] = await Promise.all([kanbanRepository.getOrdersByStage(), kanbanRepository.getWipHistories()]);
      setStageOrders({ ...EMPTY, ...data });
      setHistories(hists);
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

  const move = async (order: Order, target: KanbanStageId, extra: { reasonNote?: string; qcPhoto?: File | null } = {}) => {
    setBusy(true);
    setNotice(null);
    try {
      await kanbanRepository.moveStage({ orderId: order.id, targetStage: target, ...extra });
      setNotice({ tone: "success", text: `${order.orderCode} dipindah ke ${stageLabel(target)}.` });
      setPending(null);
      setReason("");
      setQcPhoto(null);
      await loadData();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleAdvance = (order: Order, idx: number) => {
    const next = KANBAN_STAGES[idx + 1].id;
    if (next === "tiba_di_gudang") {
      setPending({ order, target: next, kind: "qc" });
      return;
    }
    move(order, next);
  };

  const today = localDate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {KANBAN_STAGES.map((s) => (
          <Skeleton key={s.id} className="h-96" />
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
            <h2 className="text-xl font-bold text-dash-text tracking-tight">Kanban WIP Produksi</h2>
            <Badge variant="emerald">Live · Database</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            5 tahap resmi (BR-12): maju 1 tahap; rework wajib alasan; tiba di gudang wajib foto QC (BR-24).
            {!canMove && " Peran Anda hanya dapat memantau."}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(true)}>
          <History className="w-3.5 h-3.5" /> Riwayat WIP ({histories.length})
        </Button>
      </div>

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {/* 5 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {KANBAN_STAGES.map((stage, idx) => {
          const ordersInStage = stageOrders[stage.id] || [];
          return (
            <div key={stage.id} className="flex flex-col bg-white/70 rounded-card border border-white p-2.5 min-h-[420px]">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-dash-primary text-dash-ink text-[10px] flex items-center justify-center font-mono font-bold tabular-nums">
                    {stage.step}
                  </span>
                  <h4 className="text-xs font-semibold text-zinc-800 leading-tight">{stage.label}</h4>
                </div>
                <span className="text-[11px] font-mono tabular-nums px-1.5 rounded bg-white text-zinc-600 border border-zinc-200">
                  {ordersInStage.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {ordersInStage.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-zinc-400 italic">Kosong</div>
                ) : (
                  ordersInStage.map((order) => {
                    const late = order.dueDate < today && stage.id !== "tiba_di_gudang";
                    const meta = orderStatusMeta(order.status);
                    return (
                      <Card key={order.id} className={`p-3 bg-white ${late ? "border-red-300" : "border-zinc-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <Link href={`/orders/${order.id}`} className="font-mono font-bold text-xs text-zinc-900 tabular-nums hover:underline">
                            {order.orderCode}
                          </Link>
                          <span className={`text-[10px] font-mono tabular-nums ${late ? "text-red-700 font-semibold" : "text-zinc-400"}`}>
                            {order.dueDate}
                          </span>
                        </div>

                        <h5 className="font-semibold text-xs text-zinc-900 line-clamp-1">{order.customerName}</h5>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {order.items[0]?.productName} ({order.items[0]?.qty} pcs)
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {late && (
                            <Badge variant="red">
                              <AlertTriangle className="w-3 h-3 mr-0.5" /> Terlambat
                            </Badge>
                          )}
                          {stage.id === "tiba_di_gudang" && <Badge variant={meta.variant}>{meta.label}</Badge>}
                          {stage.id === "tiba_di_gudang" && order.remainingBalance > 0 && (
                            <span className="text-[10px] text-amber-700 font-mono">Sisa {formatRupiah(order.remainingBalance)}</span>
                          )}
                        </div>

                        {canMove && (
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100">
                            {idx > 0 && (
                              <button
                                onClick={() => setPending({ order, target: KANBAN_STAGES[idx - 1].id, kind: "rework" })}
                                disabled={busy}
                                className="text-[10px] text-red-700 hover:text-red-900 font-medium flex items-center gap-0.5 disabled:opacity-50"
                                title="Rework mundur tahap (wajib alasan — BR-12)"
                              >
                                <RotateCcw className="w-3 h-3" /> Rework
                              </button>
                            )}

                            {idx < KANBAN_STAGES.length - 1 ? (
                              <button
                                onClick={() => handleAdvance(order, idx)}
                                disabled={busy}
                                className="ml-auto text-[10px] bg-dash-primary text-dash-ink hover:bg-dash-primary-hover font-medium px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                Maju <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="ml-auto text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> QC Selesai
                              </span>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Rework (BR-12) / Foto QC (BR-24) */}
      {pending && (
        <div className="fixed inset-0 z-50 bg-[#111]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-card shadow-card-hover animate-scale-in max-w-md w-full p-5 border border-zinc-200">
            {pending.kind === "rework" ? (
              <>
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <RotateCcw className="w-4 h-4" />
                  <h3 className="font-bold text-sm text-zinc-900">Konfirmasi Rework (Mundur Tahap)</h3>
                </div>
                <p className="text-xs text-zinc-600 mb-3">
                  Memundurkan <strong>{pending.order.orderCode}</strong> ke <strong>{stageLabel(pending.target)}</strong> wajib
                  disertai alasan tertulis (BR-12). Alasan tersimpan di riwayat WIP & audit log.
                </p>
                <textarea
                  rows={3}
                  placeholder="Contoh: benang bordir meleset, ukuran kerah sempit"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400 mb-3"
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-zinc-800 mb-2">
                  <Camera className="w-4 h-4" />
                  <h3 className="font-bold text-sm text-zinc-900">Unggah Foto Hasil QC (BR-24)</h3>
                </div>
                <p className="text-xs text-zinc-600 mb-3">
                  <strong>{pending.order.orderCode}</strong> akan dinyatakan tiba di gudang toko. Foto fisik hasil QC wajib
                  dilampirkan sebelum notifikasi selesai & tagihan pelunasan dikirim ke pelanggan.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQcPhoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs mb-3 file:mr-2 file:px-2.5 file:py-1 file:rounded-md file:border file:border-zinc-200 file:bg-white file:text-xs"
                />
              </>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending(null)}>
                Batal
              </Button>
              {pending.kind === "rework" ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => move(pending.order, pending.target, { reasonNote: reason.trim() })}
                >
                  Simpan & Rework
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy || !qcPhoto}
                  onClick={() => move(pending.order, pending.target, { qcPhoto })}
                >
                  Simpan & Tiba di Gudang
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Riwayat WIP */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-[#111]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-card shadow-card-hover animate-scale-in max-w-2xl w-full p-5 border border-zinc-200">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2.5">
              <h3 className="font-bold text-xs text-zinc-900 flex items-center gap-2 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-zinc-500" /> Riwayat Perpindahan WIP (wip_histories)
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-400 hover:text-zinc-600 p-1" aria-label="Tutup">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 text-xs">
              {histories.map((h) => (
                <div key={h.id} className="py-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400 tabular-nums">
                    <span className="font-bold text-zinc-700">{h.orderCode}</span>
                    <span>{new Date(h.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="text-zinc-800 font-medium mt-0.5 flex items-center gap-1.5">
                    <span className="text-zinc-500">{h.fromStage ? stageLabel(h.fromStage) : "SPK Terbit"}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                    <strong className="text-zinc-900">{stageLabel(h.toStage)}</strong>
                  </p>
                  {h.reasonNote && (
                    <p className="text-red-700 bg-red-50 p-1.5 rounded mt-1 text-[11px] border border-red-100">
                      Alasan Rework: {h.reasonNote}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">Aktor: {h.actorName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
