import { getForeignKeyViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type { NewNotificationRecord, NotificationRecord } from "../../service/interfaces/notifications.repository.js";
import {
    AnnouncementTargetNotFoundError,
    NotificationsRepositoryFailureError,
} from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toNotificationRecord } from "./to-notification-record.js";

export async function createNotification(
    this: PrismaNotificationsRepository,
    record: NewNotificationRecord,
): Promise<NotificationRecord> {
    try {
        const row = await this.db.orm.public.Notification.create({
            userId: record.userId,
            title: record.title,
            body: record.body,
        });
        return toNotificationRecord(row);
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "notification_user_id_fkey") {
            throw new AnnouncementTargetNotFoundError("customer", record.userId, { cause });
        }
        throw new NotificationsRepositoryFailureError("createNotification", cause);
    }
}
