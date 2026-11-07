import type { ScheduleSummary } from "../../catalog/domain/schedule.domain.js";
import type { KitchenSlot, ServedSlot } from "./to-cook-source.js";

export function toServedSlots(
    slots: readonly KitchenSlot[],
    schedules: readonly ScheduleSummary[],
): readonly ServedSlot[] {
    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
    const served: ServedSlot[] = [];
    for (const slot of slots) {
        const schedule = scheduleById.get(slot.menuScheduleId);
        if (schedule === undefined || schedule.primaryMenuId === null) continue;
        const servedMenuId = slot.usesAlternativeMenu ? schedule.alternativeMenuId : schedule.primaryMenuId;
        if (servedMenuId === null) continue;
        served.push({ slot, schedule, primaryMenuId: schedule.primaryMenuId, servedMenuId });
    }
    return served;
}
