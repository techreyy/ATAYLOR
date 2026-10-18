import { apiDownload, apiFetch } from "@/core/api/client";
import type { IExecutiveRepository, ISpkRepository } from "@/core/repositories/spk.repository";
import type { SpkGate } from "@/core/types/order.types";
import type { DispatchInput, ExecutiveSummary, SpkDocument } from "@/core/types/production.types";

class ApiSpkAdapter implements ISpkRepository {
  async getSpkList() {
    return (await apiFetch<{ data: SpkDocument[] }>("/spk")).data;
  }

  async getSpk(id: string) {
    return (await apiFetch<{ data: SpkDocument }>(`/spk/${id}`)).data;
  }

  async getGate(orderId: string) {
    return (await apiFetch<{ data: SpkGate }>(`/orders/${orderId}/spk-gate`)).data;
  }

  async issueSpk(orderId: string) {
    return (await apiFetch<{ data: SpkDocument }>(`/orders/${orderId}/spk`, { method: "POST" })).data;
  }

  async dispatch(spkId: string, input: DispatchInput) {
    return (await apiFetch<{ data: SpkDocument }>(`/spk/${spkId}/dispatch`, { method: "PATCH", body: input })).data;
  }
}

class ApiExecutiveAdapter implements IExecutiveRepository {
  async getSummary(period: { from?: string; to?: string }) {
    return (await apiFetch<{ data: ExecutiveSummary }>("/executive/summary", { query: period })).data;
  }

  async downloadCsv(period: { from?: string; to?: string }) {
    await apiDownload("/executive/export.csv", `rekap-penjualan-${period.from}_${period.to}.csv`, period);
  }
}

export const spkRepository: ISpkRepository = new ApiSpkAdapter();
export const executiveRepository: IExecutiveRepository = new ApiExecutiveAdapter();
