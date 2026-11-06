import type { Announcement } from "../domain/announcement.domain.js";
import { AnnouncementNotFoundError } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";
import { toAnnouncement } from "./to-announcement.js";

export async function getAnnouncement(this: NotificationsService, id: string): Promise<Announcement> {
    const record = await this.notificationsRepository.findAnnouncementById(id);
    if (record === null) throw new AnnouncementNotFoundError(id);
    return toAnnouncement(record);
}
