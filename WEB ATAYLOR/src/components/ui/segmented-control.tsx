import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Pilihan tunggal berbentuk pil (pola filter periode Executive). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-lg border border-dash-line p-0.5 bg-zinc-50", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.disabled ? "Sudah dipakai di varian lain" : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
              active ? "bg-dash-primary text-dash-ink shadow-primary" : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
