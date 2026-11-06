import type { AnnouncementChanges, AnnouncementRecord } from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toTargetNotFoundError } from "./target-violation.js";
import { toAnnouncementRecord } from "./to-announcement-record.js";

function toAnnouncementColumns(changes: AnnouncementChanges) {
    return {
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.body !== undefined ? { body: changes.body } : {}),
        ...(changes.scope !== undefined ? { scope: changes.scope } : {}),
        ...(changes.packageId !== undefined ? { packageId: changes.packageId } : {}),
        ...(changes.menuScheduleId !== undefined ? { menuScheduleId: changes.menuScheduleId } : {}),
    };
}

export async function updateAnnouncement(
    this: PrismaNotificationsRepository,
    id: string,
    changes: AnnouncementChanges,
): Promise<AnnouncementRecord | null> {
    try {
        const columns = toAnnouncementColumns(changes);
        const target = this.db.orm.public.Announcement.where({ id });
        const row = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
        return row === null ? null : toAnnouncementRecord(row);
    } catch (cause) {
        throw (
            toTargetNotFoundError(cause, changes) ??
            new NotificationsRepositoryFailureError("updateAnnouncement", cause)
        );
    }
}
