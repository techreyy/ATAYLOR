"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "./role-context";
import { USER_ROLES, UserRole } from "@/lib/constants";
import { Check, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { DEMO_MODE } from "@/lib/app-mode";

// Ganti peran hanya di mode demo (lib/app-mode.ts)

/** Profil ringkas di sidebar: inisial, nama, peran. Klik untuk menu Keluar (+ ganti peran saat demo). */
export function RoleSwitcher() {
  const router = useRouter();
  const { user, activeRole, setActiveRole, logout } = useRole();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const roleInfo = USER_ROLES.find((r) => r.id === activeRole);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const handleChange = async (role: UserRole) => {
    setOpen(false);
    if (role === activeRole) return;
    setSwitching(true);
    try {
      await setActiveRole(role);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = (user?.name ?? "?")
    .split(" ")
    .filter((w) => w && !w.endsWith(".")) // lewati gelar seperti "H."
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-dash-bg"
      >
        <span className="w-8 h-8 rounded-full bg-dash-primary text-dash-ink text-[11px] font-bold flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-dash-text truncate" title={user?.email}>
            {switching ? "Berganti peran..." : user?.name}
          </span>
          <span className="block text-[11px] text-dash-muted truncate">{roleInfo?.label}</span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-dash-muted shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white shadow-card-hover border border-dash-line p-1.5 animate-scale-in">
          {DEMO_MODE && (
            <>
              <div className="px-2 pt-1 pb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dash-muted">Masuk sebagai</span>
                <DemoMockBadge />
              </div>
              {USER_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="menuitem"
                  disabled={switching}
                  onClick={() => handleChange(r.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors",
                    r.id === activeRole ? "bg-dash-primary-soft text-dash-primary-strong font-bold" : "text-dash-text hover:bg-dash-hover"
                  )}
                >
                  {r.label}
                  {r.id === activeRole && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
              <div className="my-1.5 border-t border-dash-line" />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-dash-muted hover:bg-dash-hover hover:text-dash-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
