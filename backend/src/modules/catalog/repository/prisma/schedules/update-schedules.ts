import type {
    ScheduleChanges,
    ScheduleRecord,
    ScheduleUpdateRecord,
} from "../../../service/interfaces/catalog.repository.js";
import {
    CatalogRepositoryFailureError,
    MenuScheduleNotFoundError,
} from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { schedulesWithMenus } from "./queries.js";
import { readSchedulesInOrder } from "./read-schedules-in-order.js";
import { toScheduleWriteError } from "./schedule-write-errors.js";
import { toScheduleRecord } from "./to-schedule-record.js";
import { writeScheduleMenus } from "./write-schedule-menus.js";

function toScheduleColumns(changes: ScheduleChanges) {
    return {
        ...(changes.date !== undefined ? { date: changes.date } : {}),
        ...(changes.deliveryTime !== undefined ? { deliveryTime: changes.deliveryTime } : {}),
        ...(changes.isPublished !== undefined ? { isPublished: changes.isPublished } : {}),
    };
}

export async function updateSchedules(
    this: PrismaCatalogRepository,
    updates: readonly ScheduleUpdateRecord[],
): Promise<readonly ScheduleRecord[]> {
    try {
        return await this.db.transaction(async tx => {
            for (const { id, changes } of updates) {
                const row = await schedulesWithMenus(tx.orm).where({ id }).first();
                if (row === null) throw new MenuScheduleNotFoundError(id);
                const existing = toScheduleRecord(row);

                const columns = toScheduleColumns(changes);
                if (Object.keys(columns).length > 0) {
                    await tx.orm.public.Schedule.where({ id }).select("id").update(columns);
                }

                if (changes.primaryMenuId !== undefined || changes.alternativeMenuId !== undefined) {
                    await writeScheduleMenus(
                        tx.orm,
                        id,
                        changes.primaryMenuId ?? existing.primaryMenuId,
                        changes.alternativeMenuId !== undefined
                            ? changes.alternativeMenuId
                            : existing.alternativeMenuId,
                    );
                }
            }
            return readSchedulesInOrder(
                tx.orm,
                updates.map(update => update.id),
            );
        });
    } catch (cause) {
        if (cause instanceof MenuScheduleNotFoundError) throw cause;
        const menuIds = updates.flatMap(({ changes }) => [
            changes.primaryMenuId ?? null,
            changes.alternativeMenuId ?? null,
        ]);
        throw toScheduleWriteError(cause, menuIds) ?? new CatalogRepositoryFailureError("updateSchedules", cause);
    }
}
