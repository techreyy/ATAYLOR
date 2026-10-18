import { apiFetch } from "@/core/api/client";
import type { INotificationRepository } from "@/core/repositories/notification.repository";
import type { NotificationFeed } from "@/core/types/notification.types";

class ApiNotificationAdapter implements INotificationRepository {
  async getFeed() {
    return (await apiFetch<{ data: NotificationFeed }>("/notifications")).data;
  }
}

export const notificationRepository: INotificationRepository = new ApiNotificationAdapter();
