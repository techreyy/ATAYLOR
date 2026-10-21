import type { KanbanStageId } from "@/lib/constants";
import type { PaymentRecord } from "./payment.types";
import type { SpkDocument, WipHistory } from "./production.types";

export type OrderChannel = "online" | "offline";

export type SleeveType = "pendek" | "panjang";

export type OrderStatus =
  | "brief_lengkap"
  | "desain_dikerjakan"
  | "menunggu_acc"
  | "revisi"
  | "acc_disetujui"
  | "menunggu_pembayaran"
  | "pembayaran_valid"
  | "spk_terbit"
  | "produksi"
  | "menunggu_pelunasan"
  | "selesai"
  | "dibatalkan"
  | "kedaluwarsa"
  | "ditahan";

export type SlotLockStatus = "none" | "temp_24h" | "permanent" | "expired";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName?: string;
  skuCode?: string | null;
  color: string;
  sleeveType: SleeveType;
  size: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface DesignVersionInfo {
  id: string;
  versionNo: number;
  mockupUrl?: string | null;
  sentAt?: string | null;
  isPaidRevision: boolean;
  approval: { channel: "wa_button" | "manual_admin"; approvedAt: string; approvedByWa?: string | null } | null;
}

export type DesignTicketStatus = "baru" | "dikerjakan" | "menunggu_acc" | "revisi" | "selesai";

export interface DesignTicketInfo {
  id: string;
  orderId: string;
  status: DesignTicketStatus;
  designerName?: string | null;
  slaDueAt?: string | null;
  revisionCount: number;
  lastFeedback?: string | null;
  versions?: DesignVersionInfo[];
}

/** Tiket di board CRM Designer (`GET /design-tickets`): tiket + konteks pesanan. */
export interface DesignBoardTicket extends DesignTicketInfo {
  orderCode: string;
  orderStatus: OrderStatus;
  customerName: string;
  dueDate?: string | null;
  notes?: string | null;
  productName?: string | null;
  color?: string | null;
  totalQty: number;
  freeRevisionLimit: number;
  versions: DesignVersionInfo[];
}

export interface Order {
  id: string;
  tenantId: string;
  orderCode: string;
  customerName: string;
  customerWa: string;
  channel: OrderChannel;
  marketingCloserId?: string | null;
  marketingCloserName?: string | null;
  status: OrderStatus;
  wipStage: KanbanStageId | null;
  items: OrderItem[];
  totalAmount: number;
  dpRequired: number;
  paidAmount: number;
  remainingBalance: number;
  slotLockStatus: SlotLockStatus;
  slotLockExpiresAt?: string | null;
  revisionCount: number;
  dueDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentRecord[];
  designTicket?: DesignTicketInfo | null;
  spk?: SpkDocument | null;
  wipHistories?: WipHistory[];
  qcRecords?: { id: string; photoUrl: string; checkedAt: string }[];
}

export interface SpkGate {
  payment_valid: boolean;
  slot_permanent: boolean;
  design_approved: boolean;
  not_issued: boolean;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_wa: string;
  channel: OrderChannel;
  marketing_closer_id?: string | null;
  due_date: string;
  notes?: string;
  product_id: string;
  color: string;
  // Hanya ukuran dengan qty > 0; harga dihitung server dari katalog
  items: { sleeve_type: SleeveType; size: string; qty: number }[];
  // Harga custom per pcs per jenis lengan (opsional); yang tidak diisi memakai harga katalog
  custom_unit_prices?: Partial<Record<SleeveType, number>>;
}

export interface OrderFilters {
  q?: string;
  channel?: OrderChannel;
  status?: string;
  date_from?: string;
  date_to?: string;
}
