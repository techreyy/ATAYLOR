import type { CatalogProductOption } from "./order.repository";

/** Isian form produk (snake_case = kolom `products`). */
export interface ProductInput {
  name: string;
  category: string;
  base_price: number;
  moq: number;
  std_duration_days: number;
  daily_capacity: number;
  design_sla_hours: number;
  dp_min_percent: number;
  free_revision_limit: number;
  is_active: boolean;
}

export interface OrderInsights {
  periodDays: number;
  from: string;
  summary: { orders: number; offline: number; online: number; pcs: number; avgPcsPerOrder: number; repeatCustomers: number };
  products: {
    productId: string;
    name: string;
    orders: number;
    pcs: number;
    revenue: number;
    avgPcsPerOrder: number;
    stdDurationDays: number;
    actualDurationDays: number | null;
    durationSamples: number;
  }[];
  sizes: { size: string; pcs: number }[];
  sleeves: { sleeveType: "pendek" | "panjang"; pcs: number }[];
  /** Kalimat ringkas yang nanti menjadi konteks chatbot */
  facts: string[];
}

/** Satu pesan chat percobaan AI: "user" = Owner berperan sebagai pelanggan. */
export interface SandboxMessage {
  role: "user" | "assistant";
  text: string;
}

export interface SandboxReply {
  reply: string;
  model: string;
  usage: { input: number; output: number; thinking: number };
}

export interface ICatalogRepository {
  /** includeInactive hanya berlaku untuk Owner (server mengabaikannya untuk peran lain). */
  getProducts(includeInactive?: boolean): Promise<CatalogProductOption[]>;
  createProduct(input: ProductInput): Promise<CatalogProductOption>;
  updateProduct(id: string, input: ProductInput): Promise<CatalogProductOption>;
  getOrderInsights(days: 30 | 90 | 365): Promise<OrderInsights>;
  /** Chat percobaan dengan AI sungguhan (khusus Owner); percakapan tidak disimpan. */
  sandboxChat(messages: SandboxMessage[]): Promise<SandboxReply>;
}
