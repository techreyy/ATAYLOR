"use client";

import React, { useState } from "react";
import {
  Upload,
  Clock,
  CheckCircle2,
  MessageSquare,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { SEED_DESIGN_TICKETS } from "@/core/seeds/seed-data";

export default function DesignerPage() {
  const [tickets, setTickets] = useState(SEED_DESIGN_TICKETS);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  const handleSimulateUpload = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, currentVersion: t.currentVersion + 1, stage: "waiting_acc" as const }
          : t
      )
    );
    setUploadToast("Mockup Versi Baru berhasil diunggah. Mini Agent mengirim link proofing ke WhatsApp pelanggan.");
    setTimeout(() => setUploadToast(null), 5000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">CRM Designer & Tiket Mockup</h2>
            <DemoMockBadge />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manajemen antrean desain apparel, SLA countdown, versi mockup (v1/v2), dan batas 3x revisi gratis (BR-05)
          </p>
        </div>
      </div>

      {uploadToast && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadToast}</span>
          </div>
          <button onClick={() => setUploadToast(null)} className="text-emerald-700 hover:text-emerald-900 ml-4 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="flex flex-col justify-between">
            <CardHeader className="px-5 pt-4 pb-1 border-b border-zinc-100 flex flex-row items-center justify-between">
              <span className="font-mono font-bold text-xs text-zinc-900 tabular-nums">{ticket.orderCode}</span>
              <Badge variant="amber">Menunggu ACC (v{ticket.currentVersion})</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1">
              <div>
                <h4 className="font-bold text-xs text-zinc-900">{ticket.customerName}</h4>
                <p className="text-[11px] text-zinc-500">Designer: {ticket.designerName}</p>
              </div>

              {/* SLA Countdown Badge */}
              <div className="flex items-center justify-between p-2 rounded-md bg-zinc-50 border border-zinc-200 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-700 font-medium text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" /> SLA Desain:
                </span>
                <span className="font-mono font-bold text-zinc-900 tabular-nums text-xs">
                  {ticket.slaCountdownHours} Jam Tersisa
                </span>
              </div>

              {/* Revision Count Invariant (BR-05) */}
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Kuota Revisi Gratis (BR-05):</span>
                <strong className="text-zinc-900 font-mono tabular-nums">{ticket.revisionsUsed} / 3 Terpakai</strong>
              </div>

              {/* Last Feedback */}
              {ticket.lastCustomerFeedback && (
                <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200 text-xs">
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-0.5 text-[11px]">
                    <MessageSquare className="w-3 h-3 text-zinc-400" /> Catatan Revisi Pelanggan:
                  </span>
                  <p className="text-zinc-600 text-[11px] italic leading-snug">"{ticket.lastCustomerFeedback}"</p>
                </div>
              )}
            </CardContent>

            <div className="p-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSimulateUpload(ticket.id)}
              >
                <Upload className="w-3 h-3" /> Unggah Mockup (v{ticket.currentVersion + 1})
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
