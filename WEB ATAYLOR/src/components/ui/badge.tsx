import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "blue" // Brief Lengkap / Baru
  | "amber" // Menunggu ACC / Slot Lock 24j / Menunggu Bayar
  | "emerald" // Pembayaran Valid / SPK Terbit / Selesai
  | "red" // Revisi / Rework / Terlambat (SLA Breach)
  | "zinc" // WIP Produksi (Jahit/Bordir/QC)
  | "slate"; // Default fallback

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

// Badge pil Skydash (radius penuh) dengan warna semantik tema
export function Badge({ variant = "zinc", className, children, ...props }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    blue: "bg-[#E6F1FF] text-[#1F6FD6] border-[#CFE3FF]",
    amber: "bg-[#FFF6DB] text-[#A07A00] border-[#FFE9A8]",
    emerald: "bg-[#E8F6E8] text-[#3C8F3C] border-[#CDEBCD]",
    red: "bg-[#FFECEC] text-[#D93636] border-[#FFD3D3]",
    zinc: "bg-[#EFEEEA] text-[#3A3A3A] border-[#E0DED7]", // WIP produksi: arang lembut
    slate: "bg-[#F1F2F6] text-dash-muted border-dash-line",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
