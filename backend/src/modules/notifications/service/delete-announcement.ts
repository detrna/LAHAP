import { AnnouncementNotFoundError } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";

export async function deleteAnnouncement(this: NotificationsService, id: string): Promise<void> {
    const deleted = await this.notificationsRepository.deleteAnnouncement(id);
    if (!deleted) throw new AnnouncementNotFoundError(id);
}
