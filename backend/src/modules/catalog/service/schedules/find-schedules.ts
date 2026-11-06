import type { ScheduleSummary } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { ScheduleFilter } from "../interfaces/catalog.repository.js";
import { toScheduleSummary } from "./to-schedule.js";

export async function findSchedules(this: CatalogService, filter: ScheduleFilter): Promise<readonly ScheduleSummary[]> {
    const records = await this.catalogRepository.findSchedules(
        filter.ids !== undefined ? { ...filter, ids: [...new Set(filter.ids)] } : filter,
    );
    return records.map(toScheduleSummary);
}
