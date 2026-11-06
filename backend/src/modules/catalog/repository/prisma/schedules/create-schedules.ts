import type { NewScheduleRecord, ScheduleRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { readSchedulesInOrder } from "./read-schedules-in-order.js";
import { toScheduleWriteError } from "./schedule-write-errors.js";
import { writeScheduleMenus } from "./write-schedule-menus.js";

export async function createSchedules(
    this: PrismaCatalogRepository,
    records: readonly NewScheduleRecord[],
): Promise<readonly ScheduleRecord[]> {
    try {
        return await this.db.transaction(async tx => {
            const ids: string[] = [];
            for (const record of records) {
                const created = await tx.orm.public.Schedule.create({
                    packageId: record.packageId,
                    date: record.date,
                    deliveryTime: record.deliveryTime,
                    isPublished: record.isPublished,
                });
                await writeScheduleMenus(tx.orm, created.id, record.primaryMenuId, record.alternativeMenuId);
                ids.push(created.id);
            }
            return readSchedulesInOrder(tx.orm, ids);
        });
    } catch (cause) {
        const menuIds = records.flatMap(record => [record.primaryMenuId, record.alternativeMenuId]);
        throw toScheduleWriteError(cause, menuIds) ?? new CatalogRepositoryFailureError("createSchedules", cause);
    }
}
