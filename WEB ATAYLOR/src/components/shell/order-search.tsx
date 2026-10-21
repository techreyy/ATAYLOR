"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import type { Order } from "@/core/types/order.types";
import { orderStatusMeta } from "@/lib/constants";

const MAX_RESULTS = 6;

/**
 * Pencarian cepat pesanan di navbar (kode ORD, nama pelanggan, atau closer).
 * Desktop: kolom selalu tampil, tombol "/" memfokuskan. HP: ikon kaca pembesar membuka panel.
 */
export function OrderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = query.trim();

  // Cari setelah berhenti mengetik 250 ms
  useEffect(() => {
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      orderRepository
        .getAllOrders({ q: term })
        .then((orders) => {
          if (cancelled) return;
          setResults(orders.slice(0, MAX_RESULTS));
          setFailed(false);
          setHighlight(0);
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  // Tutup saat pindah halaman
  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Klik di luar menutup; "/" memfokuskan kolom cari (kecuali sedang mengetik di kolom lain)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setMobileOpen(true);
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (order: Order) => {
    setQuery("");
    setResults(null);
    setOpen(false);
    setMobileOpen(false);
    router.push(`/orders/${order.id}`);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && results?.length) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp" && results?.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results?.[highlight]) {
      e.preventDefault();
      go(results[highlight]);
    }
  };

  const showPanel = open && term.length >= 2;

  return (
    <div ref={ref} className="relative">
      {/* HP: tombol ikon */}
      <button
        type="button"
        onClick={() => {
          setMobileOpen((o) => !o);
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="md:hidden p-2 rounded-lg text-dash-muted hover:text-dash-primary-strong hover:bg-dash-primary-soft transition-colors"
        aria-label="Cari pesanan"
      >
        <Search className="w-[18px] h-[18px]" />
      </button>

      <div
        className={cn(
          "md:block md:static md:w-72 lg:w-80",
          // HP: panel selebar layar di bawah navbar (fixed agar tidak terpotong di kiri)
          mobileOpen ? "block fixed inset-x-4 top-[72px] z-50 animate-slide-down" : "hidden"
        )}
      >
        <div className="relative">
          <Search className="w-4 h-4 text-dash-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKey}
            placeholder="Cari ORD-… atau nama pelanggan"
            aria-label="Cari pesanan"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="order-search-results"
            className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-dash-line bg-dash-bg focus:bg-white shadow-card md:shadow-none"
          />
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-dash-muted absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-dash-muted hover:text-dash-text"
              aria-label="Kosongkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 rounded border border-dash-line text-[10px] text-dash-muted font-mono">/</kbd>
          )}
        </div>

        {showPanel && (
          <div
            id="order-search-results"
            role="listbox"
            className="absolute left-0 right-0 md:left-auto md:right-auto md:w-full top-full mt-2 z-50 rounded-card bg-white shadow-card-hover border border-dash-line overflow-hidden animate-scale-in"
          >
            {failed ? (
              <p className="px-4 py-3 text-xs text-dash-muted">Gagal mencari. Coba lagi.</p>
            ) : results === null ? (
              <p className="px-4 py-3 text-xs text-dash-muted">Mencari…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-xs text-dash-muted">Tidak ada pesanan untuk “{term}”.</p>
            ) : (
              <ul className="py-1">
                {results.map((o, i) => {
                  const meta = orderStatusMeta(o.status);
                  return (
                    <li key={o.id} role="option" aria-selected={i === highlight}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => go(o)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                          i === highlight ? "bg-dash-hover" : "hover:bg-dash-hover"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-xs font-bold text-dash-text tabular-nums">{o.orderCode}</span>
                          <span className="block text-[11px] text-dash-muted truncate">{o.customerName}</span>
                        </span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
