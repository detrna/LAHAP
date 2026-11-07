import type { LastSuccessSummaryRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function findChurnedCustomers(
    this: OrdersService,
    cutoffDate: Temporal.PlainDate,
): Promise<readonly LastSuccessSummaryRecord[]> {
    const userIds = await this.ordersRepository.findUserIdsWithLastSuccessEndBefore(cutoffDate);
    if (userIds.length === 0) return [];
    return this.ordersRepository.findLastSuccessSummaries(userIds);
}
