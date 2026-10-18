import type { Config } from "tailwindcss";

/**
 * Tema Skydash (layout dari skydash-free) dengan warna emas logo A-Taylor (tanpa ungu/violet)
 * diterjemahkan ke Tailwind. Token warna dipakai lewat prefix `dash-*`.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dash: {
          primary: "#F5B800", // emas benang logo A-Taylor
          "primary-strong": "#9A6B00", // teks/link emas di atas putih (kontras cukup)
          ink: "#1F1F1F", // teks di atas latar emas
          "primary-hover": "#E0A700",
          "primary-soft": "#FFF5D1",
          bg: "#F7F6F2",
          line: "#ECEAE3",
          hover: "#F3F0E6",
          muted: "#6C7383",
          text: "#1F1F1F",
          // Kartu KPI khas Skydash
          tale: "#7DA0FA",
          charcoal: "#232227",
          "light-danger": "#F3797E",
          sky: "#98BDFF",
          // Warna semantik
          success: "#57B657",
          warning: "#FFC100",
          danger: "#FF4747",
          info: "#248AFD",
        },
        cobalt: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1a73e8",
          600: "#1557b0",
          700: "#10438a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Nunito", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(31, 31, 31, 0.04)",
        "card-hover": "0 12px 28px -14px rgba(31, 31, 31, 0.22)",
        navbar: "0 4px 18px -10px rgba(190, 184, 168, 0.6)",
        sidebar: "6px 16px 31px -18px #c9c3b2",
        primary: "0 8px 18px -8px rgba(245, 184, 0, 0.55)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "grow-up": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        "grow-right": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.4s linear infinite",
        "grow-up": "grow-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "grow-right": "grow-right 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
