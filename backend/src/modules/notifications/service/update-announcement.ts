import { ValidationError } from "../../../shared/errors/validation-error.js";
import { findAnnouncementTargetIssues } from "../domain/announcement-target.js";
import type { Announcement } from "../domain/announcement.domain.js";
import { AnnouncementNotFoundError, type AnnouncementChanges } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";
import { toAnnouncement } from "./to-announcement.js";

export type UpdateAnnouncementInput = AnnouncementChanges;

export async function updateAnnouncement(
    this: NotificationsService,
    id: string,
    input: UpdateAnnouncementInput,
): Promise<Announcement> {
    const existing = await this.notificationsRepository.findAnnouncementById(id);
    if (existing === null) throw new AnnouncementNotFoundError(id);

    const merged = {
        scope: input.scope ?? existing.scope,
        packageId: input.packageId !== undefined ? input.packageId : existing.packageId,
        menuScheduleId: input.menuScheduleId !== undefined ? input.menuScheduleId : existing.menuScheduleId,
    };
    const issues = findAnnouncementTargetIssues(merged);
    if (issues.length > 0) throw new ValidationError(issues);

    await this.assertTargetsExist({
        packageId: merged.packageId !== existing.packageId ? merged.packageId : null,
        menuScheduleId: merged.menuScheduleId !== existing.menuScheduleId ? merged.menuScheduleId : null,
    });

    const record = await this.notificationsRepository.updateAnnouncement(id, input);
    if (record === null) throw new AnnouncementNotFoundError(id);
    return toAnnouncement(record);
}
