// Data contoh untuk modul yang masih MOCK (Designer, Inventory, AI Training, Platform).
// Modul OMS, Kasir, Kanban, SPK & Executive memakai API Laravel — lihat core/adapters/api.
import { Product, DesignTicket } from "../types/catalog.types";
import { MarketingCloser, TenantInfo, AuditLog, User } from "../types/platform.types";

export const SEED_TENANT: TenantInfo = {
  id: "tenant-ataylor-01",
  slug: "a-taylor-kendari",
  name: "A-Taylor Konveksi Kendari",
  logoUrl: "/branding/logo-ataylor.svg",
  waNumber: "0812-4567-8901",
  automationMode: "high_on",
  subscriptionStatus: "active",
};

export const SEED_USERS: User[] = [
  { id: "usr-admin-1", tenantId: SEED_TENANT.id, name: "Budi Santoso", email: "admin@ataylor.id", role: "admin", isActive: true },
  { id: "usr-owner-1", tenantId: SEED_TENANT.id, name: "H. Ahmad Fauzi", email: "owner@ataylor.id", role: "owner", isActive: true },
  { id: "usr-mgr-1", tenantId: SEED_TENANT.id, name: "Doni Pratama", email: "manager@ataylor.id", role: "manager", isActive: true },
  { id: "usr-dsg-1", tenantId: SEED_TENANT.id, name: "Rian Desain", email: "designer@ataylor.id", role: "designer", isActive: true },
  { id: "usr-sa-1", tenantId: SEED_TENANT.id, name: "Super Admin Antigravity", email: "super@antigravity.id", role: "super_admin", isActive: true },
];

export const SEED_CLOSERS: MarketingCloser[] = [
  { id: "cls-01", tenantId: SEED_TENANT.id, name: "Rahmat Sales Sentral", phone: "0811-2233-4455", isActive: true, totalOrdersCount: 28, totalRevenue: 84500000 },
  { id: "cls-02", tenantId: SEED_TENANT.id, name: "Siti Marketing Toko", phone: "0822-9988-7766", isActive: true, totalOrdersCount: 19, totalRevenue: 52000000 },
  { id: "cls-03", tenantId: SEED_TENANT.id, name: "Dimas Representative", phone: "0853-1122-3344", isActive: true, totalOrdersCount: 12, totalRevenue: 31000000 },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "prod-01",
    name: "Jersey Printing Sublim Premium",
    category: "Jersey",
    basePrice: 125000,
    moq: 12,
    stdDurationDays: 7,
    dailyCapacity: 150,
    designSlaHours: 24,
    dpMinPercent: 50,
    stockAvailable: 240,
    stockReserved: 40,
  },
  {
    id: "prod-02",
    name: "Kemeja PDL / Lapangan Ripstop",
    category: "Kemeja / PDL",
    basePrice: 185000,
    moq: 24,
    stdDurationDays: 14,
    dailyCapacity: 80,
    designSlaHours: 48,
    dpMinPercent: 50,
    stockAvailable: 110,
    stockReserved: 24,
  },
  {
    id: "prod-03",
    name: "Polo Shirt Lacoste Pique Bordir",
    category: "Polo",
    basePrice: 95000,
    moq: 15,
    stdDurationDays: 10,
    dailyCapacity: 120,
    designSlaHours: 24,
    dpMinPercent: 50,
    stockAvailable: 300,
    stockReserved: 60,
  },
  {
    id: "prod-04",
    name: "Jaket Bomber / Hoodie Fleece",
    category: "Jaket / Hoodie",
    basePrice: 220000,
    moq: 12,
    stdDurationDays: 12,
    dailyCapacity: 60,
    designSlaHours: 36,
    dpMinPercent: 50,
    stockAvailable: 85,
    stockReserved: 12,
  },
];





export const SEED_DESIGN_TICKETS: DesignTicket[] = [
  {
    id: "dsg-t-01",
    orderId: "ord-002",
    orderCode: "ORD-2026-002",
    customerName: "Komunitas Futsal Bahteramas",
    designerName: "Rian Desain",
    stage: "waiting_acc",
    currentVersion: 2,
    revisionsUsed: 1,
    slaCountdownHours: 14,
    mockupUrl: "/mock-assets/jersey-bahteramas-v2.png",
    lastCustomerFeedback: "Tolong ganti warna nomor punggung jadi putih bergaris emas.",
  },
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "aud-01",
    actorName: "Budi Santoso (Admin)",
    action: "VALIDATE_PAYMENT",
    entityType: "Payment",
    entityId: "pay-002",
    details: "Validasi manual DP Rp 2.500.000 untuk ORD-2026-004. Slot kunci permanen diaktifkan.",
    createdAt: "2026-10-17 11:00:00",
  },
  {
    id: "aud-02",
    actorName: "Doni Pratama (Manager)",
    action: "DISPATCH_VENDOR",
    entityType: "SpkDocument",
    entityId: "spk-001",
    details: "SPK-AT-2026-0014 didispatch ke vendor Mitra Sablon Sultra Mandiri. Bahan kain dikirim.",
    createdAt: "2026-10-16 15:00:00",
  },
];
