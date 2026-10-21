"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  CreditCard,
  Kanban,
  FileText,
  BarChart3,
  BotMessageSquare,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { BrandLogo, BrandWordmark } from "@/components/logo";
import { useRole } from "@/components/shell/role-context";
import { USER_ROLES } from "@/lib/constants";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { Order } from "@/core/types/order.types";
import { formatRupiah } from "@/lib/currency";

export default function DashboardOverviewPage() {
  const { activeRole, user } = useRole();
  const currentRole = USER_ROLES.find((r) => r.id === activeRole);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    // Super Admin tidak mengakses data bisnis tenant (SRS §2.3)
    if (activeRole === "super_admin") return;
    orderRepository.getAllOrders().then(setOrders).catch(() => setOrders([]));
  }, [activeRole]);

  const active = (orders ?? []).filter((o) => !["selesai", "dibatalkan"].includes(o.status));
  const totalOmzet = active.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalPaid = (orders ?? []).reduce((acc, o) => acc + o.paidAmount, 0);
  const wipCount = (orders ?? []).filter((o) => o.status === "produksi" || o.status === "spk_terbit").length;
  const lockedCount = (orders ?? []).filter((o) => o.slotLockStatus === "temp_24h").length;
  const fmt = (n: string) => (orders === null ? "…" : n);
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
            {currentRole?.label} · Semua sistem berjalan normal.{" "}
            {lockedCount > 0 && (
              <span className="text-dash-primary-strong font-semibold">{lockedCount} slot menunggu validasi DP.</span>
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
          <span className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-dash-primary/30" />
          <span className="absolute right-16 bottom-[-50px] w-36 h-36 rounded-full bg-dash-charcoal/10" />
          <span className="absolute left-[45%] top-8 w-4 h-4 rounded-full bg-dash-warning/70 animate-pulse" />
          <div className="relative flex items-center gap-2">
            <div className="flex items-center justify-center shrink-0">
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
              <KpiTile color="bg-dash-primary" title="Nilai Pesanan Aktif" value={fmt(formatRupiah(totalOmzet))} note={fmt(`${active.length} pesanan aktif`)} />
              <KpiTile color="bg-dash-charcoal" title="Pembayaran Tervalidasi" value={fmt(formatRupiah(totalPaid))} note="Verifikasi manual Admin" />
            </>
          )}
          <KpiTile color="bg-dash-tale" title="WIP Lantai Produksi" value={fmt(`${wipCount} Order`)} note="Antrean s.d. QC Pabrik" />
          <KpiTile color="bg-dash-light-danger" title="Slot Lock 24 Jam" value={fmt(`${lockedCount} Order`)} note="Menunggu validasi DP" />
        </div>
      </div>

      {/* Grid Quick Navigation to 11 Modules */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <div>
            <CardTitle>
              Modul Operasional (Sesuai Spesifikasi SSOT)
            </CardTitle>
          </div>
          <span className="text-[11px] font-mono text-dash-muted">11 Modul</span>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Slice 1: OMS */}
            <Link
              href="/orders"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </span>
                <Badge variant="emerald">Slice 1</Badge>
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">OMS / Pesanan</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                Pencatatan order online WA & offline toko (wajib Closer). Hitung otomatis DP 50%.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Buka Pesanan</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            {/* Slice 1: Kasir */}
            <Link
              href="/payments"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
                <Badge variant="emerald">Slice 1</Badge>
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">Kasir & Pembayaran</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                Validasi bukti transfer manual, kunci kuota permanen, dan timer Slot Locking 24 jam.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Validasi Kasir</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            {/* Slice 2: Kanban */}
            <Link
              href="/production/kanban"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <Kanban className="w-3.5 h-3.5" />
                </span>
                <Badge variant="zinc">Slice 2</Badge>
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">Kanban WIP Produksi</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                5 tahap resmi konveksi. Aturan invarian: maju 1 tahap, rework wajib alasan tertulis.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Kelola Kanban</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            {/* Slice 3: SPK */}
            <Link
              href="/production/spk"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <Badge variant="amber">Slice 3</Badge>
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">SPK & Dispatch</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                Gate validasi ketat penerbitan SPK Final (PDF bernomor unik) & form dispatch vendor.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Cetak & Dispatch</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            {/* Slice 4: Executive */}
            <Link
              href="/executive"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
                <Badge variant="blue">Slice 4</Badge>
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">Executive Dashboard</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                Agregasi omzet, perbandingan kanal, bottleneck produksi, dan ekspor CSV / PDF.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Lihat Metrik</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            {/* Modul Mock: Chatbot Playground */}
            <Link
              href="/agent-playground"
              className="p-3.5 rounded-lg border border-zinc-200 hover:border-dash-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-dash-primary group-hover:text-dash-ink transition-colors">
                  <BotMessageSquare className="w-3.5 h-3.5" />
                </span>
                <DemoMockBadge />
              </div>
              <h4 className="font-semibold text-xs text-zinc-900">Chatbot & Mini Agent</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                Simulasi percakapan WA pelanggan, ringkasan brief otomatis, dan kartu proofing ACC.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-medium mt-2.5 group-hover:text-zinc-950">
                <span>Simulasi Chatbot</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ color, title, value, note }: { color: string; title: string; value: string; note: string }) {
  const onGold = color === "bg-dash-primary";
  return (
    <div
      className={`${color} relative overflow-hidden rounded-card p-5 ${onGold ? "text-dash-ink" : "text-white"} min-h-[118px] flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover`}
    >
      <span className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
      <p className="relative text-[13px] font-semibold opacity-90">{title}</p>
      <p className="relative text-2xl font-bold tabular-nums mt-2">{value}</p>
      <p className="relative text-xs opacity-80 mt-1 tabular-nums">{note}</p>
    </div>
  );
}
