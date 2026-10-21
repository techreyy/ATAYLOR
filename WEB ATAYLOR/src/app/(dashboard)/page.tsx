"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Kanban, ArrowRight, Clock, BellRing, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo, BrandWordmark } from "@/components/logo";
import { useRole } from "@/components/shell/role-context";
import { USER_ROLES, orderStatusMeta } from "@/lib/constants";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { notificationRepository } from "@/core/adapters/api/api-notification.adapter";
import { Order } from "@/core/types/order.types";
import type { NotificationFeed, NotificationSeverity } from "@/core/types/notification.types";
import { formatRupiah } from "@/lib/currency";
import { useCountUp } from "@/lib/use-count-up";

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  danger: "bg-dash-danger",
  warning: "bg-dash-warning",
  info: "bg-dash-info",
};

export default function DashboardOverviewPage() {
  const { activeRole, user } = useRole();
  const currentRole = USER_ROLES.find((r) => r.id === activeRole);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);

  useEffect(() => {
    // Super Admin tidak mengakses data bisnis tenant (SRS §2.3)
    if (activeRole === "super_admin") return;
    orderRepository.getAllOrders().then(setOrders).catch(() => setOrders([]));
    // Daftar yang sama dengan lonceng notifikasi, sesuai peran
    notificationRepository.getFeed().then(setFeed).catch(() => setFeed({ items: [], total: 0, urgent: 0 }));
  }, [activeRole]);

  const active = (orders ?? []).filter((o) => !["selesai", "dibatalkan"].includes(o.status));
  const totalOmzet = active.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalPaid = (orders ?? []).reduce((acc, o) => acc + o.paidAmount, 0);
  const wipCount = (orders ?? []).filter((o) => o.status === "produksi" || o.status === "spk_terbit").length;
  const lockedCount = (orders ?? []).filter((o) => o.slotLockStatus === "temp_24h").length;
  const loaded = orders !== null;
  // Angka Rupiah di ringkasan tidak ditampilkan untuk Admin & Designer (keputusan pemilik)
  const showRupiah = activeRole !== "admin" && activeRole !== "designer";

  return (
    <div className="space-y-6 dash-stagger">
      {/* Sapaan ala Skydash */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dash-text">
            Selamat Datang, {user?.name?.split(" ").find((w) => !w.endsWith(".")) ?? user?.name}
          </h2>
          <p className="text-sm text-dash-muted mt-1">
            {currentRole?.label}
            {feed && (
              <>
                {" · "}
                {feed.total > 0 ? (
                  <span className="text-dash-primary-strong font-semibold">{feed.total} hal perlu ditindaklanjuti.</span>
                ) : (
                  "Tidak ada yang perlu ditindaklanjuti."
                )}
              </>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-xl bg-white text-xs font-semibold text-dash-text shadow-card">
          <Clock className="w-3.5 h-3.5 text-dash-primary-strong" />
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kartu hero */}
        <div className="relative overflow-hidden rounded-card bg-dash-primary-soft p-6 min-h-[260px] flex flex-col justify-between">
          <span className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-dash-primary/30 animate-drift" />
          <span className="absolute right-16 bottom-[-50px] w-36 h-36 rounded-full bg-dash-charcoal/10 animate-drift-slow" />
          <span className="absolute left-[45%] top-8 w-4 h-4 rounded-full bg-dash-warning/70 animate-pulse" />
          <div className="relative flex items-center gap-2">
            <div className="flex items-center justify-center shrink-0 animate-float">
              <BrandLogo size="sm" />
            </div>
            <div>
              <BrandWordmark height={34} />
              <p className="text-xs text-dash-muted mt-1">Omnichannel & Production Tracking</p>
            </div>
          </div>
          <p className="relative text-sm text-dash-text/80 max-w-sm leading-relaxed">
            Pusat kendali operasional terpadu: pesanan online & offline, verifikasi kasir, penerbitan SPK pabrik, dan
            monitoring lantai produksi WIP.
          </p>
          <div className="relative flex flex-wrap gap-2">
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-dash-primary text-dash-ink text-xs font-semibold hover:bg-dash-primary-hover hover:shadow-primary hover:-translate-y-px transition-all duration-200"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Pesanan Baru
            </Link>
            <Link
              href="/production/kanban"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-dash-primary-strong text-xs font-semibold hover:-translate-y-px hover:shadow-card-hover transition-all duration-200"
            >
              <Kanban className="w-3.5 h-3.5" />
              Board WIP
            </Link>
          </div>
        </div>

        {/* Kartu KPI berwarna khas Skydash */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {showRupiah && (
            <>
              <KpiTile color="bg-dash-primary" title="Nilai Pesanan Aktif" value={loaded ? totalOmzet : null} format={formatRupiah} note={loaded ? `${active.length} pesanan aktif` : "…"} />
              <KpiTile color="bg-dash-charcoal" title="Pembayaran Tervalidasi" value={loaded ? totalPaid : null} format={formatRupiah} note="Verifikasi manual Admin" />
            </>
          )}
          <KpiTile color="bg-dash-tale" title="WIP Lantai Produksi" value={loaded ? wipCount : null} format={(n) => `${n} Order`} note="Antrean s.d. QC Pabrik" />
          <KpiTile
            color="bg-dash-light-danger"
            title="Slot Lock 24 Jam"
            value={loaded ? lockedCount : null}
            format={(n) => `${n} Order`}
            note="Menunggu validasi DP"
            alert={lockedCount > 0}
          />
        </div>
      </div>

      {/* Hal yang perlu dikerjakan & pesanan terbaru (menggantikan grid modul yang mengulang isi sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-dash-primary-strong" />
              Perlu Ditindaklanjuti
            </CardTitle>
            {feed && feed.total > 0 && (
              <span className="text-[11px] text-dash-muted tabular-nums">
                {feed.total} item{feed.urgent > 0 ? ` · ${feed.urgent} mendesak` : ""}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-2">
            {feed === null ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : feed.items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-dash-success mx-auto mb-2" />
                <p className="text-xs text-dash-muted">Tidak ada yang perlu ditindaklanjuti. Semua beres.</p>
              </div>
            ) : (
              <ul className="reveal-stagger">
                {feed.items.slice(0, 6).map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-dash-hover transition-colors group">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className="text-xs font-bold text-dash-text">{n.title}</span>
                          <span className="font-mono text-[10px] text-dash-muted tabular-nums">{n.orderCode}</span>
                        </span>
                        <span className="block text-[11px] text-dash-muted leading-snug tabular-nums">{n.message}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 mt-1 text-dash-muted shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-dash-primary-strong" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {feed && feed.total > 6 && (
              <p className="px-3 pt-1 pb-2 text-[11px] text-dash-muted tabular-nums">
                +{feed.total - 6} lainnya — lihat lonceng notifikasi di kanan atas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-dash-primary-strong" />
              Pesanan Terbaru
            </CardTitle>
            <Link href="/orders" className="text-[11px] font-semibold text-dash-primary-strong hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent className="p-2">
            {activeRole === "super_admin" ? (
              <p className="px-4 py-8 text-center text-xs text-dash-muted">Super Admin tidak mengakses data pesanan tenant.</p>
            ) : orders === null ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-dash-muted">Belum ada pesanan.</p>
            ) : (
              <ul className="reveal-stagger">
                {orders.slice(0, 5).map((o) => {
                  const meta = orderStatusMeta(o.status);
                  return (
                    <li key={o.id}>
                      <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dash-hover transition-colors group">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="font-mono text-xs font-bold text-dash-text tabular-nums">{o.orderCode}</span>
                            <span className="text-[10px] text-dash-muted">{o.channel === "online" ? "Online WA" : "Offline Toko"}</span>
                          </span>
                          <span className="block text-[11px] text-dash-muted truncate">{o.customerName}</span>
                        </span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-dash-muted shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-dash-primary-strong" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({
  color,
  title,
  value,
  format,
  note,
  alert = false,
}: {
  color: string;
  title: string;
  /** null = data belum dimuat */
  value: number | null;
  format: (n: number) => string;
  note: string;
  /** Titik berdenyut: ada yang perlu ditindaklanjuti */
  alert?: boolean;
}) {
  const onGold = color === "bg-dash-primary";
  const shown = useCountUp(value);
  return (
    <div
      className={`${color} relative overflow-hidden rounded-card p-5 ${onGold ? "text-dash-ink" : "text-white"} min-h-[118px] flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover`}
    >
      <span className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
      {alert && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
      )}
      <p className="relative text-[13px] font-semibold opacity-90">{title}</p>
      <p className="relative text-2xl font-bold tabular-nums mt-2">{value === null ? "…" : format(shown)}</p>
      <p className="relative text-xs opacity-80 mt-1 tabular-nums">{note}</p>
    </div>
  );
}
