import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Notification } from "../domain/notification.domain.js";
import type { NotificationRecord } from "./interfaces/notifications.repository.js";

export function toNotification(record: NotificationRecord): Notification {
    return {
        id: record.id,
        userId: record.userId,
        title: record.title,
        body: record.body,
        isRead: record.isRead,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}
