import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { NotificationsRepository } from "../../service/interfaces/notifications.repository.js";
import { countUnreadNotifications } from "./count-unread-notifications.js";
import { createAnnouncement } from "./create-announcement.js";
import { createNotification } from "./create-notification.js";
import { createNotifications } from "./create-notifications.js";
import { deleteAnnouncement } from "./delete-announcement.js";
import { findAnnouncementById } from "./find-announcement-by-id.js";
import { listAnnouncements } from "./list-announcements.js";
import { listAnnouncementsForAudience } from "./list-announcements-for-audience.js";
import { listNotificationsForUser } from "./list-notifications-for-user.js";
import { markAllNotificationsRead } from "./mark-all-notifications-read.js";
import { markNotificationRead } from "./mark-notification-read.js";
import { updateAnnouncement } from "./update-announcement.js";

export class PrismaNotificationsRepository implements NotificationsRepository {
    constructor(readonly db: Db) {}

    listNotificationsForUser = listNotificationsForUser;
    countUnreadNotifications = countUnreadNotifications;
    markNotificationRead = markNotificationRead;
    markAllNotificationsRead = markAllNotificationsRead;
    createNotification = createNotification;
    createNotifications = createNotifications;
    createAnnouncement = createAnnouncement;
    findAnnouncementById = findAnnouncementById;
    listAnnouncements = listAnnouncements;
    listAnnouncementsForAudience = listAnnouncementsForAudience;
    updateAnnouncement = updateAnnouncement;
    deleteAnnouncement = deleteAnnouncement;
}
