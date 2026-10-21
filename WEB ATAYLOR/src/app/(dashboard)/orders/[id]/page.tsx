"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Printer,
  CheckCircle2,
  XCircle,
  Lock,
  Palette,
  CreditCard,
  FileText,
  History,
  Upload,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { paymentRepository } from "@/core/adapters/api/api-payment.adapter";
import { spkRepository } from "@/core/adapters/api/api-spk.adapter";
import { Order, SpkGate } from "@/core/types/order.types";
import { PaymentMethod } from "@/core/types/payment.types";
import { orderStatusMeta, stageLabel } from "@/lib/constants";
import { formatRupiah } from "@/lib/currency";
import { groupBySleeve, sizeColumns } from "@/lib/order-items";
import { useRole } from "@/components/shell/role-context";

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const inputCls =
  "w-full px-2.5 py-1.5 text-xs rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white";

export default function OrderDetailPage() {
  const params = useParams();
  const { activeRole } = useRole();
  // Owner mengakses semua fitur, termasuk aksi Admin
  const isAdmin = activeRole === "admin" || activeRole === "owner";
  const [order, setOrder] = useState<Order | null>(null);
  const [gate, setGate] = useState<SpkGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("transfer");
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState("");
  const [payProof, setPayProof] = useState<File | null>(null);
  const [manualOnlinePay, setManualOnlinePay] = useState(false);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const countdown = useCountdown(order?.slotLockStatus === "temp_24h" ? order.slotLockExpiresAt : null);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const res = await orderRepository.getOrderById(params.id as string);
      setOrder(res.order);
      setGate(res.spkGate);
      setLoadError(null);
      const pending = (res.order.payments ?? []).filter((p) => p.status === "pending").reduce((a, p) => a + p.amount, 0);
      const dpShortfall = res.order.dpRequired - res.order.paidAmount - pending;
      setPayAmount(Math.max(0, dpShortfall > 0 ? dpShortfall : res.order.remainingBalance - pending));
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    setNotice(null);
    try {
      const msg = await fn();
      setNotice({ tone: "success", text: msg });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 max-w-5xl mx-auto">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-3">
        <ErrorState error={loadError ?? new Error("Pesanan tidak ditemukan.")} onRetry={load} />
        <div className="text-center">
          <Link href="/orders">
            <Button variant="outline">Kembali ke Daftar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const meta = orderStatusMeta(order.status);
  const ticket = order.designTicket;
  const versions = ticket?.versions ?? [];
  const latest = versions[0];
  const payments = order.payments ?? [];
  const canSendVersion = (isAdmin || activeRole === "designer") && ["brief_lengkap", "desain_dikerjakan", "revisi", "menunggu_acc", "kedaluwarsa"].includes(order.status) && !latest?.approval;
  const awaitingAcc = order.status === "menunggu_acc" && latest && !latest.approval;
  const canRecordPayment = isAdmin && !["selesai", "dibatalkan"].includes(order.status) && order.remainingBalance > 0;
  const gateOk = gate ? gate.payment_valid && gate.slot_permanent && gate.design_approved && gate.not_issued : false;
  const sleeveGroups = groupBySleeve(order.items);
  const sizes = sizeColumns(order.items);
  const totalQty = sleeveGroups.reduce((sum, g) => sum + g.totalQty, 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold font-mono text-zinc-900 tabular-nums">{order.orderCode}</h2>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {order.wipStage && <Badge variant="zinc">Tahap: {stageLabel(order.wipStage)}</Badge>}
          </div>
          <p className="text-[11px] text-zinc-400 font-mono tabular-nums mt-0.5">
            Dibuat {new Date(order.createdAt).toLocaleString("id-ID")} · Tenggat {order.dueDate}
          </p>
        </div>
        {order.spk && (
          <Link href={`/production/spk/${order.spk.id}/print`} target="_blank">
            <Button variant="outline" size="md">
              <Printer className="w-3.5 h-3.5" /> Cetak {order.spk.spkNumber}
            </Button>
          </Link>
        )}
      </div>

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle>Informasi Pemesan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs p-4">
            <Row label={<><User className="w-3.5 h-3.5 text-zinc-400" /> Nama Pelanggan:</>} value={order.customerName} />
            <Row label={<><Phone className="w-3.5 h-3.5 text-zinc-400" /> Kontak WhatsApp:</>} value={<span className="font-mono tabular-nums">{order.customerWa}</span>} />
            <Row label="Kanal Pemesanan:" value={<span className="uppercase">{order.channel}</span>} />
            <Row label="Marketing Closer (BR-02):" value={order.marketingCloserName || "Kanal Online (Tanpa Closer)"} last />
            {order.notes && <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">Catatan: {order.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle>Status Keuangan & Kuota Produksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs p-4">
            <Row label="Total Tagihan:" value={<span className="font-mono tabular-nums">{formatRupiah(order.totalAmount)}</span>} />
            <Row label={<span className="text-amber-700">DP Minimum (BR-10):</span>} value={<span className="font-mono tabular-nums text-amber-700">{formatRupiah(order.dpRequired)}</span>} />
            <Row label={<span className="text-emerald-700">Pembayaran Tervalidasi:</span>} value={<span className="font-mono tabular-nums text-emerald-700">{formatRupiah(order.paidAmount)}</span>} />
            <Row label="Sisa Tagihan:" value={<span className="font-mono tabular-nums">{formatRupiah(order.remainingBalance)}</span>} />
            <Row
              label="Slot Locking (BR-07/08):"
              last
              value={
                order.slotLockStatus === "permanent" ? (
                  <Badge variant="emerald">Terkunci Permanen</Badge>
                ) : order.slotLockStatus === "temp_24h" ? (
                  <Badge variant="amber">Lock 24 Jam · sisa <span className="font-mono ml-1">{countdown}</span></Badge>
                ) : order.slotLockStatus === "expired" ? (
                  <Badge variant="red">Kedaluwarsa (kuota dilepas)</Badge>
                ) : (
                  <Badge variant="slate">Belum Terkunci (menunggu ACC)</Badge>
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Item Table */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle>Rincian Item Pesanan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-5 pb-2 text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Produk: <strong className="text-zinc-900">{unique(order.items.map((i) => i.productName ?? "-"))}</strong>
            </span>
            <span>
              Warna: <strong className="text-zinc-900">{unique(order.items.map((i) => i.color))}</strong>
            </span>
            <span>
              Harga Satuan: <strong className="font-mono tabular-nums text-zinc-900">{unique(order.items.map((i) => formatRupiah(i.unitPrice)))}</strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-dash-line text-zinc-500 text-[11px] uppercase font-semibold tracking-wider">
                  <th className="py-2 px-3">Jenis Lengan</th>
                  {sizes.map((s) => (
                    <th key={s} className="py-2 px-2 text-center font-mono">{s}</th>
                  ))}
                  <th className="py-2 px-3 text-right">Jumlah</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sleeveGroups.map((g) => (
                  <tr key={g.sleeveType}>
                    <td className="py-2.5 px-3 font-semibold text-zinc-900 whitespace-nowrap">{g.label}</td>
                    {g.sizes.map((s) => (
                      <td key={s.size} className={`py-2.5 px-2 text-center font-mono tabular-nums ${s.qty ? "text-zinc-900 font-semibold" : "text-zinc-300"}`}>
                        {s.qty}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">→ {g.totalQty} pcs</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">{formatRupiah(g.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-dash-line font-bold text-zinc-900">
                  <td colSpan={sizes.length + 1} className="py-2.5 px-3 text-right">Total Qty</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">{totalQty} pcs</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">{formatRupiah(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Desain & ACC */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-zinc-600" /> Langkah 1 · Desain & ACC (BR-04, BR-06, BR-17)
          </CardTitle>
          {ticket && (
            <span className="text-[11px] text-zinc-500">
              Tiket: <strong>{ticket.status}</strong> · Revisi {ticket.revisionCount}x
            </span>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          {versions.length === 0 ? (
            <p className="text-zinc-500">Belum ada mockup dikirim. Tiket desain dibuat otomatis saat pesanan masuk.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md">
              {versions.map((v) => (
                <li key={v.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">v{v.versionNo}</span>
                    {v.isPaidRevision && <Badge variant="red">Revisi Berbayar</Badge>}
                    {v.mockupUrl && (
                      <a href={v.mockupUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                        Lihat mockup
                      </a>
                    )}
                    <span className="text-zinc-400 font-mono text-[11px]">
                      {v.sentAt ? new Date(v.sentAt).toLocaleString("id-ID") : ""}
                    </span>
                  </div>
                  {v.approval ? (
                    <Badge variant="emerald">
                      ACC {v.approval.channel === "wa_button" ? "via tombol WA" : "manual Admin"} ·{" "}
                      {new Date(v.approval.approvedAt).toLocaleString("id-ID")}
                    </Badge>
                  ) : v.id === latest?.id && order.status === "revisi" ? (
                    <Badge variant="red">Revisi diminta</Badge>
                  ) : v.id === latest?.id ? (
                    <Badge variant="amber">Menunggu ACC</Badge>
                  ) : (
                    <Badge variant="slate">Digantikan versi baru</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          {ticket?.lastFeedback && order.status === "revisi" && (
            <p className="text-red-700 bg-red-50 border border-red-100 rounded p-2">Masukan pelanggan: {ticket.lastFeedback}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {canSendVersion && (
              <>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dash-line bg-white text-zinc-600 cursor-pointer hover:bg-zinc-50">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{mockupFile ? mockupFile.name : "Pilih file mockup (opsional)"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setMockupFile(e.target.files?.[0] ?? null)} />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const r = await orderRepository.sendDesignVersion(order.id, mockupFile);
                      setMockupFile(null);
                      return r.isPaidRevision ? `${r.message} Catatan: revisi ini melewati batas gratis (BR-17).` : r.message;
                    })
                  }
                >
                  Kirim Mockup v{(latest?.versionNo ?? 0) + 1}
                </Button>
              </>
            )}
            {awaitingAcc && isAdmin && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => act(async () => (await orderRepository.approveDesign(latest.id, "manual_admin")).message)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Catat ACC v{latest.versionNo}
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setShowRevision((s) => !s)}>
                  Minta Revisi
                </Button>
              </>
            )}
          </div>
          {awaitingAcc && isAdmin && (
            <p className="text-[11px] text-zinc-400">
              Webhook tombol ACC WhatsApp belum tersambung; Admin mencatat ACC manual dengan bukti (BR-21). ACC memulai Slot Lock 24 jam.
            </p>
          )}
          {showRevision && awaitingAcc && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className={inputCls}
                placeholder="Masukan revisi dari pelanggan..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
              <Button
                variant="danger"
                size="sm"
                disabled={busy || revisionNote.trim().length < 3}
                onClick={() =>
                  act(async () => {
                    const r = await orderRepository.requestRevision(latest.id, revisionNote.trim());
                    setRevisionNote("");
                    setShowRevision(false);
                    return r.message;
                  })
                }
              >
                Simpan Revisi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Pembayaran */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-zinc-600" /> Langkah 2 · Pembayaran Manual Kasir (BR-08, BR-11)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          {payments.length > 0 ? (
            <div className="overflow-x-auto border border-zinc-200 rounded-md">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dash-line text-zinc-500 text-[11px] uppercase font-semibold tracking-wider">
                    <th className="py-2 px-3">Waktu</th>
                    <th className="py-2 px-3">Metode</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Catatan</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 tabular-nums">{new Date(p.createdAt).toLocaleString("id-ID")}</td>
                      <td className="py-2 px-3 uppercase font-semibold">{p.method}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatRupiah(p.amount)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={p.status === "valid" ? "emerald" : p.status === "pending" ? "amber" : "red"}>
                          {p.status === "valid" ? "Valid" : p.status === "pending" ? "Menunggu Validasi" : "Ditolak"}
                        </Badge>
                        {p.verifiedBy && <p className="text-[10px] text-zinc-400 mt-0.5">oleh {p.verifiedBy}</p>}
                      </td>
                      <td className="py-2 px-3 text-zinc-600 text-[11px]">
                        {p.notes}
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noreferrer" className="block text-blue-700 hover:underline">
                            Bukti bayar
                          </a>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {p.status === "pending" && isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                act(async () => {
                                  await paymentRepository.validatePayment(p.id);
                                  return `Pembayaran ${formatRupiah(p.amount)} divalidasi.`;
                                })
                              }
                            >
                              Validasi
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejectFor(p.id)}>
                              Tolak
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-500">Belum ada pembayaran tercatat.</p>
          )}

          {rejectFor && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input className={inputCls} placeholder="Alasan penolakan (mis. mutasi tidak ditemukan)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
              <Button
                variant="danger"
                size="sm"
                disabled={busy || rejectNote.trim().length < 5}
                onClick={() =>
                  act(async () => {
                    await paymentRepository.rejectPayment(rejectFor, rejectNote.trim());
                    setRejectFor(null);
                    setRejectNote("");
                    return "Pembayaran ditolak dan dicatat di audit log.";
                  })
                }
              >
                <XCircle className="w-3.5 h-3.5" /> Simpan Penolakan
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>
                Batal
              </Button>
            </div>
          )}

          {/* Online: bukti dikirim pelanggan lewat WA/chatbot & langsung masuk sistem. Offline: Admin input manual. */}
          {canRecordPayment && order.channel === "online" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <p className="text-zinc-600">
                Pesanan online: pelanggan mengirim bukti bayar lewat WhatsApp/chatbot dan bukti langsung masuk ke antrean Kasir
                untuk divalidasi. <span className="text-zinc-400">(Integrasi WhatsApp belum aktif.)</span>
              </p>
              {!manualOnlinePay && (
                <Button variant="outline" size="sm" onClick={() => setManualOnlinePay(true)}>
                  Catat manual (cadangan)
                </Button>
              )}
            </div>
          )}

          {canRecordPayment && (order.channel === "offline" || manualOnlinePay) && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end pt-2 border-t border-zinc-100">
              <div>
                <label htmlFor="pay-method" className="block text-[11px] text-zinc-500 mb-1">Metode</label>
                <select id="pay-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className={inputCls}>
                  <option value="transfer">Transfer</option>
                  <option value="cash">Tunai</option>
                </select>
              </div>
              <div>
                <label htmlFor="pay-amount" className="block text-[11px] text-zinc-500 mb-1">Nominal (Rp)</label>
                <input id="pay-amount" type="number" min={1000} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className={`${inputCls} font-mono tabular-nums`} />
              </div>
              <div>
                <label htmlFor="pay-notes" className="block text-[11px] text-zinc-500 mb-1">Catatan</label>
                <input id="pay-notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className={inputCls} placeholder="mis. BCA a.n. ..." />
              </div>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dash-line bg-white text-zinc-600 cursor-pointer hover:bg-zinc-50 truncate">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{payProof ? payProof.name : payMethod === "cash" ? "Bukti bayar * (foto nota)" : "Bukti bayar * (bukti transfer)"}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setPayProof(e.target.files?.[0] ?? null)} />
              </label>
              <Button
                variant="primary"
                size="md"
                disabled={busy || payAmount < 1000 || !payProof}
                title={payProof ? undefined : "Lampirkan bukti bayar (wajib untuk tunai maupun transfer)"}
                onClick={() =>
                  act(async () => {
                    if (!payProof) throw new Error("Bukti bayar wajib dilampirkan, baik pembayaran tunai maupun transfer.");
                    await paymentRepository.recordPayment(order.id, { method: payMethod, amount: payAmount, notes: payNotes, proof: payProof });
                    setPayNotes("");
                    setPayProof(null);
                    return "Pembayaran dicatat sebagai pending. Cek mutasi lalu klik Validasi.";
                  })
                }
              >
                Catat Pembayaran
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Gate SPK */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-600" /> Langkah 3 · Gerbang SPK Final (BR-05, BR-09)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          {gate && (
            <ul className="space-y-1.5">
              <GateRow ok={gate.design_approved} label="Desain sudah di-ACC secara sah" />
              <GateRow ok={gate.payment_valid} label={`Pembayaran valid ≥ DP minimum (${formatRupiah(order.dpRequired)})`} />
              <GateRow ok={gate.slot_permanent} label="Kuota produksi terkunci permanen" />
              <GateRow ok={gate.not_issued} label="SPK belum pernah diterbitkan" />
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {order.spk ? (
              <p className="text-emerald-700 font-medium">
                SPK <span className="font-mono">{order.spk.spkNumber}</span> terbit{" "}
                {new Date(order.spk.issuedAt).toLocaleString("id-ID")}. Pesanan masuk Kanban WIP.
              </p>
            ) : (
              <p className="text-zinc-500 flex items-center gap-1">
                {!gateOk && <Lock className="w-3.5 h-3.5" />}
                {gateOk ? "Semua prasyarat terpenuhi." : "Tombol terkunci hingga seluruh prasyarat terpenuhi."}
              </p>
            )}
            {!order.spk && isAdmin && (
              <Button
                variant="primary"
                size="md"
                disabled={busy || !gateOk}
                onClick={() => act(async () => `SPK ${(await spkRepository.issueSpk(order.id)).spkNumber} berhasil diterbitkan.`)}
              >
                <FileText className="w-3.5 h-3.5" /> Terbitkan SPK Final
              </Button>
            )}
            {order.spk && (
              <Link href="/production/kanban">
                <Button variant="outline" size="sm">
                  Buka Kanban WIP <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Riwayat WIP */}
      {(order.wipHistories?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-zinc-600" /> Riwayat WIP Produksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-100 text-xs">
              {order.wipHistories!.map((h) => (
                <li key={h.id} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {h.fromStage ? stageLabel(h.fromStage) : "SPK Terbit"} → <strong>{stageLabel(h.toStage)}</strong>
                    {h.reasonNote && <span className="ml-2 text-red-700">Rework: {h.reasonNote}</span>}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                    {h.actorName} · {new Date(h.createdAt).toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Gabungkan nilai unik untuk ringkasan (pesanan lama bisa berisi lebih dari satu produk/warna). */
function unique(values: string[]) {
  return Array.from(new Set(values)).join(", ") || "-";
}

function Row({ label, value, last }: { label: React.ReactNode; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${last ? "" : "border-b border-zinc-100"}`}>
      <span className="text-zinc-500 flex items-center gap-1.5">{label}</span>
      <strong className="text-zinc-900 text-right">{value}</strong>
    </div>
  );
}

function GateRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
      <span className={ok ? "text-zinc-800" : "text-zinc-500"}>{label}</span>
    </li>
  );
}
