import type { CreateOrderInput, Order, OrderFilters, SpkGate } from "../types/order.types";

export interface CatalogProductOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  moq: number;
  stdDurationDays: number;
  dailyCapacity: number;
  designSlaHours: number;
  dpMinPercent: number;
  freeRevisionLimit: number;
  isActive?: boolean;
  updatedAt?: string | null;
}

export interface CloserOption {
  id: string;
  name: string;
  phone?: string | null;
  isActive: boolean;
}

export interface IOrderRepository {
  getAllOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrderById(id: string): Promise<{ order: Order; spkGate: SpkGate }>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  getProducts(): Promise<CatalogProductOption[]>;
  getClosers(): Promise<CloserOption[]>;
  // Desain & ACC (BR-06, BR-07, BR-17)
  sendDesignVersion(orderId: string, mockup?: File | null): Promise<{ message: string; isPaidRevision: boolean }>;
  approveDesign(versionId: string, channel: "manual_admin" | "wa_button"): Promise<{ message: string }>;
  requestRevision(versionId: string, feedback: string): Promise<{ message: string }>;
}
