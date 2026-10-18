"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "./role-context";
import { USER_ROLES, UserRole } from "@/lib/constants";
import { LogOut, UserCheck } from "lucide-react";

export function RoleSwitcher() {
  const router = useRouter();
  const { user, activeRole, setActiveRole, logout } = useRole();
  const [switching, setSwitching] = useState(false);

  const handleChange = async (role: UserRole) => {
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
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-xl bg-dash-bg p-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full bg-dash-primary text-dash-ink text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-dash-text truncate" title={user?.email}>
            {switching ? "Berganti sesi..." : user?.name}
          </p>
          <p className="text-[10px] text-dash-muted flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Aktor RBAC · Akun Demo
          </p>
        </div>
      </div>
      <select
        value={activeRole}
        disabled={switching}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        aria-label="Ganti peran demo"
        className="w-full bg-white border border-dash-line text-dash-text text-xs font-semibold rounded-lg px-2.5 py-2 cursor-pointer disabled:opacity-60"
      >
        {USER_ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label} ({r.badge})
          </option>
        ))}
      </select>
      <button
        onClick={handleLogout}
        className="mt-2 w-full text-[11px] font-semibold text-dash-muted hover:text-dash-danger flex items-center justify-center gap-1 transition-colors"
      >
        <LogOut className="w-3 h-3" /> Keluar
      </button>
    </div>
  );
}
