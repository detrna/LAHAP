import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";

export async function deleteAnnouncement(this: PrismaNotificationsRepository, id: string): Promise<boolean> {
    try {
        return (await this.db.orm.public.Announcement.where({ id }).deleteAndCount()) > 0;
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("deleteAnnouncement", cause);
    }
}
