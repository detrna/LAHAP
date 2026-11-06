import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { OrdersService } from "../orders.service.js";

export interface ExpiryResult {
    readonly expiredCount: number;
}

export async function expirePendingPayments(this: OrdersService): Promise<ExpiryResult> {
    const { paymentTimeoutMinutes } = await this.settings.getSettings();
    const createdBefore = toDbTimestamp(this.clock.now().subtract({ minutes: paymentTimeoutMinutes }));
    const expired = await this.ordersRepository.expirePendingPayments(createdBefore);
    if (expired.length > 0) this.logger.info({ expiredCount: expired.length }, "expired unpaid orders");
    return { expiredCount: expired.length };
}
