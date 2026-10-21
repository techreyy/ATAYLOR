"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/components/ui/error-state";
import { catalogRepository } from "@/core/adapters/api/api-catalog.adapter";
import type { SandboxMessage } from "@/core/repositories/catalog.repository";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Halo kak, polo bordir berapa harganya?",
  "Mau pesan 10 pcs aja bisa?",
  "Kalau 50 pcs bisa diskon 20%?",
  "Bisa selesai tanggal 1 November?",
  "Toko buka jam berapa?",
];

/** Batas server: 30 pesan per percakapan. */
const MAX_MESSAGES = 30;

/**
 * Chat percobaan AI Training dengan LLM sungguhan (Gemini). Owner berperan sebagai pelanggan WhatsApp untuk
 * menguji gaya bahasa dan kepatuhan aturan (harga dari katalog, tanpa diskon, tanpa janji tanggal).
 */
export function AiSandboxChat({ canUse }: { canUse: boolean }) {
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ model: string; tokens: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const full = messages.length >= MAX_MESSAGES - 1;

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending || full) return;
    const next: SandboxMessage[] = [...messages, { role: "user", text: clean.slice(0, 1000) }];
    setMessages(next);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const res = await catalogRepository.sandboxChat(next);
      setMessages([...next, { role: "assistant", text: res.reply }]);
      setMeta({ model: res.model, tokens: res.usage.input + res.usage.output + res.usage.thinking });
    } catch (err) {
      // Pesan pelanggan dikembalikan ke kolom input agar bisa dikirim ulang
      setMessages(messages);
      setInput(clean);
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    setMeta(null);
  };

  return (
    <Card>
      <CardHeader className="px-5 pt-4 pb-1">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-zinc-600" /> Coba Chat AI
        </CardTitle>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8F6E8] text-[#2F7A2F] border border-[#CDEBCD] text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-dash-success animate-pulse" />
          AI sungguhan{meta ? ` · ${meta.model}` : ""}
        </span>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        <p className="text-dash-muted leading-relaxed">
          Berperanlah sebagai pelanggan WhatsApp. AI menjawab memakai katalog di atas, tidak memberi diskon, tidak menjanjikan
          tanggal, dan mengalihkan hal yang tidak ia ketahui ke Admin. Percakapan tidak disimpan dan tidak terkirim ke pelanggan.
        </p>

        {!canUse ? (
          <p className="px-3 py-2 rounded-lg bg-zinc-50 border border-dash-line text-dash-muted">Hanya Owner yang dapat mencoba chat AI.</p>
        ) : (
          <>
            <div ref={listRef} className="h-80 overflow-y-auto rounded-xl bg-dash-bg border border-dash-line p-3 space-y-2" aria-live="polite">
              {messages.length === 0 && !sending && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-dash-muted">
                  <Bot className="w-6 h-6" />
                  <p>Mulai dengan menulis pesan, atau pilih contoh di bawah.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex animate-fade-in", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap shadow-card",
                      m.role === "user" ? "bg-dash-primary-soft text-dash-text rounded-br-md" : "bg-white text-dash-text rounded-bl-md"
                    )}
                  >
                    <span className="block text-[10px] font-semibold text-dash-muted mb-0.5">{m.role === "user" ? "Pelanggan (Anda)" : "AI A-Taylor"}</span>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="px-3 py-2.5 rounded-2xl rounded-bl-md bg-white shadow-card flex gap-1" aria-label="AI sedang mengetik">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-dash-muted animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={sending}
                    onClick={() => send(s)}
                    className="px-2.5 py-1 rounded-full border border-dash-line bg-white text-[11px] text-dash-muted hover:border-dash-primary hover:text-dash-primary-strong hover:bg-dash-primary-soft/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-[11px] text-dash-danger-strong">{error}</p>}
            {full && <p className="text-[11px] text-dash-muted">Percakapan sudah panjang — klik "Mulai ulang" untuk melanjutkan.</p>}

            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                rows={1}
                value={input}
                maxLength={1000}
                disabled={full}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Tulis pesan sebagai pelanggan… (Enter kirim, Shift+Enter baris baru)"
                aria-label="Pesan pelanggan"
                className="flex-1 resize-none px-3 py-2 rounded-lg border border-dash-line bg-white"
              />
              <Button type="submit" variant="primary" size="md" disabled={sending || !input.trim() || full}>
                <Send className="w-3.5 h-3.5" /> Kirim
              </Button>
              <Button type="button" variant="outline" size="md" onClick={reset} disabled={sending || messages.length === 0} title="Mulai ulang percakapan">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </form>
            {meta && <p className="text-[10px] text-dash-muted tabular-nums">Balasan terakhir ± {meta.tokens.toLocaleString("id-ID")} token.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
