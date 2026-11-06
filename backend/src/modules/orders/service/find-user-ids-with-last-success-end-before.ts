import type { OrdersService } from "./orders.service.js";

export async function findUserIdsWithLastSuccessEndBefore(
    this: OrdersService,
    date: Temporal.PlainDate,
): Promise<readonly string[]> {
    return this.ordersRepository.findUserIdsWithLastSuccessEndBefore(date);
}
