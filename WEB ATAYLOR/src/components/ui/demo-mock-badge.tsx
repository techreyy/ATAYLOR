import React from "react";
import { cn } from "@/lib/utils";
import { DEMO_MODE } from "@/lib/app-mode";

/**
 * Penanda fitur yang belum tersambung data asli.
 * Mode demo: `MOCK`. Mode fiks: "Tahap berikutnya" (sidebar memakai label pendek "Segera").
 */
export function DemoMockBadge({ className }: { className?: string }) {
  if (!DEMO_MODE) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-dash-primary-soft text-dash-primary-strong border border-dash-primary/30 text-[10px] font-semibold whitespace-nowrap",
          className
        )}
        title="Fitur ini masuk tahap pengembangan berikutnya; data yang tampil masih contoh dan belum tersimpan."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-dash-primary"></span>
        Tahap berikutnya
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F1F2F6] text-dash-muted border border-dash-line font-mono text-[10px] font-semibold uppercase tracking-wider",
        className
      )}
      title="Fitur ini disimulasikan menggunakan data lokal untuk keperluan demonstrasi"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-dash-muted/60"></span>
      MOCK
    </span>
  );
}
