"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { UserRole } from "@/lib/constants";
import { apiFetch, TOKEN_KEY, tokenStore } from "@/core/api/client";

const AUTOMATION_KEY = "ataylor_automation_mode";

export interface SessionUser {
  id: string;
  tenantId: string | null;
  tenantName?: string | null;
  name: string;
  email: string;
  role: UserRole;
}

interface RoleContextType {
  user: SessionUser | null;
  /** true setelah sesi dari token tersimpan selesai dicek */
  ready: boolean;
  activeRole: UserRole;
  /** Role Switcher demo: masuk ulang sebagai akun demo peran tsb. (token server baru) */
  setActiveRole: (role: UserRole) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Sakelar High/Low Season (BR-21) — masih MOCK, belum tersimpan ke tabel tenants
  automationMode: "high_on" | "low_off";
  toggleAutomationMode: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

type AuthResponse = { token: string; user: SessionUser };

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [automationMode, setAutomationMode] = useState<"high_on" | "low_off">("high_on");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(AUTOMATION_KEY) as "high_on" | "low_off" | null;
      if (savedMode) setAutomationMode(savedMode);
    } catch {
      /* abaikan */
    }

    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    apiFetch<{ user: SessionUser }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, []);

  // Token disimpan bersama oleh semua tab: bila tab lain login/ganti peran/keluar,
  // tab ini ikut memperbarui sesinya agar tampilan tidak basi (event `storage` hanya datang dari tab lain).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === null) {
        if (!tokenStore.get()) {
          setUser(null); // layout dashboard mengarahkan ke /login
          return;
        }
        apiFetch<{ user: SessionUser }>("/auth/me")
          .then((res) => setUser(res.user))
          .catch(() => setUser(null));
      }
      if (e.key === AUTOMATION_KEY && (e.newValue === "high_on" || e.newValue === "low_off")) {
        setAutomationMode(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const applyAuth = (res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
  };

  const setActiveRole = useCallback(async (role: UserRole) => {
    const old = tokenStore.get();
    const res = await apiFetch<AuthResponse>("/auth/demo-login", { method: "POST", body: { role } });
    if (old) {
      // cabut token lama agar tidak menumpuk
      apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    }
    applyAuth(res);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    applyAuth(await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }));
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    tokenStore.set(null);
    setUser(null);
  }, []);

  const toggleAutomationMode = () => {
    const next = automationMode === "high_on" ? "low_off" : "high_on";
    setAutomationMode(next);
    try {
      localStorage.setItem(AUTOMATION_KEY, next);
    } catch {
      /* abaikan */
    }
  };

  return (
    <RoleContext.Provider
      value={{
        user,
        ready,
        activeRole: user?.role ?? "admin",
        setActiveRole,
        login,
        logout,
        automationMode,
        toggleAutomationMode,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
