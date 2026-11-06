import type { SubscriptionCancellation, SubscriptionRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toSubscriptionRecord } from "../to-records.js";

export async function cancelSubscription(
    this: PrismaOrdersRepository,
    cancellation: SubscriptionCancellation,
): Promise<SubscriptionRecord | null> {
    const { subscriptionId, expectedStatus, needsRefund, expirePendingPayments } = cancellation;
    try {
        return await this.db.transaction(async tx => {
            const [cancelled] = await tx.orm.public.Subscription.where({
                id: subscriptionId,
                status: expectedStatus,
            }).updateAll({ status: "Dibatalkan", needsRefund });
            if (cancelled === undefined) return null;
            if (expirePendingPayments) {
                await tx.orm.public.Payment.where({ subscriptionId, status: "Pending" }).updateAll({
                    status: "Expire",
                });
            }
            return toSubscriptionRecord(cancelled);
        });
    } catch (cause) {
        throw new OrdersRepositoryFailureError("cancelSubscription", cause);
    }
}
