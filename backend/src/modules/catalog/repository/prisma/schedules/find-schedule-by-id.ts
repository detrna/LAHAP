import type { ScheduleRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { schedulesWithMenus } from "./queries.js";
import { toScheduleRecord } from "./to-schedule-record.js";

export async function findScheduleById(this: PrismaCatalogRepository, id: string): Promise<ScheduleRecord | null> {
    try {
        const row = await schedulesWithMenus(this.db.orm).where({ id }).first();
        return row === null ? null : toScheduleRecord(row);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findScheduleById", cause);
    }
}
