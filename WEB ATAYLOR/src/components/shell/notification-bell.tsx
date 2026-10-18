"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationRepository } from "@/core/adapters/api/api-notification.adapter";
import type { NotificationFeed, NotificationSeverity } from "@/core/types/notification.types";

const REFRESH_MS = 60_000;

const DOT: Record<NotificationSeverity, string> = {
  danger: "bg-dash-danger",
  warning: "bg-dash-warning",
  info: "bg-dash-info",
};

/** Lonceng navbar: daftar hal yang perlu ditindaklanjuti sesuai peran (data live dari server). */
export function NotificationBell() {
  const pathname = usePathname();
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    notificationRepository
      .getFeed()
      .then((f) => {
        setFeed(f);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  // Muat ulang saat pindah halaman (aksi baru saja selesai) dan berkala
  useEffect(() => {
    load();
    setOpen(false);
  }, [pathname, load]);

  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const total = feed?.total ?? 0;
  const urgent = feed?.urgent ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) load();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={total > 0 ? `Notifikasi: ${total} perlu ditindaklanjuti` : "Notifikasi"}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open ? "text-dash-primary-strong bg-dash-primary-soft" : "text-dash-muted hover:text-dash-primary-strong hover:bg-dash-primary-soft"
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {total > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full ring-2 ring-white text-[10px] font-bold leading-[18px] text-center tabular-nums",
              urgent > 0 ? "bg-dash-danger text-white" : "bg-dash-primary text-dash-ink"
            )}
          >
            {total > 9 ? "9+" : total}
            {urgent > 0 && <span className="absolute inset-0 rounded-full bg-dash-danger animate-ping opacity-40" />}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Perlu ditindaklanjuti"
          className="absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-card bg-white shadow-card-hover border border-dash-line animate-scale-in overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-dash-line flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-bold text-dash-text">Perlu Ditindaklanjuti</p>
              <p className="text-[11px] text-dash-muted tabular-nums">
                {feed ? (total > 0 ? `${total} item${urgent > 0 ? ` · ${urgent} mendesak` : ""}` : "Semua beres") : "Memuat..."}
              </p>
            </div>
            <button type="button" onClick={load} className="p-1.5 rounded-md text-dash-muted hover:bg-dash-hover hover:text-dash-primary-strong" aria-label="Muat ulang notifikasi">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {failed && !feed ? (
              <div className="p-4 text-xs text-dash-muted text-center">
                Gagal memuat notifikasi.{" "}
                <button type="button" onClick={load} className="font-semibold text-dash-primary-strong hover:underline">
                  Coba lagi
                </button>
              </div>
            ) : !feed ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : feed.items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-dash-success mx-auto mb-2" />
                <p className="text-xs text-dash-muted">Tidak ada yang perlu ditindaklanjuti.</p>
              </div>
            ) : (
              <ul className="divide-y divide-dash-line">
                {feed.items.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-2.5 hover:bg-dash-hover transition-colors">
                      <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", DOT[n.severity])} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-bold text-dash-text">{n.title}</span>
                          <span className="font-mono text-[10px] text-dash-muted tabular-nums">{n.orderCode}</span>
                        </span>
                        <span className="block text-[11px] text-dash-muted leading-snug tabular-nums">{n.message}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {feed && total > feed.items.length && (
            <p className="px-4 py-2 border-t border-dash-line text-[11px] text-dash-muted tabular-nums">
              Menampilkan {feed.items.length} dari {total} item paling mendesak.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
