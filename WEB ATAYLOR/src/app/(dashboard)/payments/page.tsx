"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileCheck, ShieldAlert, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { paymentRepository } from "@/core/adapters/api/api-payment.adapter";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { PaymentRecord } from "@/core/types/payment.types";
import { Order } from "@/core/types/order.types";
import { orderStatusMeta } from "@/lib/constants";
import { formatRupiah } from "@/lib/currency";

function hoursLeft(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "habis";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}j ${m}m`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [awaiting, setAwaiting] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([
        paymentRepository.getPayments(),
        orderRepository.getAllOrders({ status: undefined }),
      ]);
      setPayments(p);
      setAwaiting(o.filter((x) => ["menunggu_pembayaran", "menunggu_pelunasan", "kedaluwarsa"].includes(x.status)));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, fn: () => Promise<string>) => {
    setBusyId(id);
    setNotice(null);
    try {
      setNotice({ tone: "success", text: await fn() });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const pending = payments.filter((p) => p.status === "pending");
  const history = payments.filter((p) => p.status !== "pending");

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-dash-text tracking-tight">Kasir & Validasi Pembayaran</h2>
          <Badge variant="emerald">Live · Database</Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Verifikasi manual tanpa payment gateway (BR-08, BR-10). Validasi DP saat Slot Lock 24 jam aktif mengunci kuota permanen.
        </p>
      </div>

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Antrean validasi */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-zinc-600" />
              Bukti Bayar Menunggu Validasi ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pending.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Tidak ada pembayaran pending" description="Catat pembayaran baru dari halaman detail pesanan." />
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 text-xs">
                {pending.map((p) => (
                  <li key={p.id} className="p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/orders/${p.orderId}`} className="font-mono font-bold text-zinc-900 hover:underline tabular-nums">
                          {p.orderCode}
                        </Link>
                        <span className="text-zinc-500"> — {p.customerName}</span>
                        <p className="text-[11px] text-zinc-500">
                          <span className="uppercase font-semibold">{p.method}</span> · dicatat {p.recordedBy} ·{" "}
                          {new Date(p.createdAt).toLocaleString("id-ID")}
                        </p>
                        {p.notes && <p className="text-[11px] text-zinc-600">{p.notes}</p>}
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-700 hover:underline">
                            Lihat bukti bayar
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tabular-nums">{formatRupiah(p.amount)}</span>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busyId === p.id}
                          onClick={() =>
                            act(p.id, async () => {
                              await paymentRepository.validatePayment(p.id);
                              return `Pembayaran ${p.orderCode} sebesar ${formatRupiah(p.amount)} divalidasi.`;
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Validasi
                        </Button>
                        <Button variant="outline" size="sm" disabled={busyId === p.id} onClick={() => setRejectFor(p.id)}>
                          Tolak
                        </Button>
                      </div>
                    </div>
                    {rejectFor === p.id && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          placeholder="Alasan penolakan (min. 5 karakter)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={rejectNote.trim().length < 5 || busyId === p.id}
                          onClick={() =>
                            act(p.id, async () => {
                              await paymentRepository.rejectPayment(p.id, rejectNote.trim());
                              setRejectFor(null);
                              setRejectNote("");
                              return `Pembayaran ${p.orderCode} ditolak.`;
                            })
                          }
                        >
                          <XCircle className="w-3.5 h-3.5" /> Simpan
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Aturan */}
        <Card className="bg-zinc-50/70 border-zinc-200">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
              Aturan Kasir (BR-07, BR-08, BR-10, BR-11)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-zinc-700 space-y-2.5 leading-relaxed">
            <p><strong>1. Tanpa Gateway:</strong> Tidak ada API mutasi bank. Admin mencocokkan mutasi manual sebelum klik Validasi.</p>
            <p><strong>2. DP Minimum:</strong> Ditetapkan per produk (default 50%). SPK hanya terbit bila DP valid & kuota permanen.</p>
            <p><strong>3. Slot Lock 24 Jam:</strong> Bila lewat 24 jam sejak ACC tanpa pembayaran valid, kuota dilepas otomatis.</p>
            <p><strong>4. Pelunasan:</strong> Ditagih saat tiba di gudang; pesanan selesai setelah lunas.</p>
          </CardContent>
        </Card>
      </div>

      {/* Pesanan perlu pembayaran */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Pesanan Menunggu Pembayaran / Pelunasan ({awaiting.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {awaiting.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Semua tagihan aman" description="Tidak ada pesanan yang sedang menunggu pembayaran." />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dash-line text-zinc-500 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="py-2 px-3">Order</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Slot Lock</th>
                  <th className="py-2 px-3 text-right">DP Minimum</th>
                  <th className="py-2 px-3 text-right">Dibayar</th>
                  <th className="py-2 px-3 text-right">Sisa</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {awaiting.map((o) => {
                  const meta = orderStatusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold tabular-nums">{o.orderCode}</span>
                        <p className="text-[11px] text-zinc-500">{o.customerName}</p>
                      </td>
                      <td className="py-2.5 px-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="py-2.5 px-3">
                        {o.slotLockStatus === "temp_24h" ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-mono text-[11px]">
                            <Clock className="w-3 h-3" /> sisa {hoursLeft(o.slotLockExpiresAt)}
                          </span>
                        ) : o.slotLockStatus === "permanent" ? (
                          <span className="text-emerald-700 text-[11px]">Permanen</span>
                        ) : (
                          <span className="text-red-700 text-[11px]">{o.slotLockStatus === "expired" ? "Kedaluwarsa" : "-"}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatRupiah(o.dpRequired)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">{formatRupiah(o.paidAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatRupiah(o.remainingBalance)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link href={`/orders/${o.id}`}>
                          <Button variant="outline" size="sm">Catat Pembayaran</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Riwayat */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Riwayat Pembayaran Diproses ({history.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dash-line text-zinc-500 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-2 px-3">Waktu Validasi</th>
                <th className="py-2 px-3">Order & Pelanggan</th>
                <th className="py-2 px-3">Metode</th>
                <th className="py-2 px-3 text-right">Nominal</th>
                <th className="py-2 px-3">Status & Verifikator</th>
                <th className="py-2 px-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {history.map((p) => (
                <tr key={p.id} className="hover:bg-dash-hover/50">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 tabular-nums">
                    {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-zinc-900 tabular-nums">{p.orderCode}</span>
                    <p className="text-zinc-500 text-[11px]">{p.customerName}</p>
                  </td>
                  <td className="py-2.5 px-3 uppercase font-semibold text-zinc-700">{p.method}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-right tabular-nums">{formatRupiah(p.amount)}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={p.status === "valid" ? "emerald" : "red"}>{p.status === "valid" ? "Valid" : "Ditolak"}</Badge>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{p.verifiedBy}</p>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-600 text-[11px]">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
