import React from "react";
import { cn } from "@/lib/utils";

/** Sakelar on/off dengan label. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-start gap-2.5 select-none", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-dash-primary" : "bg-zinc-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-4"
          )}
        />
      </button>
      <span>
        <span className="block text-xs font-semibold text-zinc-700">{label}</span>
        {description && <span className="block text-[11px] text-dash-muted">{description}</span>}
      </span>
    </label>
  );
}
