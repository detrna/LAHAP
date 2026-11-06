import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Announcement } from "../domain/announcement.domain.js";
import type { AnnouncementRecord } from "./interfaces/notifications.repository.js";

export function toAnnouncement(record: AnnouncementRecord): Announcement {
    return {
        id: record.id,
        title: record.title,
        body: record.body,
        scope: record.scope,
        packageId: record.packageId,
        menuScheduleId: record.menuScheduleId,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}
