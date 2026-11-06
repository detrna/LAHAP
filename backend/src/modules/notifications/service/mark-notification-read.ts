import type { Notification } from "../domain/notification.domain.js";
import { NotificationNotFoundError } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";
import { toNotification } from "./to-notification.js";

export async function markNotificationRead(
    this: NotificationsService,
    userId: string,
    id: string,
): Promise<Notification> {
    const record = await this.notificationsRepository.markNotificationRead({ id, userId });
    if (record === null) throw new NotificationNotFoundError(id);
    return toNotification(record);
}
