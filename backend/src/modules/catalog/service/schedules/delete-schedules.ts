import type { BatchDeleteResult } from "../../../../shared/response/batch-result.js";
import type { CatalogService } from "../catalog.service.js";
import { MenuScheduleNotFoundError, ScheduleInUseError } from "../interfaces/catalog.repository.js";

export async function deleteSchedules(this: CatalogService, ids: readonly string[]): Promise<BatchDeleteResult> {
    const missing = await this.catalogRepository.findMissingScheduleIds(ids);
    if (missing[0] !== undefined) throw new MenuScheduleNotFoundError(missing[0]);

    const active = await this.orderActivity.findSchedulesWithOrders(ids, ["Pending", "Success"]);
    if (active.length > 0) throw new ScheduleInUseError();

    await this.orderActivity.deleteInactiveSlots(ids);
    return { deletedCount: await this.catalogRepository.deleteSchedules(ids) };
}
