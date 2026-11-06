import type { SubscriptionStatus } from "../../../orders/domain/subscription.domain.js";

export interface OrderActivity {
    countActiveSubscribers(
        packageIds: readonly string[],
        today: Temporal.PlainDate,
    ): Promise<ReadonlyMap<string, number>>;
    findSchedulesWithOrders(
        scheduleIds: readonly string[],
        statuses: readonly SubscriptionStatus[],
    ): Promise<readonly string[]>;
}

export const noOrderActivity: OrderActivity = {
    countActiveSubscribers: async () => new Map(),
    findSchedulesWithOrders: async () => [],
};
