import type { NotificationRecord } from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toNotificationRecord } from "./to-notification-record.js";

export async function markNotificationRead(
    this: PrismaNotificationsRepository,
    input: { readonly id: string; readonly userId: string },
): Promise<NotificationRecord | null> {
    try {
        const row = await this.db.orm.public.Notification.where({ id: input.id, userId: input.userId }).update({
            isRead: true,
        });
        return row === null ? null : toNotificationRecord(row);
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("markNotificationRead", cause);
    }
}
