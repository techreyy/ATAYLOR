"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle, Calculator, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { ErrorState, errorMessage } from "@/components/ui/error-state";
import { orderRepository } from "@/core/adapters/api/api-order.adapter";
import { ApiError } from "@/core/api/client";
import type { CatalogProductOption, CloserOption } from "@/core/repositories/order.repository";
import { OrderChannel, SleeveType } from "@/core/types/order.types";
import { formatRupiah } from "@/lib/currency";
import { useRole } from "@/components/shell/role-context";
import { localDate } from "@/lib/date";
import { ORDER_SIZES, SLEEVE_TYPES } from "@/lib/constants";

// Satu blok = satu jenis lengan dengan qty per ukuran
interface VariantBlock {
  key: number;
  sleeveType: SleeveType;
  qty: Record<string, number>;
}

function newBlock(key: number, sleeveType: SleeveType): VariantBlock {
  return { key, sleeveType, qty: Object.fromEntries(ORDER_SIZES.map((s) => [s, 0])) };
}

function blockTotal(block: VariantBlock) {
  return Object.values(block.qty).reduce((sum, n) => sum + n, 0);
}

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
  const [color, setColor] = useState("Navy Blue / Emas");
  const [blocks, setBlocks] = useState<VariantBlock[]>(() => [newBlock(0, "pendek")]);
  const [advanced, setAdvanced] = useState(false);
  const [confirmDisableAdvanced, setConfirmDisableAdvanced] = useState(false);
  const nextBlockKey = useRef(1);
  // Harga custom per pcs per jenis lengan; hanya dipakai bila sakelar Harga Custom aktif
  const [customPrice, setCustomPrice] = useState(false);
  const [customPrices, setCustomPrices] = useState<Record<SleeveType, number>>({ pendek: 0, panjang: 0 });
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
  const priceOf = (sleeve: SleeveType) => (customPrice ? customPrices[sleeve] : unitPrice);
  const dpPercent = selectedProduct?.dpMinPercent ?? 50;
  const totalQty = blocks.reduce((sum, b) => sum + blockTotal(b), 0);
  const belowMoq = !!selectedProduct && totalQty < selectedProduct.moq;
  const totalAmount = blocks.reduce((sum, b) => sum + blockTotal(b) * priceOf(b.sleeveType), 0);
  const invalidCustomPrice = customPrice && blocks.some((b) => customPrices[b.sleeveType] < 1000);
  const dpRequired = Math.ceil((totalAmount * dpPercent) / 100);
  const unusedSleeve = SLEEVE_TYPES.find((s) => !blocks.some((b) => b.sleeveType === s.id));

  const updateBlock = (key: number, patch: (b: VariantBlock) => VariantBlock) =>
    setBlocks((prev) => prev.map((b) => (b.key === key ? patch(b) : b)));

  const addBlock = () => {
    if (!unusedSleeve) return;
    setBlocks((prev) => [...prev, newBlock(nextBlockKey.current++, unusedSleeve.id)]);
  };

  const turnOffAdvanced = () => {
    setBlocks((prev) => prev.slice(0, 1));
    setAdvanced(false);
    setConfirmDisableAdvanced(false);
  };

  const handleAdvancedChange = (on: boolean) => {
    if (on) {
      setAdvanced(true);
      return;
    }
    // Blok tambahan yang sudah berisi qty tidak dibuang tanpa konfirmasi
    if (blocks.slice(1).some((b) => blockTotal(b) > 0)) setConfirmDisableAdvanced(true);
    else turnOffAdvanced();
  };

  const handleCustomPriceChange = (on: boolean) => {
    // Mulai dari harga katalog produk terpilih
    if (on) setCustomPrices({ pendek: unitPrice, panjang: unitPrice });
    setCustomPrice(on);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessageText(null);
    if (!selectedProduct) return;

    if (totalQty === 0) {
      setErrorMessageText("Isi qty minimal satu ukuran.");
      return;
    }
    if (totalQty < selectedProduct.moq) {
      setErrorMessageText(`Kuantitas minimal (MOQ) untuk ${selectedProduct.name} adalah ${selectedProduct.moq} pcs (total saat ini ${totalQty} pcs).`);
      return;
    }
    if (invalidCustomPrice) {
      setErrorMessageText("Harga custom minimal Rp1.000 per pcs.");
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
        product_id: selectedProduct.id,
        color: color.trim(),
        items: blocks.flatMap((b) =>
          ORDER_SIZES.filter((s) => b.qty[s] > 0).map((s) => ({ sleeve_type: b.sleeveType, size: s, qty: b.qty[s] }))
        ),
        custom_unit_prices: customPrice
          ? Object.fromEntries(blocks.map((b) => [b.sleeveType, customPrices[b.sleeveType]]))
          : undefined,
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setErrorMessageText(errorMessage(err));
      setIsSubmitting(false);
    }
  };

  // Owner dapat mengakses semua fitur
  if (activeRole !== "admin" && activeRole !== "owner") {
    return (
      <div className="max-w-xl mx-auto">
        <ErrorState error={new ApiError("Hanya Admin (atau Owner) yang dapat menginput pesanan (BR-02).", 403)} />
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
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    // Harga custom ikut kembali ke harga katalog produk baru
                    const base = products.find((p) => p.id === e.target.value)?.basePrice ?? 0;
                    if (customPrice) setCustomPrices({ pendek: base, panjang: base });
                  }}
                  className={inputCls}
                >
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} — {formatRupiah(prod.basePrice)}/pcs (MOQ: {prod.moq})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="color" className="block text-xs font-semibold text-zinc-700 mb-1">Kombinasi Warna Bahan</label>
                <input id="color" type="text" required value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Rincian ukuran per jenis lengan */}
            <div className="space-y-2 pt-1">
              <span className="block text-xs font-semibold text-zinc-700">Rincian Ukuran & Qty *</span>
              {blocks.map((block, index) => (
                <div key={block.key} className="rounded-xl border border-dash-line p-3 space-y-3 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {blocks.length > 1 && (
                        <span className="text-[11px] font-semibold text-dash-muted tabular-nums">Varian {index + 1}</span>
                      )}
                      <SegmentedControl
                        ariaLabel={`Jenis lengan varian ${index + 1}`}
                        value={block.sleeveType}
                        onChange={(v) => updateBlock(block.key, (b) => ({ ...b, sleeveType: v }))}
                        options={SLEEVE_TYPES.map((s) => ({
                          value: s.id,
                          label: s.label,
                          disabled: blocks.some((other) => other.key !== block.key && other.sleeveType === s.id),
                        }))}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {customPrice && (
                        <label className="flex items-center gap-1.5 text-xs text-dash-muted">
                          Harga/pcs (Rp)
                          <input
                            type="number"
                            min={1000}
                            step={500}
                            value={customPrices[block.sleeveType] || ""}
                            onChange={(e) =>
                              setCustomPrices((prev) => ({ ...prev, [block.sleeveType]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                            }
                            aria-label={`Harga custom per pcs varian ${index + 1}`}
                            className={`w-28 px-2 py-1 text-xs rounded-lg border bg-white font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                              customPrices[block.sleeveType] < 1000 ? "border-dash-danger-line" : "border-dash-line"
                            }`}
                          />
                        </label>
                      )}
                      <span className="text-xs text-dash-muted">
                        Jumlah: <strong className="font-mono tabular-nums text-zinc-900">{blockTotal(block)} pcs</strong>
                      </span>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-2 hover:text-dash-danger"
                          onClick={() => setBlocks((prev) => prev.filter((b) => b.key !== block.key))}
                          aria-label={`Hapus varian ${index + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-3">
                    {ORDER_SIZES.map((s) => (
                      <QtyStepper
                        key={s}
                        id={`qty-${block.key}-${s}`}
                        label={s}
                        value={block.qty[s]}
                        onChange={(n) => updateBlock(block.key, (b) => ({ ...b, qty: { ...b.qty, [s]: n } }))}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Switch
                  checked={advanced}
                  onChange={handleAdvancedChange}
                  label="Custom Lanjutan"
                  description="Tambah varian jenis lengan lain dalam satu pesanan."
                />
                {advanced && unusedSleeve && (
                  <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Varian
                  </Button>
                )}
              </div>

              <Switch
                checked={customPrice}
                onChange={handleCustomPriceChange}
                label="Harga Custom"
                description={`Ubah harga per pcs khusus pesanan ini (harga katalog ${formatRupiah(unitPrice)}/pcs tidak berubah).`}
              />

              {confirmDisableAdvanced && (
                <div className="p-3 rounded-xl border border-dash-danger-line bg-dash-danger-soft text-xs text-dash-danger-strong flex flex-wrap items-center justify-between gap-2 animate-slide-down" role="alert">
                  <span className="font-medium">Varian tambahan masih berisi qty dan akan dihapus. Matikan Custom Lanjutan?</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDisableAdvanced(false)}>
                      Batal
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={turnOffAdvanced}>
                      Ya, hapus varian
                    </Button>
                  </div>
                </div>
              )}

              {/* Total qty (read-only) menggantikan input Qty lama */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
                  belowMoq ? "border-dash-danger-line bg-dash-danger-soft text-dash-danger-strong" : "border-dash-line bg-zinc-50 text-zinc-700"
                }`}
                aria-live="polite"
              >
                <span>
                  Total Qty: <strong className="font-mono tabular-nums text-sm">{totalQty} pcs</strong>
                </span>
                {selectedProduct && (
                  <span className="tabular-nums">
                    {belowMoq
                      ? `Kurang ${selectedProduct.moq - totalQty} pcs dari MOQ ${selectedProduct.moq} pcs`
                      : `Memenuhi MOQ ${selectedProduct.moq} pcs`}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
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
                  {customPrice
                    ? `(${blocks.map((b) => `${blockTotal(b)} pcs × ${formatRupiah(customPrices[b.sleeveType])}`).join(" + ")} — harga custom)`
                    : `(${totalQty} pcs × ${formatRupiah(unitPrice)})`}
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
          <Button variant="primary" type="submit" size="md" disabled={isSubmitting || !selectedProduct || totalQty === 0 || invalidCustomPrice}>
            <Save className="w-3.5 h-3.5" />
            {isSubmitting ? "Menyimpan..." : "Simpan Pesanan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
