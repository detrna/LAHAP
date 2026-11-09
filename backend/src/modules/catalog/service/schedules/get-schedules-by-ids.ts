import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";

export async function getSchedulesByIds(
    this: CatalogService,
    ids: readonly string[],
): Promise<readonly MenuSchedule[]> {
    if (ids.length === 0) return [];
    const records = await this.catalogRepository.findSchedules({ ids: [...new Set(ids)] });
    return this.presentSchedules(records, "customer");
}
