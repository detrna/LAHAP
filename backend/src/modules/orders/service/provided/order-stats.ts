import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { OrdersService } from "../orders.service.js";

export async function countPaidServiceDays(this: OrdersService, userId: string): Promise<number> {
    return this.ordersRepository.countPaidServiceDays(userId, PAID_SUBSCRIPTION_STATUSES);
}

export async function sumTierDiscounts(
    this: OrdersService,
    tierIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
    if (tierIds.length === 0) return new Map();
    return this.ordersRepository.sumTierDiscounts([...new Set(tierIds)], PAID_SUBSCRIPTION_STATUSES);
}
