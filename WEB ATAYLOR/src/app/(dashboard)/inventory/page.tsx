"use client";

import React, { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { SEED_PRODUCTS } from "@/core/seeds/seed-data";

export default function InventoryPage() {
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [stockToast, setStockToast] = useState<string | null>(null);

  const handleAdjustStock = (prodId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stockAvailable: p.stockAvailable + delta } : p))
    );
    setStockToast(`Stok bahan baku diperbarui (${delta > 0 ? "+" : ""}${delta} pcs).`);
    setTimeout(() => setStockToast(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">Inventory Bahan Baku & Fast Track</h2>
            <DemoMockBadge />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pengawasan stok kain siap potong, kuota Fast Track reservasi, dan kapasitas harian konveksi
          </p>
        </div>
      </div>

      {stockToast && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{stockToast}</span>
          </div>
          <button onClick={() => setStockToast(null)} className="text-emerald-700 hover:text-emerald-900 ml-4 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product Stock Table */}
      <Card>
        <CardHeader className="px-5 pt-4 pb-1">
          <CardTitle className="text-xs font-semibold">Daftar Bahan Baku & SKU Apparel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dash-line text-zinc-500 uppercase text-[10px] font-semibold">
                <th className="py-2 px-3">Nama Produk & Kategori</th>
                <th className="py-2 px-3 text-right">Kapasitas Harian</th>
                <th className="py-2 px-3 text-right">Stok Tersedia</th>
                <th className="py-2 px-3 text-right">Fast Track Ter-Reservasi</th>
                <th className="py-2 px-3">Status Ketersediaan</th>
                <th className="py-2 px-3 text-right">Penyesuaian Demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-dash-hover/50">
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-zinc-900">{prod.name}</p>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {prod.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right">{prod.dailyCapacity} pcs / hari</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 tabular-nums text-right">{prod.stockAvailable} pcs</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 font-semibold tabular-nums text-right">
                    {prod.stockReserved} pcs
                  </td>
                  <td className="py-2.5 px-3">
                    {prod.stockAvailable > 50 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-200">
                        Aman (Ready)
                      </span>
                    ) : (
                      <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-red-200">
                        Menipis (Reorder)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleAdjustStock(prod.id, 20)}>
                      +20
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAdjustStock(prod.id, -20)}>
                      -20
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
