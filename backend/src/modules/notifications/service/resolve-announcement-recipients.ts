import type { AnnouncementScope } from "../domain/announcement.domain.js";
import type { RealtimeAudience } from "../../realtime/domain/realtime-event.domain.js";
import type { NotificationsService } from "./notifications.service.js";

export interface AnnouncementRecipients {
    readonly audience: RealtimeAudience;
    readonly count: number;
}

export interface AnnouncementRecipientQuery {
    readonly scope: AnnouncementScope;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
}

export async function resolveAnnouncementRecipients(
    this: NotificationsService,
    query: AnnouncementRecipientQuery,
): Promise<AnnouncementRecipients> {
    if (query.scope === "GLOBAL") {
        return { audience: { roles: ["CUSTOMER"] }, count: await this.recipients.countActiveUsers("CUSTOMER") };
    }

    const concerned =
        query.scope === "PACKAGE"
            ? await this.audience.findCustomerIdsForPackage(query.packageId ?? "", this.clock.now().toPlainDate())
            : await this.audience.findCustomerIdsForSchedule(query.menuScheduleId ?? "");
    const userIds = await this.recipients.filterActiveUserIds(concerned, "CUSTOMER");
    return { audience: { userIds }, count: userIds.length };
}
