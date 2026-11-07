import type { LastSuccessSummaryRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function getLastSuccessSummary(
    this: OrdersService,
    userId: string,
): Promise<LastSuccessSummaryRecord | null> {
    const [summary] = await this.ordersRepository.findLastSuccessSummaries([userId]);
    return summary ?? null;
}
