import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";

export async function markAllNotificationsRead(this: PrismaNotificationsRepository, userId: string): Promise<number> {
    try {
        return await this.db.orm.public.Notification.where({ userId, isRead: false }).updateAndCount({ isRead: true });
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("markAllNotificationsRead", cause);
    }
}
