import type { KanbanStageId } from "@/lib/constants";
import type { Order } from "../types/order.types";
import type { WipHistory } from "../types/production.types";

export interface IKanbanRepository {
  getOrdersByStage(): Promise<Record<KanbanStageId, Order[]>>;
  moveStage(params: {
    orderId: string;
    targetStage: KanbanStageId;
    reasonNote?: string;
    qcPhoto?: File | null;
  }): Promise<Order>;
  getWipHistories(): Promise<WipHistory[]>;
}
