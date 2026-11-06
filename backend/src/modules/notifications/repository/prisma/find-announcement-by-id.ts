import type { AnnouncementRecord } from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toAnnouncementRecord } from "./to-announcement-record.js";

export async function findAnnouncementById(
    this: PrismaNotificationsRepository,
    id: string,
): Promise<AnnouncementRecord | null> {
    try {
        const row = await this.db.orm.public.Announcement.where({ id }).first();
        return row === null ? null : toAnnouncementRecord(row);
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("findAnnouncementById", cause);
    }
}
