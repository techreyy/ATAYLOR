import React from "react";
import { cn } from "@/lib/utils";

export function DemoMockBadge({ className }: { className?: string }) {
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
