import { apiFetch } from "@/core/api/client";
import type { IDesignRepository } from "@/core/repositories/design.repository";
import type { DesignBoardTicket } from "@/core/types/order.types";

class ApiDesignAdapter implements IDesignRepository {
  async getBoard() {
    return (await apiFetch<{ data: DesignBoardTicket[] }>("/design-tickets")).data;
  }

  async startTicket(ticketId: string) {
    return apiFetch<{ message: string }>(`/design-tickets/${ticketId}/start`, { method: "POST" });
  }
}

export const designRepository: IDesignRepository = new ApiDesignAdapter();
