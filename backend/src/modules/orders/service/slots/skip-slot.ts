import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import type { Order } from "../../domain/order.domain.js";
import { isSkippable } from "../../domain/slot-status.js";
import type { OrdersService } from "../orders.service.js";

const SKIPPABLE_STATUSES = ["Terjadwal", "Disiapkan"] as const;

export async function skipSlot(
    this: OrdersService,
    userId: string,
    orderId: string,
    skipReason: string | null,
): Promise<Order> {
    const slot = await this.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null || slot.subscription.userId !== userId || slot.subscription.status !== "Success") {
        throw new OrderNotFoundError();
    }
    if (!isSkippable(slot.order.status)) throw new InvalidStateError("slot is not skippable");

    const [changed] = await this.ordersRepository.transitionSlots({
        orderIds: [orderId],
        from: SKIPPABLE_STATUSES,
        to: "Dilewati",
        actorId: userId,
        skipReason,
    });
    if (changed === undefined) throw new InvalidStateError("slot is not skippable");

    await this.publishSlotChanges([changed], new Map([[slot.subscription.id, slot.subscription]]));
    const [order] = await this.presentOrders([changed.order]);
    return order!;
}
