import type { RemovedMealTimes } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findScheduleIdsAtTimes(
    this: PrismaCatalogRepository,
    packageId: string,
    removed: RemovedMealTimes,
): Promise<readonly string[]> {
    if (removed.times.length === 0) return [];

    try {
        const rows = await this.db.orm.public.Schedule.where({ packageId })
            .where(schedule => schedule.date.gte(removed.from))
            .where(schedule => schedule.deliveryTime.in([...removed.times]))
            .select("id")
            .all();
        return rows.map(row => row.id);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findScheduleIdsAtTimes", cause);
    }
}
