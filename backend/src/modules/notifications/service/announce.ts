import { ValidationError } from "../../../shared/errors/validation-error.js";
import { findAnnouncementTargetIssues } from "../domain/announcement-target.js";
import type { Announcement, AnnouncementScope } from "../domain/announcement.domain.js";
import type { NotificationsService } from "./notifications.service.js";
import { toAnnouncement } from "./to-announcement.js";

export interface AnnounceInput {
    readonly scope: AnnouncementScope;
    readonly packageId?: string | null | undefined;
    readonly menuScheduleId?: string | null | undefined;
    readonly title: string;
    readonly body: string;
}

export interface AnnounceResult {
    readonly announcement: Announcement;
    readonly recipientCount: number;
}

export async function announce(this: NotificationsService, input: AnnounceInput): Promise<AnnounceResult> {
    const target = {
        scope: input.scope,
        packageId: input.packageId ?? null,
        menuScheduleId: input.menuScheduleId ?? null,
    };
    const issues = findAnnouncementTargetIssues(target);
    if (issues.length > 0) throw new ValidationError(issues);

    const recipients = await this.resolveAnnouncementRecipients(target);
    const record = await this.notificationsRepository.createAnnouncement({
        title: input.title,
        body: input.body,
        ...target,
    });
    const announcement = toAnnouncement(record);
    await this.publishQuietly(recipients.audience, { event: "announcement", data: announcement });
    return { announcement, recipientCount: recipients.count };
}
