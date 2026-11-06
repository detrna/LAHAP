import type { Announcement } from "../domain/announcement.domain.js";
import type { NotificationsService } from "./notifications.service.js";
import { toAnnouncement } from "./to-announcement.js";

export interface ListAnnouncementsInput {
    readonly skip: number;
    readonly take: number;
}

export interface AnnouncementPage {
    readonly items: readonly Announcement[];
    readonly total: number;
}

export async function listMyAnnouncements(
    this: NotificationsService,
    userId: string,
    input: ListAnnouncementsInput,
): Promise<AnnouncementPage> {
    const { packageIds, scheduleIds } = await this.audience.findAnnouncementTargetsOf(
        userId,
        this.clock.now().toPlainDate(),
    );
    const { items, total } = await this.notificationsRepository.listAnnouncementsForAudience({
        packageIds,
        scheduleIds,
        ...input,
    });
    return { items: items.map(toAnnouncement), total };
}
