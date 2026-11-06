import type { AnnouncementRecord, NewAnnouncementRecord } from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toAnnouncementRecord } from "./to-announcement-record.js";
import { toTargetNotFoundError } from "./target-violation.js";

export async function createAnnouncement(
    this: PrismaNotificationsRepository,
    record: NewAnnouncementRecord,
): Promise<AnnouncementRecord> {
    try {
        const row = await this.db.orm.public.Announcement.create({
            title: record.title,
            body: record.body,
            scope: record.scope,
            packageId: record.packageId,
            menuScheduleId: record.menuScheduleId,
        });
        return toAnnouncementRecord(row);
    } catch (cause) {
        throw (
            toTargetNotFoundError(cause, record) ?? new NotificationsRepositoryFailureError("createAnnouncement", cause)
        );
    }
}
