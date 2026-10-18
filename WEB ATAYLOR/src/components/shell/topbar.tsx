"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";

export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname();

  const getBreadcrumbTitle = () => {
    if (pathname === "/") return "Ringkasan Sistem";
    if (pathname.startsWith("/orders")) return "OMS / Pesanan";
    if (pathname.startsWith("/payments")) return "Kasir & Pembayaran";
    if (pathname.startsWith("/production/kanban")) return "Kanban WIP Produksi";
    if (pathname.startsWith("/production/spk")) return "SPK & Dispatch";
    if (pathname.startsWith("/executive")) return "Executive Dashboard";
    if (pathname.startsWith("/designer")) return "CRM Designer";
    if (pathname.startsWith("/inventory")) return "Inventory Gudang";
    if (pathname.startsWith("/ai-training")) return "AI Training & Katalog";
    if (pathname.startsWith("/agent-playground")) return "Chatbot & Mini Agent";
    if (pathname.startsWith("/platform")) return "Platform & White-Label";
    return "A-Taylor Dashboard";
  };

  return (
    <header className="h-[64px] bg-white shadow-navbar px-4 md:px-6 flex items-center justify-between print:hidden shrink-0 z-10">
      {/* Toggle sidebar + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-dash-muted hover:text-dash-primary-strong hover:bg-dash-primary-soft transition-colors"
          aria-label="Ciutkan / lebarkan menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-[13px] text-dash-muted min-w-0">
          <span className="font-semibold hidden sm:inline">A-Taylor</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#C3C7D6] hidden sm:inline" />
          <span className="font-bold text-dash-text truncate">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* Action / Indicators */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notification Bell */}
        <div className="relative p-2 text-dash-muted hover:text-dash-primary-strong hover:bg-dash-primary-soft rounded-lg cursor-pointer transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-dash-primary ring-2 ring-white">
            <span className="absolute inset-0 rounded-full bg-dash-primary animate-ping opacity-60" />
          </span>
        </div>
      </div>
    </header>
  );
}
