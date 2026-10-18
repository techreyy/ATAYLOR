import type { Order } from "./order.types";

export interface WipHistory {
  id: string;
  orderId: string;
  orderCode?: string;
  fromStage: string | null;
  toStage: string;
  actorId?: string | null;
  actorName?: string | null;
  reasonNote?: string | null; // WAJIB JIKA MUNDUR/REWORK (BR-12)
  createdAt: string;
}

export interface SpkDocument {
  id: string;
  tenantId: string;
  orderId: string;
  spkNumber: string;
  issuedBy?: string | null;
  issuedAt: string;
  // Metadata dispatch — hanya Owner/Manager (BR-27)
  vendorName?: string | null;
  materialSentDate?: string | null;
  spkReceiver?: string | null;
  vendorDueDate?: string | null;
  dispatchedBy?: string | null;
  dispatchedAt?: string | null;
  order?: Order | null;
}

export interface DispatchInput {
  vendor_name: string;
  spk_receiver: string;
  material_sent_date: string;
  vendor_due_date: string;
}

export interface ExecutiveSummary {
  period: { from: string; to: string };
  generatedAt: string;
  kpi: { revenue: number; cashIn: number; totalOrders: number; confirmedOrders: number; outstanding: number };
  channels: { channel: "online" | "offline"; orders: number; revenue: number }[];
  statusDistribution: Record<string, number>;
  wipStages: Record<string, number>;
  bottleneckStage: string | null;
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  closerLeaderboard: { closerId: string; name: string; orders: number; revenue: number }[];
  definitions: Record<string, string>;
}
