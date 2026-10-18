import type { PaymentMethod, PaymentRecord, PaymentStatus } from "../types/payment.types";

export interface IPaymentRepository {
  getPayments(status?: PaymentStatus): Promise<PaymentRecord[]>;
  recordPayment(
    orderId: string,
    input: { method: PaymentMethod; amount: number; notes?: string; proof?: File | null },
  ): Promise<PaymentRecord>;
  validatePayment(paymentId: string, notes?: string): Promise<PaymentRecord>;
  rejectPayment(paymentId: string, notes: string): Promise<PaymentRecord>;
}
