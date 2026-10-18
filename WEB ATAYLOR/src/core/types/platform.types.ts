import { UserRole } from "@/lib/constants";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface MarketingCloser {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  isActive: boolean;
  totalOrdersCount: number;
  totalRevenue: number;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  waNumber: string;
  automationMode: "high_on" | "low_off"; // BR-21
  subscriptionStatus: "active" | "trial" | "expired";
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}
