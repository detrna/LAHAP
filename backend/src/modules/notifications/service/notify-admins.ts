import type { Notification } from "../domain/notification.domain.js";
import type { NotificationsService } from "./notifications.service.js";
import { toNotification } from "./to-notification.js";

export interface NotifyAdminsInput {
    readonly title: string;
    readonly body: string;
}

export async function notifyAdmins(
    this: NotificationsService,
    input: NotifyAdminsInput,
): Promise<readonly Notification[]> {
    const adminIds = await this.recipients.listActiveUserIds("ADMIN");
    if (adminIds.length === 0) return [];

    const records = await this.notificationsRepository.createNotifications(
        adminIds.map(userId => ({ userId, title: input.title, body: input.body })),
    );
    const notifications = records.map(toNotification);
    await Promise.all(
        notifications.map(notification =>
            this.publishQuietly({ userIds: [notification.userId] }, { event: "notification", data: notification }),
        ),
    );
    return notifications;
}
