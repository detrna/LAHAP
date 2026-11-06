import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { isBeforeCutoff } from "../../domain/cut-off.js";
import type { Subscription } from "../../domain/subscription.domain.js";
import { SubscriptionNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toSubscription } from "../present.js";

export async function cancelSubscription(this: OrdersService, userId: string, id: string): Promise<Subscription> {
    const record = await this.ordersRepository.findSubscriptionById(id);
    if (record === null || record.userId !== userId) throw new SubscriptionNotFoundError();
    if (record.status !== "Pending" && record.status !== "Success") {
        throw new InvalidStateError("subscription cannot be cancelled");
    }
    const now = this.clock.now();
    if (!isBeforeCutoff(now, record.startDate)) throw new InvalidStateError("cut-off has passed");

    const wasPaid = record.status === "Success";
    const cancelled = await this.ordersRepository.cancelSubscription({
        subscriptionId: id,
        expectedStatus: record.status,
        needsRefund: wasPaid,
        expirePendingPayments: !wasPaid,
    });
    if (cancelled === null) throw new InvalidStateError("subscription changed, try again");

    if (wasPaid) {
        await this.afterSubscriptionCancelled(
            cancelled,
            "Pesananmu dibatalkan. Dana akan dikembalikan secara manual oleh admin.",
        );
    } else {
        await this.notifier
            .notifyUser({ userId, title: "Pesanan dibatalkan", body: "Pesananmu yang belum dibayar sudah dibatalkan." })
            .catch((err: unknown) => {
                this.logger.warn({ err, userId }, "cancellation notification failed");
            });
    }
    return toSubscription(cancelled, now.toPlainDate());
}
