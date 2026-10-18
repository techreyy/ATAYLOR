"use client";

import React, { useState } from "react";
import { ShieldCheck, Users, Building2, History, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { SEED_USERS, SEED_AUDIT_LOGS, SEED_TENANT } from "@/core/seeds/seed-data";

export default function PlatformPage() {
  const [tenantName, setTenantName] = useState(SEED_TENANT.name);
  const [waNumber, setWaNumber] = useState(SEED_TENANT.waNumber);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveToast("Pengaturan Tenant & White-Label berhasil disimpan pada sesi lokal!");
    setTimeout(() => setSaveToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform, Tenant & Audit Log</h2>
            <DemoMockBadge />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Pengaturan profil tenant white-label A-Taylor Kendari, manajemen peran (RBAC), dan catatan jejak audit
          </p>
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-900 ml-4 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900">
              <Building2 className="w-4 h-4 text-blue-600" /> Profil Tenant White-Label
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSaveTenant} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Nama Toko / Brand Konveksi</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-medium text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Nomor WhatsApp Resmi Bisnis</label>
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-zinc-900"
                />
              </div>

              <div className="pt-2">
                <Button variant="primary" type="submit" size="sm">
                  Simpan Konfigurasi Tenant
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* User Roles & Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900">
              <Users className="w-4 h-4 text-blue-600" /> Pengguna Terdaftar (5 Role RBAC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-4">Nama Pengguna</th>
                  <th className="py-2.5 px-4">Peran (Role)</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {SEED_USERS.map((u) => (
                  <tr key={u.id} className="hover:bg-dash-hover/50">
                    <td className="py-2.5 px-4 font-medium text-zinc-900">
                      {u.name}
                      <span className="block text-[10px] text-zinc-400 font-normal">{u.email}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-lg border border-dash-line uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="py-3 px-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900">
            <History className="w-4 h-4 text-zinc-500" /> Log Aktivitas Audit Sensitif (`audit_logs`)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-4">Aktor Pengguna</th>
                <th className="py-2.5 px-4">Aksi Transaksi</th>
                <th className="py-2.5 px-4">Detail Mutasi Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SEED_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/60">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500 tabular-nums">{log.createdAt}</td>
                  <td className="py-2.5 px-4 font-semibold text-zinc-800">{log.actorName}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono bg-zinc-100 text-zinc-800 border border-zinc-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
