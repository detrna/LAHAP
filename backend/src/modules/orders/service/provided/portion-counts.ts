import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import { COOKED_SLOT_STATUSES } from "../../domain/slot-status.js";
import type { OrdersService } from "../orders.service.js";

export interface SchedulePortionCount {
    readonly scheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly portions: number;
}

export async function countPortionsBySchedule(
    this: OrdersService,
    scheduleIds: readonly string[],
): Promise<readonly SchedulePortionCount[]> {
    if (scheduleIds.length === 0) return [];
    const counts = await this.ordersRepository.countPortions({
        menuScheduleIds: [...new Set(scheduleIds)],
        statuses: COOKED_SLOT_STATUSES,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    return counts.map(({ menuScheduleId, usesAlternativeMenu, portions }) => ({
        scheduleId: menuScheduleId,
        usesAlternativeMenu,
        portions,
    }));
}
