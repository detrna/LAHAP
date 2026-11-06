import type {
    NotificationListQuery,
    NotificationListRecord,
} from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toNotificationRecord } from "./to-notification-record.js";

export async function listNotificationsForUser(
    this: PrismaNotificationsRepository,
    query: NotificationListQuery,
): Promise<NotificationListRecord> {
    try {
        const matching = () => {
            const notifications = this.db.orm.public.Notification.where({ userId: query.userId });
            return query.isRead === undefined ? notifications : notifications.where({ isRead: query.isRead });
        };
        const [rows, totals] = await Promise.all([
            matching()
                .orderBy([item => item.createdAt.desc(), item => item.id.desc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching().aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toNotificationRecord), total: totals.total };
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("listNotificationsForUser", cause);
    }
}
