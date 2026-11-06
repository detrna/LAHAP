import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { applyScheduleUpdates, type UpdateScheduleInput, type UpdateScheduleItem } from "./apply-schedule-updates.js";

export async function updateSchedules(
    this: CatalogService,
    items: readonly UpdateScheduleItem[],
): Promise<readonly MenuSchedule[]> {
    return applyScheduleUpdates(this, items, (index, field) => `items.${index}.${field}`);
}

export async function updateSchedule(
    this: CatalogService,
    id: string,
    input: UpdateScheduleInput,
): Promise<MenuSchedule> {
    const [updated] = await applyScheduleUpdates(this, [{ ...input, id }], (_index, field) => field);
    if (updated === undefined) throw new Error(`schedule ${id} was not returned by its update`);
    return updated;
}
