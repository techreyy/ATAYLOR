"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Send,
  CheckCheck,
  Check,
  RotateCcw,
  Sparkles,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoMockBadge } from "@/components/ui/demo-mock-badge";
import { useRole } from "@/components/shell/role-context";

interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "system";
  text: string;
  time: string;
  isProofingCard?: boolean;
}

export default function AgentPlaygroundPage() {
  const { automationMode } = useRole();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "customer",
      text: "Halo A-Taylor, saya mau buat jersey futsal 20 pcs untuk tim saya di Kendari.",
      time: "10:02",
    },
    {
      id: "m2",
      sender: "ai",
      text: "Halo Kak! Salam hangat dari A-Taylor Kendari. Untuk jersey futsal kuantitas 20 pcs, bahan Dryfit Milano printing sublim kami siap produksi dengan estimasi 7 hari kerja. Bisa dibantu kirim logo atau referensi warnanya Kak?",
      time: "10:02",
    },
    {
      id: "m3",
      sender: "customer",
      text: "Warnanya navy kombinasi emas. Logo sudah ada.",
      time: "10:04",
    },
    {
      id: "m4",
      sender: "ai",
      text: "Baik Kak, brief sudah kami rangkum! Desainer kami telah membuat mockup versi 2 berikut:",
      time: "10:05",
      isProofingCard: true,
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [accDone, setAccDone] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "customer",
      text: inputVal,
      time: "Sekarang",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");

    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `m-reply-${Date.now()}`,
        sender: "ai",
        text: "Pesan Anda diterima oleh Mini Agent A-Taylor. Kami sedang memperbarui status pesanan Anda.",
        time: "Sekarang",
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 800);
  };

  const handleAcc = () => {
    setAccDone(true);
    const accMsg: ChatMessage = {
      id: `m-acc-${Date.now()}`,
      sender: "system",
      text: "[Konfirmasi Sistem] Pelanggan telah menyetujui ACC Desain v2. Slot Locking 24 Jam diaktifkan di OMS. Silakan lakukan pembayaran DP 50% untuk memulai produksi.",
      time: "Sekarang",
    };
    setMessages((prev) => [...prev, accMsg]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-dash-text tracking-tight">Simulasi WhatsApp Bot & Mini Agent</h2>
            <DemoMockBadge />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Sandbox pengujian alur percakapan frontline AI, tangkapan brief otomatis, dan kartu proofing ACC digital
          </p>
        </div>

        {/* Status sakelar BR-21 (diubah Owner di AI Training) */}
        <Link
          href="/ai-training"
          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-dash-line text-xs text-zinc-700 hover:border-dash-primary"
        >
          <span className={`w-2 h-2 rounded-full ${automationMode === "high_on" ? "bg-dash-success" : "bg-zinc-300"}`} />
          WhatsApp otomatis: <strong>{automationMode === "high_on" ? "Aktif" : "Nonaktif"}</strong>
          <span className="text-dash-muted">· atur di AI Training</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {/* Chat Phone Simulator */}
        <div className="lg:col-span-2 bg-[#0b141a] rounded-card shadow-card overflow-hidden border border-transparent flex flex-col h-[520px]">
          {/* WhatsApp Header */}
          <div className="bg-[#202c33] p-3 flex items-center justify-between text-white border-b border-[#2a3942]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                AT
              </div>
              <div>
                <h4 className="font-semibold text-xs text-white">A-Taylor Kendari (Official AI)</h4>
                <p className="text-[10px] text-emerald-400 font-mono">Terhubung • Gemini 2.5 Flash</p>
              </div>
            </div>
            <Phone className="w-4 h-4 text-zinc-300" />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0b141a]">
            {messages.map((m) => {
              if (m.sender === "system") {
                return (
                  <div key={m.id} className="text-center my-1.5">
                    <span className="bg-[#182229] text-amber-300 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded font-mono inline-block">
                      {m.text}
                    </span>
                  </div>
                );
              }

              const isUser = m.sender === "customer";
              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs md:max-w-sm rounded-md p-2.5 text-xs text-zinc-100 ${
                      isUser ? "bg-[#005c4b]" : "bg-[#202c33]"
                    }`}
                  >
                    <p>{m.text}</p>

                    {/* Proofing Card Simulation */}
                    {m.isProofingCard && (
                      <div className="mt-2 p-2.5 rounded bg-[#111b21] border border-zinc-700 space-y-2">
                        <div className="h-24 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 font-mono text-[10px]">
                          [ Preview Mockup Jersey Futsal v2 ]
                        </div>
                        <p className="text-[11px] text-zinc-300 font-medium">
                          Jersey Dryfit Milano Navy/Emas (20 Pcs)
                        </p>

                        {!accDone ? (
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            <button
                              onClick={handleAcc}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Check className="w-3 h-3" /> ACC Desain
                            </button>
                            <button
                              className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Minta Revisi
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-400 font-medium text-center py-1 bg-emerald-950/60 rounded border border-emerald-800 flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Desain telah disetujui (ACC Digital)</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-400 font-mono tabular-nums">
                      <span>{m.time}</span>
                      {isUser && <CheckCheck className="w-3 h-3 text-blue-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="bg-[#202c33] p-2 flex items-center gap-2 border-t border-[#2a3942]">
            <input
              type="text"
              placeholder="Ketik simulasi pesan pelanggan..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-[#2a3942] text-xs text-white px-2.5 py-1.5 rounded-md focus:outline-none placeholder-zinc-400"
            />
            <button
              type="submit"
              className="w-7 h-7 rounded-md bg-zinc-700 text-white flex items-center justify-center shrink-0 hover:bg-zinc-600 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Info: Live Brief Capture */}
        <Card className="h-[520px] flex flex-col justify-between">
          <CardHeader className="px-5 pt-4 pb-1">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900">
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Hasil Ekstraksi AI (Live Brief)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs p-4 flex-1">
            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-2">
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold">Produk:</span>
                <p className="font-semibold text-zinc-800">Jersey Futsal Printing Sublim</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold">Kuantitas:</span>
                <p className="font-mono font-bold text-zinc-800 tabular-nums">20 Pcs (Lolos MOQ 12)</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold">Warna & Bahan:</span>
                <p className="text-zinc-800">Navy Blue & Emas (Dryfit Milano)</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold">Status ACC Digital:</span>
                <p className="font-semibold text-emerald-700">
                  {accDone ? "ACC Tercatat (Slot Kunci 24j)" : "Menunggu Pelanggan"}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Data brief ini otomatis dialirkan oleh FastAPI ke antrean OMS Laravel tanpa intervensi manusia jika mode High Season aktif.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
