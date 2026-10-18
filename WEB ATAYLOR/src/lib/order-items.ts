import { ORDER_SIZES, SLEEVE_TYPES } from "@/lib/constants";
import type { OrderItem, SleeveType } from "@/core/types/order.types";

export interface SleeveGroup {
  sleeveType: SleeveType;
  label: string;
  /** Qty per kolom dari `sizeColumns` (0 bila kosong). */
  sizes: { size: string; qty: number }[];
  totalQty: number;
  subtotal: number;
}

/** Kolom ukuran tabel rincian: S–3XL lalu ukuran non-baku dari data lama (mis. "All Size"). */
export function sizeColumns(items: OrderItem[]): string[] {
  const extra = Array.from(new Set(items.map((i) => i.size))).filter((s) => !(ORDER_SIZES as readonly string[]).includes(s));
  return [...ORDER_SIZES, ...extra];
}

/** Kelompokkan item pesanan per jenis lengan. Item lama tanpa jenis lengan dianggap "pendek". */
export function groupBySleeve(items: OrderItem[]): SleeveGroup[] {
  const columns = sizeColumns(items);
  return SLEEVE_TYPES.flatMap(({ id, label }) => {
    const rows = items.filter((i) => (i.sleeveType ?? "pendek") === id);
    if (rows.length === 0) return [];
    const sizes = columns.map((size) => ({
      size,
      qty: rows.filter((r) => r.size === size).reduce((sum, r) => sum + r.qty, 0),
    }));
    return [{
      sleeveType: id,
      label,
      sizes,
      totalQty: rows.reduce((sum, r) => sum + r.qty, 0),
      subtotal: rows.reduce((sum, r) => sum + r.subtotal, 0),
    }];
  });
}

