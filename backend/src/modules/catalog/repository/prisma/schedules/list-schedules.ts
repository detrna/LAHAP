import type { ScheduleListQuery, ScheduleListRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { filterSchedules, schedulesWithMenus } from "./queries.js";
import { toScheduleRecord } from "./to-schedule-record.js";

export async function listSchedules(
    this: PrismaCatalogRepository,
    query: ScheduleListQuery,
): Promise<ScheduleListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            filterSchedules(schedulesWithMenus(this.db.orm), query)
                .orderBy([
                    schedule => schedule.date.asc(),
                    schedule => schedule.deliveryTime.asc(),
                    schedule => schedule.id.asc(),
                ])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            filterSchedules(this.db.orm.public.Schedule, query).aggregate(aggregate => ({
                total: aggregate.count(),
            })),
        ]);
        return { items: rows.map(toScheduleRecord), total: totals.total };
    } catch (cause) {
        throw new CatalogRepositoryFailureError("listSchedules", cause);
    }
}
