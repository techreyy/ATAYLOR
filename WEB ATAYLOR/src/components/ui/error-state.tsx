import React from "react";
import { AlertTriangle, Lock, WifiOff } from "lucide-react";
import { ApiError } from "@/core/api/client";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/** State error halaman: membedakan akses ditolak (403), server mati, dan error lain. */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null;
  const forbidden = apiError?.status === 403;
  const offline = apiError?.code === "NETWORK";
  const Icon = forbidden ? Lock : offline ? WifiOff : AlertTriangle;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-card border bg-white animate-fade-in-up",
        forbidden ? "border-amber-200" : "border-red-200",
        className
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-full border flex items-center justify-center mb-3",
          forbidden ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-dash-danger-soft border-dash-danger-line text-dash-danger-strong"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-xs font-semibold text-zinc-800 mb-0.5">
        {forbidden ? "Akses Ditolak untuk Peran Ini" : offline ? "Server Tidak Terjangkau" : "Gagal Memuat Data"}
      </h4>
      <p className="text-[11px] text-zinc-500 max-w-md mb-3">
        {apiError?.message ?? (error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.")}
      </p>
      {onRetry && !forbidden && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

/** Notifikasi inline untuk hasil aksi (sukses / pelanggaran aturan bisnis). */
export function Notice({
  tone,
  children,
  onClose,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 animate-slide-down",
        tone === "success" ? "bg-[#E8F6E8] border-[#CDEBCD] text-[#2F7A2F]" : "bg-dash-danger-soft border-dash-danger-line text-dash-danger-strong"
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="font-medium">{children}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100 shrink-0" aria-label="Tutup">
          ×
        </button>
      )}
    </div>
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const firstField = err.fieldErrors ? Object.values(err.fieldErrors)[0]?.[0] : undefined;
    // Kode aturan (BR-xx) tetap ada di err.code untuk log, tidak ditampilkan ke staf
    return firstField ?? err.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan.";
}
