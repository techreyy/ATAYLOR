"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Factory, Lock, Mail, MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo, BrandWordmark } from "@/components/logo";
import { USER_ROLES, UserRole } from "@/lib/constants";
import { useRole } from "@/components/shell/role-context";
import { errorMessage } from "@/components/ui/error-state";
// Masuk cepat akun demo hanya di mode demo
import { DEMO_MODE } from "@/lib/app-mode";

const HIGHLIGHTS = [
  { icon: MessageCircle, title: "Pesanan WA & Toko", text: "Online dan offline masuk satu antrean terpusat." },
  { icon: Wallet, title: "Kasir & SPK", text: "Validasi bukti bayar, kunci kuota, terbitkan SPK pabrik." },
  { icon: Factory, title: "Produksi Real-time", text: "Pantau tiap tahap jahit sampai tiba di gudang." },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, setActiveRole } = useRole();
  const [email, setEmail] = useState(DEMO_MODE ? "admin@ataylor.demo" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => login(email, password));
  };

  const inputCls =
    "w-full pl-10 pr-3 py-3 text-sm rounded-lg bg-white border border-[#CED4DA] text-dash-text placeholder:text-[#c9c8c8]";

  return (
    <div className="min-h-screen bg-dash-bg lg:grid lg:grid-cols-[1.2fr_1fr]">
      {/* Panel brand — hanya desktop (≥ 1024px); di HP/tablet halaman tetap satu kartu */}
      <aside className="hidden lg:flex relative overflow-hidden bg-dash-charcoal text-white px-12 py-12 xl:px-16 flex-col justify-between">
        <span className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-dash-primary/15 animate-drift" />
        <span className="absolute -left-20 bottom-[-120px] w-[26rem] h-[26rem] rounded-full bg-white/5 animate-drift-slow" />
        <span className="absolute right-[22%] bottom-[28%] w-3 h-3 rounded-full bg-dash-primary/70 animate-float" />

        <div className="relative flex items-center gap-3 animate-fade-in">
          <span className="w-8 h-1 rounded-full bg-dash-primary" />
          <span className="text-sm font-bold tracking-[0.2em] uppercase text-white/80">A-Taylor Kendari</span>
        </div>

        <div className="relative max-w-lg reveal-stagger">
          <Image src="/logo.png" alt="Logo A-Taylor" width={112} height={112} priority className="object-contain animate-float mb-6" />
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Pusat kendali konveksi, <span className="text-dash-primary">dari chat sampai jahitan terakhir.</span>
          </h1>
          <p className="text-sm text-white/70 mt-4 leading-relaxed">
            Omnichannel & Production Tracking — pesanan, pembayaran, SPK, dan lantai produksi dalam satu sistem.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-dash-primary text-dash-ink flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-white/60 mt-0.5">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/40">© A-Taylor Kendari · Sejak 2020</p>
      </aside>

      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ornamen lingkaran lembut, melayang pelan */}
        <span className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-dash-primary/25 animate-drift" />
        <span className="absolute -right-20 bottom-[-80px] w-96 h-96 rounded-full bg-dash-charcoal/10 animate-drift-slow" />

        <div className="relative max-w-md w-full bg-white rounded-card shadow-card-hover px-8 py-10 sm:px-12 animate-scale-in reveal-stagger">
          {/* Brand Header */}
          <div className="flex items-center gap-1.5 mb-8">
            <div className="flex items-center justify-center shrink-0">
              <BrandLogo size="sm" priority />
            </div>
            <BrandWordmark height={40} priority />
          </div>

          <div>
            <h2 className="text-lg font-bold text-dash-text">Halo! Mari mulai</h2>
            <p className="text-sm text-dash-muted mb-6">Masuk ke portal operasional (khusus staf toko).</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[#FFECEC] border border-[#FFD3D3] text-[#C62F2F] text-xs animate-slide-down" role="alert">
                {error}
              </div>
            )}

            <div className="relative">
              <label htmlFor="email" className="sr-only">Email</label>
              <Mail className="w-4 h-4 text-dash-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">Kata Sandi</label>
              <Lock className="w-4 h-4 text-dash-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </div>

            <Button variant="primary" type="submit" size="lg" className="w-full uppercase tracking-wider py-3" disabled={busy}>
              {busy ? "Memproses..." : "Masuk"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Akun demo presentasi */}
          {DEMO_MODE && (
            <div className="mt-7 pt-5 border-t border-dash-line">
              <p className="text-[11px] font-bold uppercase tracking-wider text-dash-muted mb-2.5">
                Masuk cepat akun demo <span className="normal-case font-normal">(sandi: <span className="font-mono">ataylor123</span>)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {USER_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => setActiveRole(role.id as UserRole))}
                    className="text-left px-3 py-2 rounded-lg border border-dash-line bg-white text-xs font-semibold text-dash-muted hover:border-dash-primary hover:text-dash-primary-strong hover:bg-dash-primary-soft/50 hover:-translate-y-px disabled:opacity-50 transition-all duration-200"
                    title={role.description}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Di desktop teks ini sudah ada di panel brand */}
          <p className="text-center text-[11px] text-dash-muted font-mono mt-6 lg:hidden">
            © A-Taylor Kendari · Sejak 2020
          </p>
        </div>
      </main>
    </div>
  );
}
