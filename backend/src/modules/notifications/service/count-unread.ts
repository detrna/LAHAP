import type { NotificationsService } from "./notifications.service.js";

export async function countUnread(this: NotificationsService, userId: string): Promise<number> {
    return this.notificationsRepository.countUnreadNotifications(userId);
}
