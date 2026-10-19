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
