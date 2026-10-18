import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/shell/role-context";

const fontSans = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "A-Taylor Kendari — Omnichannel Konveksi & Production Tracking",
  description: "Sistem Manajemen Konveksi & Tracking Produksi Terintegrasi Agentic AI",
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-screen bg-dash-bg text-dash-text antialiased font-sans">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
