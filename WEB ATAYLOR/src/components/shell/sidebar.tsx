"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  CreditCard,
  Kanban,
  FileText,
  BarChart3,
  Palette,
  Boxes,
  Cpu,
  BotMessageSquare,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleSwitcher } from "./role-switcher";
import { BrandLogo, BrandWordmark } from "@/components/logo";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  section: "Transaksi & Operasi" | "Produksi & Dispatch" | "Analitik & Desain" | "AI & Konfigurasi";
  mock?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // 1. Core Shell
  { name: "Ringkasan Sistem", href: "/", icon: LayoutDashboard, section: "Transaksi & Operasi" },
  // 2. OMS
  { name: "OMS / Pesanan", href: "/orders", icon: ShoppingBag, section: "Transaksi & Operasi" },
  // 3. Kasir
  { name: "Kasir & Pembayaran", href: "/payments", icon: CreditCard, section: "Transaksi & Operasi" },

  // 4. Kanban WIP
  { name: "Kanban WIP", href: "/production/kanban", icon: Kanban, section: "Produksi & Dispatch" },
  // 5. SPK
  { name: "SPK & Dispatch", href: "/production/spk", icon: FileText, section: "Produksi & Dispatch" },

  // 6. Executive
  { name: "Executive Dashboard", href: "/executive", icon: BarChart3, section: "Analitik & Desain" },
  // 7. CRM Designer
  { name: "CRM Designer", href: "/designer", icon: Palette, section: "Analitik & Desain", mock: true },
  // 8. Inventory
  { name: "Inventory Gudang", href: "/inventory", icon: Boxes, section: "Analitik & Desain", mock: true },

  // 9. AI Training
  { name: "AI Training & Katalog", href: "/ai-training", icon: Cpu, section: "AI & Konfigurasi" },
  // 10. Chatbot Playground
  { name: "Chatbot & Mini Agent", href: "/agent-playground", icon: BotMessageSquare, section: "AI & Konfigurasi", mock: true },
  // 11. Platform
  { name: "Platform & Tenant", href: "/platform", icon: ShieldCheck, section: "AI & Konfigurasi", mock: true },
];

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
}: {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const sections: NavItem["section"][] = [
    "Transaksi & Operasi",
    "Produksi & Dispatch",
    "Analitik & Desain",
    "AI & Konfigurasi",
  ];

  return (
    <>
      {/* Latar gelap drawer HP */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] animate-fade-in lg:hidden print:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={cn(
          "bg-white text-dash-muted flex flex-col h-screen shadow-sidebar print:hidden select-none shrink-0 transition-[width,transform] duration-300 ease-out",
          "fixed inset-y-0 left-0 z-40 w-[250px] lg:static lg:z-20 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[78px]"
        )}
      >
        {/* Brand Header */}
        <div className="h-[64px] px-5 flex items-center gap-1 shrink-0">
          <div className="flex items-center justify-center shrink-0">
            <BrandLogo size="sm" priority />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <BrandWordmark height={34} priority />
            </div>
          )}
        </div>
  
        {/* Role Switcher Demo Box */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <RoleSwitcher />
          </div>
        )}
  
        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sections.map((section) => (
            <div key={section}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A6ACBE]">
                  {section}
                </div>
              )}
              <nav className="space-y-1">
                {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg text-[13px] font-semibold transition-all duration-200 ease-out group",
                        collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-dash-primary text-dash-ink shadow-primary"
                          : "text-dash-muted hover:bg-dash-primary hover:text-dash-ink hover:translate-x-0.5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "w-[17px] h-[17px] transition-transform duration-200 group-hover:scale-110",
                            isActive ? "text-dash-ink" : "text-dash-muted group-hover:text-dash-ink"
                          )}
                        />
                        {!collapsed && <span>{item.name}</span>}
                      </div>
                      {item.mock && !collapsed && (
                        <span
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-px rounded-full border transition-colors",
                            isActive
                              ? "bg-black/10 text-dash-ink border-black/15"
                              : "bg-[#F1F2F6] text-dash-muted border-dash-line group-hover:bg-black/10 group-hover:text-dash-ink group-hover:border-black/15"
                          )}
                        >
                          MOCK
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
  
        {/* Bottom Tenant Footnote */}
        {!collapsed && (
          <div className="m-3 p-3 rounded-xl bg-dash-bg text-[11px] text-dash-muted flex items-center justify-between">
            <div>
              <span>Tenant: </span>
              <span className="text-dash-primary-strong font-bold">A-Taylor</span>
            </div>
            <div className="font-mono text-[10px]">v1.0</div>
          </div>
        )}
      </aside>
    </>
  );
}
