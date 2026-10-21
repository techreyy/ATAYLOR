"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Sparkles, Database, MessageCircle, Plus, Pencil, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, Notice, errorMessage } from "@/components/ui/error-state";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/components/shell/role-context";
import { ProductFormModal } from "@/components/catalog/product-form-modal";
import { OrderInsightsPanel } from "@/components/catalog/order-insights-panel";
import { AiSandboxChat } from "@/components/catalog/ai-sandbox-chat";
import { catalogRepository } from "@/core/adapters/api/api-catalog.adapter";
import type { CatalogProductOption } from "@/core/repositories/order.repository";
import { formatRupiah } from "@/lib/currency";

export default function AiTrainingPage() {
  const { activeRole, automationMode, toggleAutomationMode } = useRole();
  const isOwner = activeRole === "owner";
  const [tone, setTone] = useState("Ramah, profesional, bernuansa konveksi lokal Kendari");
  const [negMaxDiscount, setNegMaxDiscount] = useState(5);

  // Katalog nyata dari tabel products (Owner melihat produk nonaktif juga)
  const [products, setProducts] = useState<CatalogProductOption[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<CatalogProductOption | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modeBusy, setModeBusy] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const handleModeChange = async () => {
    setModeBusy(true);
    setModeError(null);
    try {
      await toggleAutomationMode();
    } catch (err) {
      setModeError(errorMessage(err));
    } finally {
      setModeBusy(false);
    }
  };

  const loadProducts = useCallback(() => {
    setLoadError(null);
    catalogRepository.getProducts(isOwner).then(setProducts).catch(setLoadError);
  }, [isOwner]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const lastUpdated = products
    ?.map((p) => p.updatedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-dash-text tracking-tight">AI Training & Katalog</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Katalog produk yang dipakai form pesanan & chatbot, pola pesanan yang dipelajari AI, dan pengaturan percakapan WhatsApp
          </p>
        </div>
        {lastUpdated && (
          <span className="text-[11px] text-dash-muted tabular-nums">
            Katalog terakhir diubah {new Date(lastUpdated).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>

      {notice && (
        <Notice tone="success" onClose={() => setNotice(null)}>
          {notice}
        </Notice>
      )}

      {/* Katalog produk (FR-AT-01, BR-19) */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-zinc-600" /> Katalog Produk
            </CardTitle>
          </div>
          {isOwner ? (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="w-3.5 h-3.5" /> Tambah Produk
            </Button>
          ) : (
            <span className="text-[11px] text-dash-muted">Hanya Owner yang dapat mengubah katalog.</span>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loadError ? (
            <div className="p-4">
              <ErrorState error={loadError} onRetry={loadProducts} />
            </div>
          ) : !products ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dash-line text-zinc-500 uppercase text-[10px] font-semibold">
                  <th className="py-2 px-3">Nama Produk</th>
                  <th className="py-2 px-3">Kategori</th>
                  <th className="py-2 px-3 text-right">Harga Dasar</th>
                  <th className="py-2 px-3 text-right">MOQ</th>
                  <th className="py-2 px-3 text-right">Durasi</th>
                  <th className="py-2 px-3 text-right">Kapasitas/hari</th>
                  <th className="py-2 px-3 text-right">SLA Desain</th>
                  <th className="py-2 px-3 text-right">DP Min</th>
                  <th className="py-2 px-3 text-right">Revisi Gratis</th>
                  <th className="py-2 px-3">Status</th>
                  {isOwner && <th className="py-2 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.length === 0 && (
                  <tr>
                    <td colSpan={isOwner ? 11 : 10} className="py-6 text-center text-dash-muted">Katalog masih kosong.</td>
                  </tr>
                )}
                {products.map((p) => (
                  <tr key={p.id} className={`hover:bg-dash-hover/50 ${p.isActive === false ? "text-zinc-400" : ""}`}>
                    <td className={`py-2.5 px-3 font-semibold ${p.isActive === false ? "" : "text-zinc-900"}`}>{p.name}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{p.category}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums">{formatRupiah(p.basePrice)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.moq} pcs</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.stdDurationDays} hari</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.dailyCapacity} pcs</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.designSlaHours} jam</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.dpMinPercent}%</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.freeRevisionLimit}x</td>
                    <td className="py-2.5 px-3">
                      {p.isActive === false ? <Badge variant="slate">Nonaktif</Badge> : <Badge variant="emerald">Aktif</Badge>}
                    </td>
                    {isOwner && (
                      <td className="py-2.5 px-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={`Ubah ${p.name}`}>
                          <Pencil className="w-3.5 h-3.5" /> Ubah
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <OrderInsightsPanel />

      <AiSandboxChat canUse={isOwner} />

      {/* Sakelar High/Low Season (BR-21) — keputusan Owner */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-zinc-600" /> Kirim WhatsApp Otomatis
          </CardTitle>
          <DemoMockBadge />
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <Switch
            checked={automationMode === "high_on"}
            onChange={handleModeChange}
            disabled={!isOwner || modeBusy}
            label={automationMode === "high_on" ? "Aktif" : "Nonaktif"}
            description={isOwner ? "Pilih sesuai kondisi toko saat ini." : "Hanya Owner yang dapat mengubah pengaturan ini."}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className={`rounded-lg border p-3 ${automationMode === "high_on" ? "border-dash-primary bg-dash-primary-soft/50" : "border-dash-line"}`}>
              <p className="font-semibold text-dash-text mb-1">Aktif — saat pesanan ramai</p>
              <p className="text-dash-muted leading-relaxed">
                Sistem mengirim mockup beserta tombol ACC/Revisi, pengingat ACC, instruksi pembayaran, dan kabar pesanan selesai ke pelanggan.
              </p>
            </div>
            <div className={`rounded-lg border p-3 ${automationMode === "low_off" ? "border-dash-primary bg-dash-primary-soft/50" : "border-dash-line"}`}>
              <p className="font-semibold text-dash-text mb-1">Nonaktif — saat sepi atau ingin kendali manual</p>
              <p className="text-dash-muted leading-relaxed">
                Tidak ada pesan otomatis. Pesanan dan tiket desain tetap tercatat; Admin mengirim WhatsApp sendiri dan mencatat bukti ACC.
              </p>
            </div>
          </div>
          {modeError && <p className="text-[11px] text-dash-danger-strong">{modeError}</p>}
          <p className="text-[11px] text-dash-muted">
            Pilihan ini tersimpan untuk seluruh pengguna toko. Belum tersambung ke WhatsApp, jadi belum mengirim pesan apa pun.
          </p>
        </CardContent>
      </Card>

      {/* Persona & Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Persona & Tone AI Frontline
            </CardTitle>
            <DemoMockBadge />
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Panduan Gaya Bahasa (System Prompt Tone):</label>
              <textarea
                rows={3}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-dash-line focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Digunakan oleh Gemini 2.5 Flash saat menyapa calon pemesan di WhatsApp resmi.
              </span>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">
                Batas Maksimal Diskon Negosiasi Mandiri AI (%):
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={negMaxDiscount}
                onChange={(e) => setNegMaxDiscount(Number(e.target.value))}
                className="w-32 p-1.5 rounded-lg border border-dash-line font-mono tabular-nums text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Jika pelanggan meminta diskon lebih dari {negMaxDiscount}%, AI otomatis mengeskalasi ke Admin.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Summary */}
        <Card className="bg-dash-charcoal text-white border-transparent">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-white text-xs flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-white/90" /> Status Knowledge Vector Store
            </CardTitle>
            <DemoMockBadge />
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs text-white/75">
            <div className="flex items-center justify-between py-1 border-b border-white/15">
              <span>Model LLM Utama:</span>
              <strong className="text-white font-mono">Gemini 2.5 Flash</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/15">
              <span>Model Eskalasi:</span>
              <strong className="text-white/90 font-mono">Claude Haiku 4.5</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/15">
              <span>Embedding Engine:</span>
              <strong className="text-white/90 font-mono">PostgreSQL pgvector (FastAPI)</strong>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Terakhir Disinkronkan:</span>
              <span className="font-mono tabular-nums text-[#A8F0A8]">17 Okt 2026, 22:15 WITA</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
