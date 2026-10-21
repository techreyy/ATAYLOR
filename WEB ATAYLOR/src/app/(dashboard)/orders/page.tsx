"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, CheckCircle2, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { Order, OrderChannel } from "@/core/types/order.types";
import { ORDER_STATUS_META, orderStatusMeta, stageLabel } from "@/lib/constants";
import { formatRupiah } from "@/lib/currency";
import { useRole } from "@/components/shell/role-context";
import { localDate } from "@/lib/date";

const today = () => localDate();

export default function OrdersPage() {
  const { activeRole } = useRole();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | OrderChannel>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(
        await orderRepository.getAllOrders({
          q: search.trim() || undefined,
          channel: channelFilter === "all" ? undefined : channelFilter,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        })
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [search, channelFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const inputCls =
    "px-2.5 py-1.5 text-xs rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">OMS / Pesanan Konveksi</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Antrean pesanan terpusat Online (WA) & Offline (Toko)
          </p>
        </div>
        {(activeRole === "admin" || activeRole === "owner") && (
          <Link href="/orders/new">
            <Button variant="primary" size="md">
              <Plus className="w-3.5 h-3.5" />
              Buat Pesanan Baru
            </Button>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Order ID, Pelanggan, Closer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-8 pr-3 ${inputCls}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Kanal:
            </span>
            <div className="flex rounded-lg border border-dash-line p-0.5 bg-zinc-50">
              {(
                [
                  ["all", "Semua"],
                  ["online", "Online (WA)"],
                  ["offline", "Offline (Toko)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChannelFilter(value)}
                  className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-all duration-200 ${
                    channelFilter === value ? "bg-dash-primary text-dash-ink shadow-primary" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls} aria-label="Filter status">
              <option value="">Semua Status</option>
              {Object.entries(ORDER_STATUS_META).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>

            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${inputCls} font-mono`} aria-label="Dari tanggal" />
            <span className="text-xs text-zinc-400">s.d.</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${inputCls} font-mono`} aria-label="Sampai tanggal" />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold flex items-center justify-between w-full">
            <span>Daftar Transaksi ({orders.length} Pesanan)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState error={error} onRetry={load} />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Tidak Ada Pesanan Ditemukan"
                description="Coba ubah kata kunci pencarian, status, kanal, atau rentang tanggal."
              />
            </div>
          ) : (
            <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-dash-line text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Order ID & Tanggal</th>
                    <th className="py-2.5 px-3">Pelanggan</th>
                    <th className="py-2.5 px-3">Kanal & Closer</th>
                    <th className="py-2.5 px-3">Status & Slot Lock</th>
                    <th className="py-2.5 px-3 text-right">Total Nilai</th>
                    <th className="py-2.5 px-3">Pembayaran</th>
                    <th className="py-2.5 px-3" aria-label="Buka detail" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((order) => {
                    const meta = orderStatusMeta(order.status);
                    const late =
                      order.dueDate < today() && !["selesai", "dibatalkan", "menunggu_pelunasan"].includes(order.status);
                    const paidPct = order.totalAmount > 0 ? Math.min(100, Math.round((order.paidAmount / order.totalAmount) * 100)) : 0;
                    const paidOff = order.totalAmount > 0 && order.remainingBalance === 0;
                    return (
                      // Seluruh baris membuka detail; kode pesanan tetap tautan agar bisa dibuka lewat keyboard
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="hover:bg-dash-hover/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono font-bold text-zinc-900 tabular-nums hover:text-dash-primary-strong"
                          >
                            {order.orderCode}
                          </Link>
                          <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                            {new Date(order.createdAt).toLocaleDateString("id-ID")}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-zinc-900">{order.customerName}</p>
                          <p className="text-[11px] text-zinc-400 font-mono tabular-nums">{order.customerWa}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-0.5 border ${
                              order.channel === "online"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {order.channel === "online" ? "Online WA" : "Offline Toko"}
                          </span>
                          {order.marketingCloserName ? (
                            <p className="text-[11px] text-zinc-500">
                              Closer: <strong className="text-zinc-700">{order.marketingCloserName}</strong>
                            </p>
                          ) : (
                            <p className="text-[11px] text-zinc-400 italic">Self-service WA</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            {late && (
                              <Badge variant="red">
                                <AlertTriangle className="w-3 h-3 mr-0.5" /> Terlambat
                              </Badge>
                            )}
                          </div>
                          {order.wipStage && (
                            <p className="text-[10px] text-zinc-500">Tahap: {stageLabel(order.wipStage)}</p>
                          )}
                          {order.slotLockStatus === "temp_24h" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3" /> Lock 24j
                            </span>
                          )}
                          {order.slotLockStatus === "permanent" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Slot Permanen
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(order.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 min-w-[150px]">
                          <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                            <span className={paidOff ? "font-semibold text-emerald-700" : "font-semibold text-zinc-800"}>
                              {paidOff ? "Lunas" : formatRupiah(order.paidAmount)}
                            </span>
                            <span className="text-zinc-400">{paidPct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="Persentase dibayar">
                            <div className={`h-full rounded-full ${paidOff ? "bg-dash-success" : "bg-dash-primary"}`} style={{ width: `${paidPct}%` }} />
                          </div>
                          {!paidOff && (
                            <p className="mt-0.5 text-[10px] text-zinc-400 tabular-nums whitespace-nowrap">Sisa {formatRupiah(order.remainingBalance)}</p>
                          )}
                        </td>
                        <td className="py-2.5 pl-1 pr-3 text-right">
                          <ChevronRight className="w-4 h-4 text-zinc-300 inline transition-all duration-200 group-hover:text-dash-primary-strong group-hover:translate-x-0.5" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
