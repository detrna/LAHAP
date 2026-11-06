import type { OrdersService } from "../orders.service.js";

export async function findLastSuccessEndDates(
    this: OrdersService,
    userIds: readonly string[],
): Promise<ReadonlyMap<string, Temporal.PlainDate>> {
    if (userIds.length === 0) return new Map();
    return this.ordersRepository.findLastSuccessEndDates([...new Set(userIds)]);
}
