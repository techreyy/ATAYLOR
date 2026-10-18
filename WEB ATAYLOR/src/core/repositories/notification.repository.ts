import type { NotificationFeed } from "../types/notification.types";

export interface INotificationRepository {
  /** Hal yang perlu ditindaklanjuti sesuai peran, dihitung server dari data terkini. */
  getFeed(): Promise<NotificationFeed>;
}
