import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import type { Order, OrderStatus } from "../../domain/order.domain.js";
import { canCorrect } from "../../domain/slot-status.js";
import type { OrdersService } from "../orders.service.js";

export interface StatusCorrection {
    readonly status: OrderStatus;
    readonly adminNote: string;
}

export async function correctSlotStatus(
    this: OrdersService,
    adminId: string,
    orderId: string,
    correction: StatusCorrection,
): Promise<Order> {
    const slot = await this.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null || slot.subscription.status !== "Success") throw new OrderNotFoundError();
    const from = slot.order.status;
    if (!canCorrect(slot.order.isDelivery, from, correction.status)) {
        throw new InvalidStateError(`slot cannot move from ${from} to ${correction.status}`);
    }

    const [changed] = await this.ordersRepository.transitionSlots({
        orderIds: [orderId],
        from: [from],
        to: correction.status,
        actorId: adminId,
        adminNote: correction.adminNote,
        ...(correction.status === "Dilewati" ? { skipReason: correction.adminNote } : {}),
    });
    if (changed === undefined) throw new InvalidStateError("slot changed, try again");

    await this.publishSlotChanges([changed], new Map([[slot.subscription.id, slot.subscription]]));
    const [order] = await this.presentOrders([changed.order]);
    return order!;
}
