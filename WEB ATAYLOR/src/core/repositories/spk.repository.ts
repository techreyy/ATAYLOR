import type { SpkGate } from "../types/order.types";
import type { DispatchInput, ExecutiveSummary, SpkDocument } from "../types/production.types";

export interface ISpkRepository {
  getSpkList(): Promise<SpkDocument[]>;
  getSpk(id: string): Promise<SpkDocument>;
  getGate(orderId: string): Promise<SpkGate>;
  issueSpk(orderId: string): Promise<SpkDocument>;
  dispatch(spkId: string, input: DispatchInput): Promise<SpkDocument>;
}

export interface IExecutiveRepository {
  getSummary(period: { from?: string; to?: string }): Promise<ExecutiveSummary>;
  downloadCsv(period: { from?: string; to?: string }): Promise<void>;
  // Excel: rincian item + kolom kosong biaya produksi untuk diisi manual
  downloadExcel(period: { from?: string; to?: string }): Promise<void>;
}
