import type { NotificationsService } from "../service/notifications.service.js";
import { broadcastNotification } from "./broadcast-notification.js";
import { deleteAnnouncement } from "./delete-announcement.js";
import { getAnnouncement } from "./get-announcement.js";
import { listAnnouncements } from "./list-announcements.js";
import { listMyAnnouncements } from "./list-my-announcements.js";
import { listMyNotifications } from "./list-my-notifications.js";
import { markAllNotificationsRead } from "./mark-all-notifications-read.js";
import { markNotificationRead } from "./mark-notification-read.js";
import { updateAnnouncement } from "./update-announcement.js";

export class NotificationsController {
    constructor(readonly notificationsService: NotificationsService) {}

    listMyNotifications = listMyNotifications.bind(this);
    markNotificationRead = markNotificationRead.bind(this);
    markAllNotificationsRead = markAllNotificationsRead.bind(this);
    listMyAnnouncements = listMyAnnouncements.bind(this);
    broadcastNotification = broadcastNotification.bind(this);
    listAnnouncements = listAnnouncements.bind(this);
    getAnnouncement = getAnnouncement.bind(this);
    updateAnnouncement = updateAnnouncement.bind(this);
    deleteAnnouncement = deleteAnnouncement.bind(this);
}
