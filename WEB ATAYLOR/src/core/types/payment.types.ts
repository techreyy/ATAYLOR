export type PaymentMethod = "cash" | "transfer";
export type PaymentStatus = "pending" | "valid" | "rejected";

export interface PaymentRecord {
  id: string;
  tenantId: string;
  orderId: string;
  orderCode?: string;
  customerName?: string;
  method: PaymentMethod;
  amount: number;
  proofUrl?: string | null;
  status: PaymentStatus;
  recordedBy?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}
