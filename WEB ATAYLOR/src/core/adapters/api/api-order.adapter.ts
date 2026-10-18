import { apiFetch } from "@/core/api/client";
import type { CatalogProductOption, CloserOption, IOrderRepository } from "@/core/repositories/order.repository";
import type { CreateOrderInput, Order, OrderFilters, SpkGate } from "@/core/types/order.types";

class ApiOrderAdapter implements IOrderRepository {
  async getAllOrders(filters: OrderFilters = {}) {
    const res = await apiFetch<{ data: Order[] }>("/orders", { query: { ...filters } });
    return res.data;
  }

  async getOrderById(id: string) {
    const res = await apiFetch<{ data: Order; spkGate: SpkGate }>(`/orders/${encodeURIComponent(id)}`);
    return { order: res.data, spkGate: res.spkGate };
  }

  async createOrder(input: CreateOrderInput) {
    const res = await apiFetch<{ data: Order }>("/orders", { method: "POST", body: input });
    return res.data;
  }

  async getProducts() {
    return (await apiFetch<{ data: CatalogProductOption[] }>("/products")).data;
  }

  async getClosers() {
    return (await apiFetch<{ data: CloserOption[] }>("/marketing-closers")).data;
  }

  async sendDesignVersion(orderId: string, mockup?: File | null) {
    const form = new FormData();
    if (mockup) form.append("mockup", mockup);
    return apiFetch<{ message: string; isPaidRevision: boolean }>(`/orders/${orderId}/design-versions`, {
      method: "POST",
      body: form,
    });
  }

  async approveDesign(versionId: string, channel: "manual_admin" | "wa_button") {
    return apiFetch<{ message: string }>(`/design-versions/${versionId}/approve`, {
      method: "POST",
      body: { channel },
    });
  }

  async requestRevision(versionId: string, feedback: string) {
    return apiFetch<{ message: string }>(`/design-versions/${versionId}/request-revision`, {
      method: "POST",
      body: { feedback },
    });
  }
}

export const orderRepository: IOrderRepository = new ApiOrderAdapter();
