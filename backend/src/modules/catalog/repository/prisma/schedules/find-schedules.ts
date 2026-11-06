import type { ScheduleFilter, ScheduleRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { filterSchedules, schedulesWithMenus } from "./queries.js";
import { toScheduleRecord } from "./to-schedule-record.js";

export async function findSchedules(
    this: PrismaCatalogRepository,
    filter: ScheduleFilter,
): Promise<readonly ScheduleRecord[]> {
    if (filter.ids !== undefined && filter.ids.length === 0) return [];

    try {
        const rows = await filterSchedules(schedulesWithMenus(this.db.orm), filter)
            .orderBy([
                schedule => schedule.date.asc(),
                schedule => schedule.deliveryTime.asc(),
                schedule => schedule.id.asc(),
            ])
            .all();
        return rows.map(toScheduleRecord);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findSchedules", cause);
    }
}
