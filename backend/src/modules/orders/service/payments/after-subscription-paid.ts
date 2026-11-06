import type { SubscriptionRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function afterSubscriptionPaid(this: OrdersService, subscription: SubscriptionRecord): Promise<void> {
    const { userId } = subscription;
    await Promise.all([
        this.tierDiscounts.reevaluate(userId, { renewWindow: true }).catch((err: unknown) => {
            this.logger.warn({ err, userId }, "tier re-evaluation failed after a payment");
        }),
        this.notifier
            .notifyUser({
                userId,
                title: "Pembayaran berhasil",
                body: `Pesananmu sudah dibayar. Slot pertama dijadwalkan pada ${subscription.startDate.toString()}.`,
            })
            .catch((err: unknown) => {
                this.logger.warn({ err, userId }, "payment notification failed");
            }),
    ]);
}
