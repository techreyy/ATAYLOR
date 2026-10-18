"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, errorMessage } from "@/components/ui/error-state";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { ApiError } from "@/core/api/client";
import type { CatalogProductOption, CloserOption } from "@/core/repositories/order.repository";
import { OrderChannel } from "@/core/types/order.types";
import { formatRupiah } from "@/lib/currency";
import { useRole } from "@/components/shell/role-context";
import { localDate } from "@/lib/date";

const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

function addDays(days: number) {
  return localDate(days);
}

export default function NewOrderPage() {
  const router = useRouter();
  const { activeRole } = useRole();

  const [products, setProducts] = useState<CatalogProductOption[]>([]);
  const [closers, setClosers] = useState<CloserOption[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("offline");
  const [marketingCloserId, setMarketingCloserId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [size, setSize] = useState("L");
  const [color, setColor] = useState("Navy Blue / Emas");
  const [qty, setQty] = useState(24);
  const [dueDate, setDueDate] = useState(addDays(21));
  const [notes, setNotes] = useState("");

  const [errorMessageText, setErrorMessageText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([orderRepository.getProducts(), orderRepository.getClosers()])
      .then(([p, c]) => {
        setProducts(p);
        setClosers(c);
        if (p[0]) setSelectedProductId(p[0].id);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, []);

  // Pratinjau kalkulasi — angka final selalu dihitung ulang server (BR-10)
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const unitPrice = selectedProduct?.basePrice ?? 0;
  const dpPercent = selectedProduct?.dpMinPercent ?? 50;
  const totalAmount = unitPrice * qty;
  const dpRequired = Math.ceil((totalAmount * dpPercent) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessageText(null);
    if (!selectedProduct) return;

    if (qty < selectedProduct.moq) {
      setErrorMessageText(`Kuantitas minimal (MOQ) untuk ${selectedProduct.name} adalah ${selectedProduct.moq} pcs.`);
      return;
    }
    // BR-02 (juga divalidasi server)
    if (channel === "offline" && !marketingCloserId) {
      setErrorMessageText("BR-02: Pesanan Offline wajib mencantumkan Marketing Closer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await orderRepository.createOrder({
        customer_name: customerName.trim(),
        customer_wa: customerWa.trim(),
        channel,
        marketing_closer_id: channel === "offline" ? marketingCloserId : null,
        due_date: dueDate,
        notes: notes.trim() || undefined,
        items: [{ product_id: selectedProduct.id, color, size, qty }],
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setErrorMessageText(errorMessage(err));
      setIsSubmitting(false);
    }
  };

  if (activeRole !== "admin") {
    return (
      <div className="max-w-xl mx-auto">
        <ErrorState error={new ApiError("Hanya Admin yang dapat menginput pesanan (BR-02).", 403)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto">
        <ErrorState error={loadError} onRetry={() => location.reload()} />
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-1.5 text-xs rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back Button & Title */}
      <div className="flex items-center justify-between">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
        </Link>
        <span className="text-[11px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-lg border border-dash-line">
          Form Input Terpusat (BR-01)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessageText && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessageText}</span>
          </div>
        )}

        {/* Pelanggan & Kanal */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle>1. Identitas Pelanggan & Kanal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="customer-name" className="block text-xs font-semibold text-zinc-700 mb-1">Nama Pelanggan / Institusi *</label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  placeholder="Contoh: Panitia Reuni Akbar SMAN 1"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="customer-wa" className="block text-xs font-semibold text-zinc-700 mb-1">Nomor WhatsApp Pelanggan *</label>
                <input
                  id="customer-wa"
                  type="tel"
                  required
                  placeholder="0812-xxxx-xxxx"
                  value={customerWa}
                  onChange={(e) => setCustomerWa(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
              <div>
                <label htmlFor="channel" className="block text-xs font-semibold text-zinc-700 mb-1">Kanal Pemesanan</label>
                <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value as OrderChannel)} className={inputCls}>
                  <option value="offline">Offline (Toko / Walk-in)</option>
                  <option value="online">Online (WhatsApp)</option>
                </select>
              </div>

              {channel === "offline" ? (
                <div>
                  <label htmlFor="closer" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Marketing Closer (Wajib Offline — BR-02) *
                  </label>
                  <select
                    id="closer"
                    value={marketingCloserId}
                    onChange={(e) => setMarketingCloserId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-amber-300 bg-amber-50/40 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">— Pilih Marketing Closer —</option>
                    {closers.map((closer) => (
                      <option key={closer.id} value={closer.id}>
                        {closer.name} ({closer.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center text-xs text-zinc-400 italic pt-6">
                  Pesanan online biasanya masuk lewat Chatbot WhatsApp; input manual tetap tercatat di antrean yang sama.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spesifikasi Item */}
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle>2. Spesifikasi Produk & Kuantitas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label htmlFor="product" className="block text-xs font-semibold text-zinc-700 mb-1">Katalog Produk</label>
                <select id="product" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={inputCls}>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} — {formatRupiah(prod.basePrice)}/pcs (MOQ: {prod.moq})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="qty" className="block text-xs font-semibold text-zinc-700 mb-1">Jumlah / Qty (Pcs) *</label>
                <input
                  id="qty"
                  type="number"
                  min={selectedProduct?.moq ?? 1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label htmlFor="size" className="block text-xs font-semibold text-zinc-700 mb-1">Ukuran Pokok</label>
                <select id="size" value={size} onChange={(e) => setSize(e.target.value)} className={inputCls}>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="color" className="block text-xs font-semibold text-zinc-700 mb-1">Kombinasi Warna Bahan</label>
                <input id="color" type="text" required value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label htmlFor="due" className="block text-xs font-semibold text-zinc-700 mb-1">Target Selesai (Tenggat)</label>
                <input
                  id="due"
                  type="date"
                  min={addDays(0)}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-zinc-700 mb-1">Catatan Tambahan & Sablon/Bordir</label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Detail penempatan logo, bordir komputer dada kiri, nomor punggung, dll."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputCls}
              />
            </div>
          </CardContent>
        </Card>

        {/* Kalkulasi DP (BR-10) */}
        <Card className="border-zinc-300 bg-zinc-50/60">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-zinc-600" />
              3. Kalkulasi Otomatis (DP Minimum {dpPercent}% — BR-10)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-zinc-500 block">Total Nilai Tagihan:</span>
                <span className="text-lg font-bold font-mono text-zinc-900 tabular-nums">{formatRupiah(totalAmount)}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5 tabular-nums">
                  ({qty} pcs × {formatRupiah(unitPrice)})
                </span>
              </div>

              <div>
                <span className="text-[11px] text-amber-700 font-semibold block">DP Wajib Minimum ({dpPercent}%):</span>
                <span className="text-lg font-bold font-mono text-amber-700 tabular-nums">{formatRupiah(dpRequired)}</span>
                <span className="text-[10px] text-amber-600 block mt-0.5">Syarat sebelum SPK diterbitkan</span>
              </div>

              <div>
                <span className="text-[11px] text-zinc-500 block">Sisa Saldo Pelunasan:</span>
                <span className="text-lg font-bold font-mono text-zinc-700 tabular-nums">
                  {formatRupiah(totalAmount - dpRequired)}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Ditagih saat tiba di gudang (BR-11)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-2">
          <Link href="/orders">
            <Button variant="outline" type="button" size="md">
              Batal
            </Button>
          </Link>
          <Button variant="primary" type="submit" size="md" disabled={isSubmitting || !selectedProduct}>
            <Save className="w-3.5 h-3.5" />
            {isSubmitting ? "Menyimpan..." : "Simpan Pesanan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
