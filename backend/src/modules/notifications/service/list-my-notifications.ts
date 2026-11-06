import type { Notification } from "../domain/notification.domain.js";
import type { NotificationsService } from "./notifications.service.js";
import { toNotification } from "./to-notification.js";

export interface ListMyNotificationsInput {
    readonly isRead?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface NotificationPage {
    readonly items: readonly Notification[];
    readonly total: number;
    readonly unreadCount: number;
}

export async function listMyNotifications(
    this: NotificationsService,
    userId: string,
    input: ListMyNotificationsInput,
): Promise<NotificationPage> {
    const [{ items, total }, unreadCount] = await Promise.all([
        this.notificationsRepository.listNotificationsForUser({ userId, ...input }),
        this.notificationsRepository.countUnreadNotifications(userId),
    ]);
    return { items: items.map(toNotification), total, unreadCount };
}
