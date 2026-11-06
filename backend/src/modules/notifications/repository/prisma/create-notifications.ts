import type { NewNotificationRecord, NotificationRecord } from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toNotificationRecord } from "./to-notification-record.js";

export async function createNotifications(
    this: PrismaNotificationsRepository,
    records: readonly NewNotificationRecord[],
): Promise<readonly NotificationRecord[]> {
    if (records.length === 0) return [];
    try {
        const rows = await this.db.orm.public.Notification.createAll(
            records.map(record => ({ userId: record.userId, title: record.title, body: record.body })),
        );
        return rows.map(toNotificationRecord);
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("createNotifications", cause);
    }
}
