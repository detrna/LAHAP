import { ANNOUNCEMENT_SCOPES, type AnnouncementScope } from "../../domain/announcement.domain.js";
import type { AnnouncementRecord } from "../../service/interfaces/notifications.repository.js";

export interface AnnouncementRow {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly scope: string;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

function toScope(value: string): AnnouncementScope {
    const scope = ANNOUNCEMENT_SCOPES.find(candidate => candidate === value);
    if (scope === undefined) throw new Error(`unknown announcement scope: ${value}`);
    return scope;
}

export function toAnnouncementRecord(row: AnnouncementRow): AnnouncementRecord {
    return {
        id: row.id,
        title: row.title,
        body: row.body,
        scope: toScope(row.scope),
        packageId: row.packageId,
        menuScheduleId: row.menuScheduleId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
