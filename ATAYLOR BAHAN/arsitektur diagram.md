flowchart TB
  subgraph Client["Kanal Pengguna"]
    C1["Pelanggan — WhatsApp"]
    C2["Admin / Kasir / Dispatcher — Browser"]
    C3["Owner — Browser / Mobile"]
    C4["Designer — Browser"]
    C5["Super Admin — Browser"]
  end

  subgraph Edge["Cloudflare — CDN, WAF, DNS (Gratis – Rp316rb/bln)"]
    CF["Reverse Proxy + Proteksi DDoS"]
  end

  subgraph VPS["1x VPS Indonesia — 4 vCPU / 8GB NVMe (±Rp650.000/bln)"]
    NGINX["Nginx Reverse Proxy (gratis)"]
    WEBAPP["Next.js Frontend (gratis, open-source)"]
    LARAVEL["Laravel 11 — OMS · Inventory · CRM · Platform/Tenant · RBAC · Audit (gratis, open-source)"]
    FASTAPI["FastAPI — Frontline AI Agent · Mini Agent · Dynamic Lead Time (gratis, open-source)"]
    REDIS["Redis — queue · cache · session (gratis, self-host)"]
    PG[("PostgreSQL 16 + Row-Level Security (gratis, self-host)")]
  end

  subgraph SaaS["Layanan Pihak Ketiga (bayar sesuai pakai)"]
    WA["WhatsApp Cloud API — ±Rp150.000–300.000/bln"]
    R2[("Cloudflare R2 Storage — ±Rp15.000–50.000/bln")]
    LLM1["Gemini 2.5 Flash — $0,30 / $2,50 per 1 juta token"]
    LLM2["Claude Haiku 4.5 (eskalasi) — $1 / $5 per 1 juta token"]
    SENTRY["Sentry (error tracking) — gratis s.d. 5.000 event/bln"]
    MAIL["Brevo (email transaksional) — gratis s.d. 300/hari"]
  end

  C1 <--> CF
  C2 <--> CF
  C3 <--> CF
  C4 <--> CF
  C5 <--> CF
  CF <--> NGINX
  NGINX --> WEBAPP
  NGINX --> LARAVEL
  NGINX --> FASTAPI
  LARAVEL <--> REDIS
  FASTAPI <--> REDIS
  LARAVEL <--> PG
  FASTAPI <--> PG
  FASTAPI <--> WA
  LARAVEL --> R2
  FASTAPI --> R2
  FASTAPI <--> LLM1
  FASTAPI <--> LLM2
  LARAVEL --> SENTRY
  FASTAPI --> SENTRY
  LARAVEL --> MAIL