"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Printer, ShieldCheck, AlertTriangle, Lock, Building, CheckCircle2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { spkRepository } from "@/core/adapters/api/api-spk.adapter";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { Order, SpkGate } from "@/core/types/order.types";
import { SpkDocument } from "@/core/types/production.types";
import { orderStatusMeta } from "@/lib/constants";
import { formatRupiah } from "@/lib/currency";
import { useRole } from "@/components/shell/role-context";
import { localDate } from "@/lib/date";

const inputCls =
  "w-full p-2 text-xs rounded-lg border border-dash-line bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-400";

const isoDate = (offset = 0) => localDate(offset);

export default function SpkDispatchPage() {
  const { activeRole } = useRole();
  const isAdmin = activeRole === "admin";
  const canDispatch = activeRole === "owner" || activeRole === "manager"; // BR-27

  const [spkList, setSpkList] = useState<SpkDocument[]>([]);
  const [candidates, setCandidates] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [gate, setGate] = useState<SpkGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Form dispatch (Owner/Manager)
  const [dispatchSpkId, setDispatchSpkId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorReceiver, setVendorReceiver] = useState("");
  const [materialSentDate, setMaterialSentDate] = useState(isoDate());
  const [vendorDueDate, setVendorDueDate] = useState(isoDate(7));

  const load = useCallback(async () => {
    try {
      const [spks, orders] = await Promise.all([spkRepository.getSpkList(), orderRepository.getAllOrders()]);
      setSpkList(spks);
      // Kandidat SPK: pesanan yang sudah melewati ACC dan belum punya SPK
      const c = orders.filter((o) =>
        ["menunggu_acc", "menunggu_pembayaran", "pembayaran_valid", "kedaluwarsa", "brief_lengkap", "revisi"].includes(o.status)
      );
      setCandidates(c);
      setSelectedOrderId((prev) => prev || c.find((o) => o.status === "pembayaran_valid")?.id || c[0]?.id || "");
      setDispatchSpkId((prev) => prev || spks.find((s) => !s.dispatchedAt)?.id || "");
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

  useEffect(() => {
    if (!selectedOrderId) {
      setGate(null);
      return;
    }
    spkRepository.getGate(selectedOrderId).then(setGate).catch(() => setGate(null));
  }, [selectedOrderId, spkList]);

  const selectedOrder = candidates.find((o) => o.id === selectedOrderId);
  const canIssue = !!gate && gate.payment_valid && gate.slot_permanent && gate.design_approved && gate.not_issued;
  const undispatched = spkList.filter((s) => !s.dispatchedAt);

  const handleIssue = async () => {
    if (!selectedOrder) return;
    setBusy(true);
    setNotice(null);
    try {
      const spk = await spkRepository.issueSpk(selectedOrder.id);
      setNotice({ tone: "success", text: `SPK Final ${spk.spkNumber} terbit untuk ${selectedOrder.orderCode}. Pesanan masuk kolom Antrean Kanban.` });
      setSelectedOrderId("");
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchSpkId) return;
    setBusy(true);
    setNotice(null);
    try {
      const spk = await spkRepository.dispatch(dispatchSpkId, {
        vendor_name: vendorName.trim(),
        spk_receiver: vendorReceiver.trim(),
        material_sent_date: materialSentDate,
        vendor_due_date: vendorDueDate,
      });
      setNotice({ tone: "success", text: `Dispatch ${spk.spkNumber} ke ${spk.vendorName} tercatat oleh ${spk.dispatchedBy}.` });
      setDispatchSpkId("");
      setVendorName("");
      setVendorReceiver("");
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-dash-text tracking-tight">SPK Final & Dispatch Vendor</h2>
          <Badge variant="emerald">Live · Database</Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Admin hanya menerbitkan SPK (BR-09). Kontak vendor, kirim bahan & dispatch dicatat Owner/Manager (BR-27).
        </p>
      </div>

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gate Penerbitan SPK */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
              Gerbang Penerbitan SPK (BR-05, BR-09)
            </CardTitle>
            {!isAdmin && <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Khusus Admin</span>}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {candidates.length === 0 ? (
              <EmptyState title="Tidak ada kandidat SPK" description="Semua pesanan aktif sudah memiliki SPK." />
            ) : (
              <>
                <div>
                  <label htmlFor="spk-order" className="block text-xs font-semibold text-zinc-700 mb-1">Pilih pesanan:</label>
                  <select
                    id="spk-order"
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className={`${inputCls} font-mono tabular-nums`}
                  >
                    {candidates.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderCode} — {o.customerName} [{orderStatusMeta(o.status).label}]
                      </option>
                    ))}
                  </select>
                </div>

                {gate && selectedOrder && (
                  <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                    <GateLine ok={gate.design_approved} label="Desain di-ACC secara sah (BR-05)" okText="ACC SAH" failText="BELUM ACC" />
                    <GateLine
                      ok={gate.payment_valid}
                      label={`DP valid ≥ ${formatRupiah(selectedOrder.dpRequired)}`}
                      okText="MEMENUHI"
                      failText={`DIBAYAR ${formatRupiah(selectedOrder.paidAmount)}`}
                    />
                    <GateLine ok={gate.slot_permanent} label="Kuota terkunci permanen" okText="PERMANEN" failText="BELUM PERMANEN" lockIcon />
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between gap-2">
                  {!canIssue && (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Terkunci hingga semua prasyarat terpenuhi.
                    </p>
                  )}
                  <div className="ml-auto">
                    <Button variant="primary" disabled={!canIssue || !isAdmin || busy} onClick={handleIssue} size="md">
                      <FileText className="w-3.5 h-3.5" />
                      Terbitkan SPK Final
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dispatch Vendor */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-zinc-600" />
              Catat Dispatch Vendor Eksternal (BR-27)
            </CardTitle>
            {!canDispatch && (
              <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Khusus Owner / Manager</span>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {undispatched.length === 0 ? (
              <EmptyState title="Semua SPK sudah didispatch" description="SPK baru akan muncul di sini setelah diterbitkan Admin." />
            ) : (
              <form onSubmit={handleDispatch} className="space-y-2.5 text-xs">
                <div>
                  <label htmlFor="dispatch-spk" className="block text-[11px] text-zinc-500 mb-1">SPK</label>
                  <select id="dispatch-spk" value={dispatchSpkId} onChange={(e) => setDispatchSpkId(e.target.value)} disabled={!canDispatch} className={`${inputCls} font-mono`}>
                    {undispatched.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.spkNumber} — {s.order?.orderCode} {s.order?.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="vendor" className="block text-[11px] text-zinc-500 mb-1">Nama Mitra Vendor</label>
                    <input id="vendor" required disabled={!canDispatch} value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="receiver" className="block text-[11px] text-zinc-500 mb-1">Penerima Bahan / SPK</label>
                    <input id="receiver" required disabled={!canDispatch} value={vendorReceiver} onChange={(e) => setVendorReceiver(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="sent" className="block text-[11px] text-zinc-500 mb-1">Tanggal Kirim Bahan</label>
                    <input id="sent" type="date" required disabled={!canDispatch} value={materialSentDate} onChange={(e) => setMaterialSentDate(e.target.value)} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label htmlFor="vdue" className="block text-[11px] text-zinc-500 mb-1">Tenggat Vendor</label>
                    <input id="vdue" type="date" required min={materialSentDate} disabled={!canDispatch} value={vendorDueDate} onChange={(e) => setVendorDueDate(e.target.value)} className={`${inputCls} font-mono`} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" type="submit" size="md" disabled={!canDispatch || busy}>
                    <Truck className="w-3.5 h-3.5" /> Simpan Dispatch
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daftar SPK */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Daftar SPK Resmi ({spkList.length} Dokumen)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dash-line text-zinc-500 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-2 px-3">Nomor SPK & Tanggal</th>
                <th className="py-2 px-3">Order & Pemesan</th>
                <th className="py-2 px-3">Spesifikasi</th>
                <th className="py-2 px-3">Vendor & Dispatch</th>
                <th className="py-2 px-3">Tenggat</th>
                <th className="py-2 px-3 text-right">Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {spkList.map((spk) => {
                const item = spk.order?.items?.[0];
                return (
                  <tr key={spk.id} className="hover:bg-dash-hover/50">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-zinc-900 tabular-nums">{spk.spkNumber}</span>
                      <p className="text-[10px] text-zinc-400 font-mono tabular-nums">
                        {new Date(spk.issuedAt).toLocaleDateString("id-ID")} · {spk.issuedBy}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <Link href={`/orders/${spk.orderId}`} className="font-mono font-bold text-zinc-800 tabular-nums hover:underline">
                        {spk.order?.orderCode}
                      </Link>
                      <p className="text-[11px] text-zinc-500">{spk.order?.customerName}</p>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      {item ? `${item.productName} (${item.color}) — ${item.qty} pcs` : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {spk.dispatchedAt ? (
                        <>
                          <p className="font-medium text-zinc-900">{spk.vendorName}</p>
                          <p className="text-[10px] text-zinc-500">
                            Penerima: {spk.spkReceiver} · oleh {spk.dispatchedBy}
                          </p>
                        </>
                      ) : (
                        <Badge variant="amber">Belum Dispatch</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-zinc-700 tabular-nums">{spk.order?.dueDate}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={`/production/spk/${spk.id}/print`} target="_blank">
                        <Button variant="outline" size="sm">
                          <Printer className="w-3.5 h-3.5 mr-1 text-zinc-500" /> Cetak A4 / PDF
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function GateLine({
  ok,
  label,
  okText,
  failText,
  lockIcon,
}: {
  ok: boolean;
  label: string;
  okText: string;
  failText: string;
  lockIcon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-zinc-700">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : lockIcon ? (
          <Lock className="w-4 h-4 text-amber-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-600" />
        )}
        {label}
      </span>
      <span className={`font-mono font-semibold tabular-nums text-[11px] ${ok ? "text-emerald-700" : "text-red-600"}`}>
        {ok ? okText : failText}
      </span>
    </div>
  );
}
