import type { NotificationRecord } from "../../service/interfaces/notifications.repository.js";

export interface NotificationRow {
    readonly id: string;
    readonly userId: string;
    readonly title: string;
    readonly body: string;
    readonly isRead: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toNotificationRecord(row: NotificationRow): NotificationRecord {
    return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        body: row.body,
        isRead: row.isRead,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
