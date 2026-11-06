import type { Notification } from "../domain/notification.domain.js";
import type { NotificationsService } from "./notifications.service.js";
import { toNotification } from "./to-notification.js";

export interface NotifyUserInput {
    readonly userId: string;
    readonly title: string;
    readonly body: string;
}

export async function notifyUser(this: NotificationsService, input: NotifyUserInput): Promise<Notification> {
    const record = await this.notificationsRepository.createNotification({
        userId: input.userId,
        title: input.title,
        body: input.body,
    });
    const notification = toNotification(record);
    await this.publishQuietly({ userIds: [notification.userId] }, { event: "notification", data: notification });
    return notification;
}
