import { apiFetch } from "@/core/api/client";
import type { IKanbanRepository } from "@/core/repositories/kanban.repository";
import type { Order } from "@/core/types/order.types";
import type { WipHistory } from "@/core/types/production.types";
import type { KanbanStageId } from "@/lib/constants";
import { UPLOAD_LIMITS_MB, prepareUpload } from "@/lib/image";

class ApiKanbanAdapter implements IKanbanRepository {
  async getOrdersByStage() {
    return (await apiFetch<{ data: Record<KanbanStageId, Order[]> }>("/kanban")).data;
  }

  async moveStage(params: { orderId: string; targetStage: KanbanStageId; reasonNote?: string; qcPhoto?: File | null }) {
    const form = new FormData();
    form.append("target_stage", params.targetStage);
    if (params.reasonNote) form.append("reason_note", params.reasonNote);
    if (params.qcPhoto) form.append("qc_photo", await prepareUpload(params.qcPhoto, UPLOAD_LIMITS_MB.qcPhoto, "Foto QC"));
    return (await apiFetch<{ data: Order }>(`/orders/${params.orderId}/move-stage`, { method: "POST", body: form })).data;
  }

  async getWipHistories() {
    return (await apiFetch<{ data: WipHistory[] }>("/kanban/histories")).data;
  }
}

export const kanbanRepository: IKanbanRepository = new ApiKanbanAdapter();
