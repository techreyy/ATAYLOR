export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Nominal ringkas untuk sumbu/label grafik: 850 rb, 12,5 jt, 1,2 M. */
export function formatRupiahShort(amount: number): string {
  const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (amount >= 1_000_000_000) return `${fmt(amount / 1_000_000_000)} M`;
  if (amount >= 1_000_000) return `${fmt(amount / 1_000_000)} jt`;
  if (amount >= 1_000) return `${fmt(amount / 1_000)} rb`;
  return fmt(amount);
}
