"use client";

import React, { useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Notice, errorMessage } from "@/components/ui/error-state";
import { catalogRepository } from "@/core/adapters/api/api-catalog.adapter";
import type { ProductInput } from "@/core/repositories/catalog.repository";
import type { CatalogProductOption } from "@/core/repositories/order.repository";

const EMPTY: ProductInput = {
  name: "",
  category: "",
  base_price: 0,
  moq: 12,
  std_duration_days: 7,
  daily_capacity: 100,
  design_sla_hours: 24,
  dp_min_percent: 50,
  free_revision_limit: 3,
  is_active: true,
};

function toInput(p: CatalogProductOption): ProductInput {
  return {
    name: p.name,
    category: p.category,
    base_price: p.basePrice,
    moq: p.moq,
    std_duration_days: p.stdDurationDays,
    daily_capacity: p.dailyCapacity,
    design_sla_hours: p.designSlaHours,
    dp_min_percent: p.dpMinPercent,
    free_revision_limit: p.freeRevisionLimit,
    is_active: p.isActive ?? true,
  };
}

const NUMBER_FIELDS: { key: keyof ProductInput; label: string; suffix: string; min: number; max: number; hint?: string }[] = [
  { key: "base_price", label: "Harga dasar / pcs", suffix: "Rp", min: 1000, max: 100000000 },
  { key: "moq", label: "MOQ", suffix: "pcs", min: 1, max: 100000, hint: "Minimal total qty per pesanan." },
  { key: "std_duration_days", label: "Durasi produksi standar", suffix: "hari", min: 1, max: 365 },
  { key: "daily_capacity", label: "Kapasitas harian", suffix: "pcs", min: 1, max: 100000 },
  { key: "design_sla_hours", label: "SLA desain", suffix: "jam", min: 1, max: 720 },
  { key: "dp_min_percent", label: "DP minimum", suffix: "%", min: 0, max: 100, hint: "Dipakai saat menghitung DP." },
  { key: "free_revision_limit", label: "Revisi gratis", suffix: "kali", min: 0, max: 20, hint: "Lebih dari ini = revisi berbayar." },
];

/** Tambah / ubah produk katalog (khusus Owner, BR-19). */
export function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: CatalogProductOption | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<ProductInput>(product ? toInput(product) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceChanged = !!product && form.base_price !== product.basePrice;

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, name: form.name.trim(), category: form.category.trim() };
      if (product) await catalogRepository.updateProduct(product.id, payload);
      else await catalogRepository.createProduct(payload);
      onSaved(
        product
          ? `${payload.name} diperbarui.${priceChanged ? " Harga baru hanya berlaku untuk pesanan baru." : ""}`
          : `${payload.name} ditambahkan ke katalog.`
      );
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-1.5 text-xs rounded-lg border border-dash-line bg-white";

  return (
    <div className="fixed inset-0 z-50 bg-[#111]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card-hover animate-scale-in max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 id="product-form-title" className="text-sm font-bold text-dash-text">
            {product ? "Ubah Produk" : "Tambah Produk"}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-dash-muted hover:bg-dash-hover" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label htmlFor="p-name" className="block font-semibold text-zinc-700 mb-1">Nama produk *</label>
            <input id="p-name" required maxLength={150} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-category" className="block font-semibold text-zinc-700 mb-1">Kategori *</label>
            <input id="p-category" required maxLength={80} placeholder="mis. Kaos, Polo, Jaket" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls} />
          </div>
          {NUMBER_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`p-${f.key}`} className="block font-semibold text-zinc-700 mb-1">{f.label} *</label>
              <div className="flex items-center gap-1.5">
                {f.suffix === "Rp" && <span className="text-dash-muted">Rp</span>}
                <input
                  id={`p-${f.key}`}
                  type="number"
                  required
                  min={f.min}
                  max={f.max}
                  step={1}
                  value={form[f.key] as number}
                  onChange={(e) => set(f.key, Math.trunc(Number(e.target.value)) as never)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
                {f.suffix !== "Rp" && <span className="text-dash-muted shrink-0">{f.suffix}</span>}
              </div>
              {f.hint && <span className="block text-[10px] text-dash-muted mt-0.5">{f.hint}</span>}
            </div>
          ))}
        </div>

        <Switch
          checked={form.is_active}
          onChange={(v) => set("is_active", v)}
          label={form.is_active ? "Aktif — bisa dipilih di form pesanan" : "Nonaktif — disembunyikan dari form pesanan"}
          description="Produk tidak dihapus agar riwayat pesanan tetap utuh."
        />

        {priceChanged && (
          <p className="text-[11px] text-dash-primary-strong bg-dash-primary-soft rounded-lg px-3 py-2">
            Harga berubah. Pesanan yang sudah ada tetap memakai harga lama; harga baru berlaku untuk pesanan baru.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-3.5 h-3.5" /> {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
