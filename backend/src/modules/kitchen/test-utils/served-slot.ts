import type { ScheduleSummary } from "../../catalog/domain/schedule.domain.js";
import { buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import type { ServedSlot, KitchenSlot } from "../domain/to-cook-source.js";
import { buildKitchenSlot } from "./factory/kitchen.factory.js";

export interface ServedSlotOverrides {
    readonly schedule?: Partial<ScheduleSummary> | undefined;
    readonly slot?: Partial<KitchenSlot> | undefined;
}

export function buildServedSlot({
    schedule: scheduleOverrides,
    slot: slotOverrides,
}: ServedSlotOverrides = {}): ServedSlot {
    const schedule = buildScheduleSummary({ primaryMenuId: "m-1", alternativeMenuId: "m-2", ...scheduleOverrides });
    const slot = buildKitchenSlot({ menuScheduleId: schedule.id, ...slotOverrides });
    const primaryMenuId = schedule.primaryMenuId ?? "";
    const alternativeMenuId = schedule.alternativeMenuId ?? "";
    return {
        slot,
        schedule,
        primaryMenuId,
        servedMenuId: slot.usesAlternativeMenu ? alternativeMenuId : primaryMenuId,
    };
}
