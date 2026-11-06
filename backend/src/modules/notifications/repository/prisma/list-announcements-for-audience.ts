import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { and, or } from "@prisma/orm-postgres/orm-client";
import type {
    AnnouncementListRecord,
    AudienceAnnouncementListQuery,
} from "../../service/interfaces/notifications.repository.js";
import { NotificationsRepositoryFailureError } from "../../service/interfaces/notifications.repository.js";
import type { PrismaNotificationsRepository } from "./notifications-repository.js";
import { toAnnouncementRecord } from "./to-announcement-record.js";

export async function listAnnouncementsForAudience(
    this: PrismaNotificationsRepository,
    query: AudienceAnnouncementListQuery,
): Promise<AnnouncementListRecord> {
    const packageIds = query.packageIds as Varchar<36>[];
    const scheduleIds = query.scheduleIds as Varchar<36>[];

    try {
        const matching = () =>
            this.db.orm.public.Announcement.where(item =>
                or(
                    item.scope.eq("GLOBAL"),
                    ...(packageIds.length > 0 ? [and(item.scope.eq("PACKAGE"), item.packageId.in(packageIds))] : []),
                    ...(scheduleIds.length > 0
                        ? [and(item.scope.eq("SCHEDULE"), item.menuScheduleId.in(scheduleIds))]
                        : []),
                ),
            );
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
        throw new NotificationsRepositoryFailureError("listAnnouncementsForAudience", cause);
    }
}
