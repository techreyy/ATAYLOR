export interface Product {
  id: string;
  name: string;
  category: "Jersey" | "Polo" | "Kemeja / PDL" | "Jaket / Hoodie" | "Kaos Oblong";
  basePrice: number;
  moq: number; // Minimum Order Quantity
  stdDurationDays: number;
  dailyCapacity: number;
  designSlaHours: number;
  dpMinPercent: number; // Baseline 50%
  stockAvailable: number;
  stockReserved: number; // Fast track reservation
}

export interface DesignTicket {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  designerName: string;
  stage: "new" | "in_progress" | "waiting_acc" | "revision" | "completed";
  currentVersion: number;
  revisionsUsed: number; // Maksimal 3x revisi gratis (BR-05)
  slaCountdownHours: number;
  mockupUrl?: string;
  lastCustomerFeedback?: string;
}
