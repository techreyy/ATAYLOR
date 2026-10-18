import { apiFetch } from "@/core/api/client";
import { UPLOAD_LIMITS_MB, prepareUpload } from "@/lib/image";
import type { IPaymentRepository } from "@/core/repositories/payment.repository";
import type { PaymentMethod, PaymentRecord, PaymentStatus } from "@/core/types/payment.types";

class ApiPaymentAdapter implements IPaymentRepository {
  async getPayments(status?: PaymentStatus) {
    return (await apiFetch<{ data: PaymentRecord[] }>("/payments", { query: { status } })).data;
  }

  async recordPayment(
    orderId: string,
    input: { method: PaymentMethod; amount: number; notes?: string; proof?: File | null },
  ) {
    const form = new FormData();
    form.append("method", input.method);
    form.append("amount", String(input.amount));
    if (input.notes) form.append("notes", input.notes);
    if (input.proof) form.append("proof", await prepareUpload(input.proof, UPLOAD_LIMITS_MB.paymentProof, "Bukti bayar"));
    return (await apiFetch<{ data: PaymentRecord }>(`/orders/${orderId}/payments`, { method: "POST", body: form })).data;
  }

  async validatePayment(paymentId: string, notes?: string) {
    return (await apiFetch<{ data: PaymentRecord }>(`/payments/${paymentId}/validate`, { method: "POST", body: { notes } })).data;
  }

  async rejectPayment(paymentId: string, notes: string) {
    return (await apiFetch<{ data: PaymentRecord }>(`/payments/${paymentId}/reject`, { method: "POST", body: { notes } })).data;
  }
}

export const paymentRepository: IPaymentRepository = new ApiPaymentAdapter();
