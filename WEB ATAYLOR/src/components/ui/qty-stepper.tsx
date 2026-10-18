import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Input bilangan bulat ≥ 0 dengan label di atas dan tombol −/+ (nyaman di HP). */
export function QtyStepper({
  id,
  label,
  value,
  onChange,
  max = 100000,
  className,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  className?: string;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(max, Math.trunc(n))));
  const btnCls =
    "h-7 w-6 md:w-7 shrink-0 inline-flex items-center justify-center rounded-md border border-dash-line bg-white text-dash-muted hover:border-dash-primary hover:text-dash-primary-strong disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <label htmlFor={id} className="text-[11px] font-bold text-zinc-700">
        {label}
      </label>
      <div className="flex items-center gap-0.5 md:gap-1 w-full">
        <button type="button" className={btnCls} onClick={() => set(value - 1)} disabled={value <= 0} aria-label={`Kurangi ${label}`}>
          <Minus className="w-3 h-3" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            set(Number.isNaN(n) ? 0 : n);
          }}
          className={cn(
            "min-w-0 flex-1 h-7 px-1 text-center text-xs font-mono tabular-nums rounded-md border border-dash-line bg-white",
            value > 0 ? "font-bold text-zinc-900" : "text-zinc-400"
          )}
        />
        <button type="button" className={btnCls} onClick={() => set(value + 1)} disabled={value >= max} aria-label={`Tambah ${label}`}>
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
