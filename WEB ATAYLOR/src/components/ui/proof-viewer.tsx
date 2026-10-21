"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, FileText, ImageOff, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

function isPdf(url: string) {
  try {
    return new URL(url, window.location.href).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}

/**
 * Pratinjau bukti bayar: foto tampil sebagai thumbnail dan bisa diperbesar tanpa pindah tab.
 * PDF dibuka di tab baru. Tautan berkas bertanda tangan kedaluwarsa 30 menit — bila gagal dimuat, minta muat ulang halaman.
 */
export function ProofThumb({ url, label, className }: { url?: string | null; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const box = cn("w-20 h-20 shrink-0 rounded-lg border border-dash-line overflow-hidden", className);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  if (!url) {
    return (
      <div className={cn(box, "border-dashed bg-zinc-50 flex flex-col items-center justify-center gap-1 text-dash-muted")}>
        <ImageOff className="w-4 h-4" />
        <span className="text-[10px] leading-tight text-center px-1">Tanpa bukti</span>
      </div>
    );
  }

  if (broken || isPdf(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(box, "bg-zinc-50 flex flex-col items-center justify-center gap-1 text-dash-primary-strong hover:bg-dash-primary-soft transition-colors")}
        title={broken ? "Pratinjau gagal dimuat — muat ulang halaman bila tautan kedaluwarsa" : "Buka PDF bukti bayar"}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px] font-semibold">{broken ? "Buka file" : "PDF"}</span>
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(box, "relative group bg-zinc-50")} aria-label={`Perbesar ${label}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- berkas privat bertanda tangan dari API, bukan aset statis */}
        <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setBroken(true)} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-3xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 mb-2 text-white">
              <span className="text-xs font-semibold truncate">{label}</span>
              <div className="flex items-center gap-1 shrink-0">
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs hover:bg-white/15">
                  <ExternalLink className="w-3.5 h-3.5" /> Tab baru
                </a>
                <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15" aria-label="Tutup">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="w-full max-h-[80vh] object-contain rounded-card bg-white" />
          </div>
        </div>
      )}
    </>
  );
}
