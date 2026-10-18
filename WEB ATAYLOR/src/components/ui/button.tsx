import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "cobalt" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  // Gaya tombol Skydash dengan emas logo: teks gelap di atas emas, sudut lembut, efek angkat saat hover
  const variantStyles = {
    primary:
      "bg-dash-primary text-dash-ink hover:bg-dash-primary-hover hover:shadow-primary active:bg-dash-primary-hover border border-dash-primary",
    cobalt:
      "bg-dash-primary text-dash-ink hover:bg-dash-primary-hover hover:shadow-primary active:bg-dash-primary-hover border border-dash-primary",
    secondary: "bg-dash-primary-soft text-dash-primary-strong hover:bg-[#FFEDB0] border border-transparent",
    outline: "border border-dash-line bg-white text-dash-muted hover:border-dash-primary hover:text-dash-primary-strong hover:bg-dash-primary-soft/40",
    danger: "bg-dash-danger text-white hover:bg-[#e63c3c] hover:shadow-[0_8px_18px_-8px_rgba(255,71,71,0.55)] border border-dash-danger",
    ghost: "text-dash-muted hover:bg-dash-hover hover:text-dash-primary-strong",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-md",
    md: "px-4 py-2 text-xs font-semibold rounded-lg",
    lg: "px-5 py-2.5 text-sm font-semibold rounded-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-primary/40 disabled:opacity-50 disabled:pointer-events-none gap-2 select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
