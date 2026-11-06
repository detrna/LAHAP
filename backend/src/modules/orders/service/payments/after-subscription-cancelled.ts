import type { SubscriptionRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function afterSubscriptionCancelled(
    this: OrdersService,
    subscription: SubscriptionRecord,
    body: string,
): Promise<void> {
    const { userId } = subscription;
    await Promise.all([
        this.tierDiscounts.reevaluate(userId, { renewWindow: false }).catch((err: unknown) => {
            this.logger.warn({ err, userId }, "tier re-evaluation failed after a cancellation");
        }),
        this.notifier.notifyUser({ userId, title: "Pesanan dibatalkan", body }).catch((err: unknown) => {
            this.logger.warn({ err, userId }, "cancellation notification failed");
        }),
    ]);
}
