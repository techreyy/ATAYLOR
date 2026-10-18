"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, CheckCircle2, Clock, ExternalLink, AlertTriangle } from "lucide-react";
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
            <Badge variant="emerald">Live · Database</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Antrean pesanan terpusat Online (WA) & Offline (Toko) — BR-01 & BR-02
          </p>
        </div>
        {activeRole === "admin" && (
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
            <span className="text-[11px] text-zinc-400 font-mono font-normal">Tabel: orders</span>
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
                    <th className="py-2.5 px-3 text-right">Dibayar & Sisa</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((order) => {
                    const meta = orderStatusMeta(order.status);
                    const late =
                      order.dueDate < today() && !["selesai", "dibatalkan", "menunggu_pelunasan"].includes(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-dash-hover/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-zinc-900 tabular-nums">{order.orderCode}</span>
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
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                              <Clock className="w-3 h-3" /> Lock 24j
                            </span>
                          )}
                          {order.slotLockStatus === "permanent" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                              <CheckCircle2 className="w-3 h-3" /> Slot Permanen
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 text-right tabular-nums">
                          {formatRupiah(order.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono text-emerald-700 font-medium tabular-nums">
                            {formatRupiah(order.paidAmount)}
                          </div>
                          <div className="font-mono text-zinc-400 text-[11px] tabular-nums">
                            Sisa: {formatRupiah(order.remainingBalance)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              Detail <ExternalLink className="w-3 h-3 ml-0.5 text-zinc-400" />
                            </Button>
                          </Link>
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
