"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useRole } from "@/components/shell/role-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("ataylor_sidebar_collapsed") === "1");
    } catch {
      /* abaikan */
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("ataylor_sidebar_collapsed", c ? "0" : "1");
      } catch {
        /* abaikan */
      }
      return !c;
    });
  };

  if (!ready || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-dash-bg">
        <div className="space-y-3 w-72 animate-fade-in">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dash-bg">
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          {/* key: ganti peran / pindah halaman => konten masuk dengan animasi & data dimuat ulang */}
          <div key={`${user.id}-${pathname}`} className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
