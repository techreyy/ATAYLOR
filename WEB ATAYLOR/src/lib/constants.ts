import type { BadgeVariant } from "@/components/ui/badge";

export type UserRole = "admin" | "owner" | "manager" | "designer" | "super_admin";

export interface RoleInfo {
  id: UserRole;
  label: string;
  badge: string;
  description: string;
}

export const USER_ROLES: RoleInfo[] = [
  { id: "admin", label: "Admin Sentral", badge: "Admin", description: "Kelola OMS, Kasir, Kanban, dan Terbitkan SPK" },
  { id: "owner", label: "Owner (A-Taylor)", badge: "Owner", description: "Executive Dashboard, Audit Log & Dispatch" },
  { id: "manager", label: "Production Manager", badge: "Manager", description: "Pantau Kanban WIP & Dispatch Vendor" },
  { id: "designer", label: "Apparel Designer", badge: "Designer", description: "Board Tiket Desain, SLA & Mockup" },
  { id: "super_admin", label: "Super Admin Platform", badge: "Platform", description: "Konfigurasi Multi-Tenant & White-Label" },
];

/** Urutan resmi Kanban WIP (BR-12) — id sama persis dengan `orders.wip_stage` di backend. */
export const KANBAN_STAGES = [
  { id: "antrean", label: "Antrean", step: 1 },
  { id: "proses_jahit", label: "Proses Jahit", step: 2 },
  { id: "proses_bordir_sablon", label: "Proses Bordir/Sablon", step: 3 },
  { id: "qc_pabrik", label: "QC Pabrik", step: 4 },
  { id: "tiba_di_gudang", label: "Tiba di Gudang Toko (QC Selesai)", step: 5 },
] as const;

export type KanbanStageId = (typeof KANBAN_STAGES)[number]["id"];

export function stageLabel(id: string | null | undefined): string {
  return KANBAN_STAGES.find((s) => s.id === id)?.label ?? (id || "-");
}

/** Siklus status pesanan (AI_GUA.md §2.7). */
export const ORDER_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  brief_lengkap: { label: "Brief Lengkap", variant: "blue" },
  desain_dikerjakan: { label: "Desain Dikerjakan", variant: "blue" },
  menunggu_acc: { label: "Menunggu ACC", variant: "amber" },
  revisi: { label: "Revisi Desain", variant: "red" },
  acc_disetujui: { label: "ACC Disetujui", variant: "amber" },
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "amber" },
  pembayaran_valid: { label: "Pembayaran Valid", variant: "emerald" },
  spk_terbit: { label: "SPK Terbit", variant: "emerald" },
  produksi: { label: "WIP Produksi", variant: "zinc" },
  menunggu_pelunasan: { label: "Menunggu Pelunasan", variant: "amber" },
  selesai: { label: "Selesai", variant: "emerald" },
  dibatalkan: { label: "Dibatalkan", variant: "red" },
  kedaluwarsa: { label: "Slot Kedaluwarsa", variant: "red" },
  ditahan: { label: "Ditahan", variant: "slate" },
};

export function orderStatusMeta(status: string) {
  return ORDER_STATUS_META[status] ?? { label: status, variant: "slate" as BadgeVariant };
}

/** Ukuran baku form pesanan — sama dengan `OrderItem::SIZES` di backend. */
export const ORDER_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"] as const;

/** Jenis lengan — id sama dengan `order_items.sleeve_type`. */
export const SLEEVE_TYPES = [
  { id: "pendek", label: "Lengan Pendek" },
  { id: "panjang", label: "Lengan Panjang" },
] as const;

export function sleeveLabel(id: string | null | undefined): string {
  return SLEEVE_TYPES.find((s) => s.id === id)?.label ?? SLEEVE_TYPES[0].label;
}
