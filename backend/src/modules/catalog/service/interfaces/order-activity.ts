import type { SubscriptionStatus } from "../../../orders/domain/subscription.domain.js";
import type { SubscriptionPeriod } from "../../domain/schedule-moves.js";

export interface OrderActivity {
    countActiveSubscribers(
        packageIds: readonly string[],
        today: Temporal.PlainDate,
    ): Promise<ReadonlyMap<string, number>>;
    findSchedulesWithOrders(
        scheduleIds: readonly string[],
        statuses: readonly SubscriptionStatus[],
    ): Promise<readonly string[]>;
    findSchedulesUsingAlternative(scheduleIds: readonly string[]): Promise<readonly string[]>;
    findSubscriptionPeriods(scheduleIds: readonly string[]): Promise<readonly SubscriptionPeriod[]>;
    deleteInactiveSlots(scheduleIds: readonly string[]): Promise<void>;
}

export const noOrderActivity: OrderActivity = {
    countActiveSubscribers: async () => new Map(),
    findSchedulesWithOrders: async () => [],
    findSchedulesUsingAlternative: async () => [],
    findSubscriptionPeriods: async () => [],
    deleteInactiveSlots: async () => undefined,
};
