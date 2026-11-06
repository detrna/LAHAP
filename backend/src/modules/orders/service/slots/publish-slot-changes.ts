import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { SubscriptionRecord, TransitionedSlot } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function publishSlotChanges(
    this: OrdersService,
    changes: readonly TransitionedSlot[],
    subscriptions: ReadonlyMap<string, SubscriptionRecord>,
): Promise<void> {
    await Promise.all(
        changes.map(async ({ order, fromStatus, changedAt }) => {
            const subscription = subscriptions.get(order.subscriptionId);
            const userIds = [
                ...(subscription !== undefined ? [subscription.userId] : []),
                ...(order.courierId !== null ? [order.courierId] : []),
            ];
            try {
                await this.realtime.publish(
                    { userIds, roles: ["ADMIN", "KITCHEN"] },
                    {
                        event: "slot.status",
                        data: {
                            orderId: order.id,
                            subscriptionId: order.subscriptionId,
                            fromStatus,
                            toStatus: order.status,
                            changedAt: toIsoTimestamp(changedAt),
                        },
                    },
                );
            } catch (err) {
                this.logger.warn({ err, orderId: order.id }, "slot status event was not delivered");
            }
        }),
    );
}
