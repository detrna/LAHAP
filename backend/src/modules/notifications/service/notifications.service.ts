import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { Logger } from "../../../shared/ports/logger/logger.js";
import { countUnread } from "./count-unread.js";
import { announce } from "./announce.js";
import { assertTargetsExist } from "./assert-targets-exist.js";
import { broadcast } from "./broadcast.js";
import { deleteAnnouncement } from "./delete-announcement.js";
import { getAnnouncement } from "./get-announcement.js";
import type { AnnouncementAudience } from "./interfaces/announcement-audience.js";
import type { AnnouncementTargets } from "./interfaces/announcement-targets.js";
import type { NotificationsRepository } from "./interfaces/notifications.repository.js";
import type { RealtimePublisher } from "./interfaces/realtime-publisher.js";
import type { RecipientDirectory } from "./interfaces/recipient-directory.js";
import { listAnnouncements } from "./list-announcements.js";
import { listMyAnnouncements } from "./list-my-announcements.js";
import { listMyNotifications } from "./list-my-notifications.js";
import { markAllNotificationsRead } from "./mark-all-notifications-read.js";
import { markNotificationRead } from "./mark-notification-read.js";
import { notifyAdmins } from "./notify-admins.js";
import { notifyUser } from "./notify-user.js";
import { publishQuietly } from "./publish-quietly.js";
import { resolveAnnouncementRecipients } from "./resolve-announcement-recipients.js";
import { updateAnnouncement } from "./update-announcement.js";

export class NotificationsService {
    constructor(
        readonly notificationsRepository: NotificationsRepository,
        readonly realtime: RealtimePublisher,
        readonly recipients: RecipientDirectory,
        readonly targets: AnnouncementTargets,
        readonly audience: AnnouncementAudience,
        readonly clock: Clock,
        readonly logger: Logger,
    ) {}

    listMyNotifications = listMyNotifications;
    markNotificationRead = markNotificationRead;
    markAllNotificationsRead = markAllNotificationsRead;
    countUnread = countUnread;
    notifyUser = notifyUser;
    notifyAdmins = notifyAdmins;
    announce = announce;
    broadcast = broadcast;
    listMyAnnouncements = listMyAnnouncements;
    listAnnouncements = listAnnouncements;
    getAnnouncement = getAnnouncement;
    updateAnnouncement = updateAnnouncement;
    deleteAnnouncement = deleteAnnouncement;
    publishQuietly = publishQuietly;
    resolveAnnouncementRecipients = resolveAnnouncementRecipients;
    assertTargetsExist = assertTargetsExist;
}
