"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { BrandLogo, BrandWordmark } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { spkRepository } from "@/core/adapters/api/api-spk.adapter";
import { SpkDocument } from "@/core/types/production.types";

export default function SpkPrintPage() {
  const params = useParams();
  const [spk, setSpk] = useState<SpkDocument | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (params?.id) spkRepository.getSpk(params.id as string).then(setSpk).catch(setError);
  }, [params?.id]);

  if (error) return <ErrorState error={error} className="max-w-md mx-auto mt-8" />;
  if (!spk || !spk.order) {
    return (
      <div className="max-w-4xl mx-auto p-10 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const order = spk.order;
  const totalQty = order.items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 max-w-4xl mx-auto text-zinc-900 font-sans print:p-0">
      {/* Action Bar for On-screen preview only */}
      <div className="mb-6 p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xs font-bold text-zinc-800">Pratinjau Cetak Dokumen SPK Final (A4)</h2>
          <p className="text-[11px] text-zinc-500">
            Tata letak dokumen ini otomatis bersih dari navigasi saat dicetak atau disimpan ke PDF.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Cetak Sekarang (Ctrl+P / PDF)
        </button>
      </div>

      {/* Official A4 SPK Sheet */}
      <div className="border border-zinc-300 p-8 rounded-lg print:border-none print:p-0">
        {/* Document Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center shrink-0">
              <BrandLogo size="sm" priority />
            </div>
            <div>
              <h1 className="sr-only">A-TAYLOR KENDARI</h1>
              <BrandWordmark height={32} priority className="mb-1" />
              <p className="text-xs text-zinc-600">
                Pusat Produksi Konveksi, Jersey Printing, Kemeja PDL, & Bordir Komputer
              </p>
              <p className="text-[11px] text-zinc-500">Kota Kendari, Sulawesi Tenggara • WA: 0812-4567-8901</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Surat Perintah Kerja (SPK)
            </span>
            <span className="font-mono text-base font-bold text-zinc-900 tabular-nums">{spk.spkNumber}</span>
            <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
              STATUS: TERVALIDASI KASIR
            </span>
          </div>
        </div>

        {/* Order & Schedule Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6">
          <div className="space-y-1 p-3 rounded bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mb-1">
              Data Pemesan & Referensi
            </h3>
            <p>
              <strong>Order ID:</strong> <span className="font-mono tabular-nums">{order.orderCode}</span>
            </p>
            <p>
              <strong>Nama Pelanggan:</strong> {order.customerName}
            </p>
            <p>
              <strong>WhatsApp:</strong> <span className="font-mono tabular-nums">{order.customerWa}</span>
            </p>
            <p>
              <strong>Kanal Pemesanan:</strong> {order.channel.toUpperCase()}
            </p>
          </div>

          <div className="space-y-1 p-3 rounded bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mb-1">
              Jadwal & Target Produksi
            </h3>
            <p>
              <strong>Tanggal Terbit SPK:</strong>{" "}
              {new Date(spk.issuedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
            </p>
            <p className="text-red-700 font-bold">
              <strong>Tenggat Selesai Gudang:</strong> <span className="font-mono tabular-nums">{order.dueDate}</span>
            </p>
            <p>
              <strong>Diterbitkan Oleh:</strong> {spk.issuedBy}
            </p>
            <p>
              <strong>Status Pembayaran:</strong> DP Tervalidasi · Kuota Terkunci Permanen (BR-09)
            </p>
          </div>
        </div>

        {/* Item Specifications */}
        <div className="mb-6">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-700 mb-2">
            Rincian Spesifikasi Produksi
          </h3>
          <table className="w-full text-left text-xs border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-700">
                <th className="py-2 px-3 border-r border-zinc-300">No</th>
                <th className="py-2 px-3 border-r border-zinc-300">Item Produk & Deskripsi Bahan</th>
                <th className="py-2 px-3 border-r border-zinc-300">Warna / Corak</th>
                <th className="py-2 px-3 border-r border-zinc-300">Ukuran</th>
                <th className="py-2 px-3 text-right">Kuantitas</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.id} className="border-b border-zinc-200">
                  <td className="py-2 px-3 border-r border-zinc-200 text-center font-mono tabular-nums">{index + 1}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 font-semibold">
                    {item.productName}
                    <p className="text-[10px] text-zinc-500 font-normal">{order.notes}</p>
                  </td>
                  <td className="py-2 px-3 border-r border-zinc-200">{item.color}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 font-mono font-bold">{item.size}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{item.qty} Pcs</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-bold">
                <td colSpan={4} className="py-2 px-3 text-right border-r border-zinc-300">
                  TOTAL KUANTITAS:
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{totalQty} Pcs</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Dispatch Metadata Section (BR-27) */}
        <div className="p-3 rounded-lg border border-dash-line bg-zinc-50 text-xs mb-8">
          <h4 className="font-bold uppercase text-[10px] text-zinc-600 tracking-wider mb-2">
            Catatan Dispatch Vendor Eksternal (Luring)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <p>
              <strong>Mitra Vendor:</strong> {spk.vendorName || "—"}
            </p>
            <p>
              <strong>Penerima Bahan:</strong> {spk.spkReceiver || "—"}
            </p>
            <p>
              <strong>Tanggal Kirim Bahan:</strong> <span className="font-mono tabular-nums">{spk.materialSentDate || "—"}</span>
            </p>
            <p>
              <strong>Batas Vendor:</strong> <span className="font-mono tabular-nums">{spk.vendorDueDate || "—"}</span>
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4 border-t border-zinc-200">
          <div>
            <p className="text-zinc-500 mb-12">Diterbitkan Oleh (Admin),</p>
            <p className="font-bold underline">{spk.issuedBy}</p>
            <p className="text-[10px] text-zinc-400">Admin Sentral A-Taylor</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-12">Dispatch Vendor (Manager/Owner),</p>
            <p className="font-bold underline">{spk.dispatchedBy || "........................"}</p>
            <p className="text-[10px] text-zinc-400">Production Manager</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-12">Penerima Bahan (Mitra Vendor),</p>
            <p className="font-bold underline">{spk.spkReceiver || "........................"}</p>
            <p className="text-[10px] text-zinc-400">Mitra Sablon / Jahit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
