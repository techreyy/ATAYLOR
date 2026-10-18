"use client";

import React, { useState } from "react";
import { RefreshCw, CheckCircle2, Sparkles, Database, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { SEED_PRODUCTS } from "@/core/seeds/seed-data";
import { formatRupiah } from "@/lib/currency";

export default function AiTrainingPage() {
  const [tone, setTone] = useState("Ramah, profesional, bernuansa konveksi lokal Kendari");
  const [negMaxDiscount, setNegMaxDiscount] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncToast("Sinkronisasi Pengetahuan Berhasil (<3 detik). LLM Gemini 2.5 Flash siap menggunakan katalog terbaru.");
      setTimeout(() => setSyncToast(null), 5000);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">AI Training & Knowledge Base</h2>
            <DemoMockBadge />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pengaturan parameter katalog produk, batasan diskon negosiasi, dan tone percakapan AI WhatsApp
          </p>
        </div>

        <Button variant="primary" size="md" disabled={isSyncing} onClick={handleSync}>
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Menyinkronkan..." : "Sinkronkan Pengetahuan (<60s)"}
        </Button>
      </div>

      {syncToast && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-700 hover:text-emerald-900 ml-4 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Persona & Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Persona & Tone AI Frontline
            </CardTitle>
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

      {/* Synchronized Catalog */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Katalog Produk yang Diketahui AI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dash-line text-zinc-500 uppercase text-[10px] font-semibold">
                <th className="py-2 px-3">Nama Produk</th>
                <th className="py-2 px-3">Kategori</th>
                <th className="py-2 px-3 text-right">Harga Dasar</th>
                <th className="py-2 px-3 text-right">MOQ</th>
                <th className="py-2 px-3 text-right">Estimasi Standar</th>
                <th className="py-2 px-3 text-right">SLA Desain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SEED_PRODUCTS.map((p) => (
                <tr key={p.id} className="hover:bg-dash-hover/50">
                  <td className="py-2.5 px-3 font-semibold text-zinc-900">{p.name}</td>
                  <td className="py-2.5 px-3 text-zinc-500">{p.category}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 text-right tabular-nums">{formatRupiah(p.basePrice)}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.moq} pcs</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.stdDurationDays} hari</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right">{p.designSlaHours} jam</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
