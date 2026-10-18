export type NotificationSeverity = "danger" | "warning" | "info";

export interface NotificationItem {
  id: string;
  type:
    | "payment_pending"
    | "slot_lock_expiring"
    | "ready_for_spk"
    | "design_sla"
    | "overdue"
    | "awaiting_settlement"
    | "spk_not_dispatched";
  severity: NotificationSeverity;
  title: string;
  message: string;
  orderCode: string;
  href: string;
  at: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  /** Jumlah seluruh item (daftar dibatasi 30) */
  total: number;
  /** Jumlah item berstatus danger */
  urgent: number;
}
