import type { DesignBoardTicket } from "../types/order.types";

export interface IDesignRepository {
  /** Tiket desain berjalan (SLA terdekat dulu) + tiket selesai terbaru. */
  getBoard(): Promise<DesignBoardTicket[]>;
  /** Designer mengambil tiket baru (BR-04) → pesanan menjadi "Desain Dikerjakan". */
  startTicket(ticketId: string): Promise<{ message: string }>;
}
