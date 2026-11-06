import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";

export async function countUnreadNotifications(this: PrismaNotificationsRepository, userId: string): Promise<number> {
    try {
        const totals = await this.db.orm.public.Notification.where({ userId, isRead: false }).aggregate(aggregate => ({
            total: aggregate.count(),
        }));
        return totals.total;
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("countUnreadNotifications", cause);
    }
}
