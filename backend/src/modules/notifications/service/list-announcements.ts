import type { AnnouncementScope } from "../domain/announcement.domain.js";
import type { AnnouncementPage } from "./list-my-announcements.js";
import type { NotificationsService } from "./notifications.service.js";
import { toAnnouncement } from "./to-announcement.js";

export interface AdminListAnnouncementsInput {
    readonly scope?: AnnouncementScope | undefined;
    readonly packageId?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export async function listAnnouncements(
    this: NotificationsService,
    input: AdminListAnnouncementsInput,
): Promise<AnnouncementPage> {
    const { items, total } = await this.notificationsRepository.listAnnouncements(input);
    return { items: items.map(toAnnouncement), total };
}
