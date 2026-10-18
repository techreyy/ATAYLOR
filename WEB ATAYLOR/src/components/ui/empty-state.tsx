import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Tidak ada data ditemukan",
  description = "Belum ada catatan transaksi pada filter atau kriteria ini.",
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-card border border-dashed border-[#D9DCEC] bg-dash-bg/60 animate-fade-in",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-dash-primary-soft flex items-center justify-center text-dash-primary-strong mb-3">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h4 className="text-sm font-bold text-dash-text mb-0.5">{title}</h4>
      <p className="text-xs text-dash-muted max-w-sm mb-3">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
