import type {
    AnnouncementListQuery,
    AnnouncementListRecord,
} from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toAnnouncementRecord } from "./to-announcement-record.js";

export async function listAnnouncements(
    this: PrismaNotificationsRepository,
    query: AnnouncementListQuery,
): Promise<AnnouncementListRecord> {
    try {
        const matching = () => {
            let announcements = this.db.orm.public.Announcement;
            if (query.scope !== undefined) announcements = announcements.where({ scope: query.scope });
            if (query.packageId !== undefined) announcements = announcements.where({ packageId: query.packageId });
            return announcements;
        };
        const [rows, totals] = await Promise.all([
            matching()
                .orderBy([item => item.createdAt.desc(), item => item.id.desc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching().aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toAnnouncementRecord), total: totals.total };
    } catch (cause) {
        throw new NotificationsRepositoryFailureError("listAnnouncements", cause);
    }
}
