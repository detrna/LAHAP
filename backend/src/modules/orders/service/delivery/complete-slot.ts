import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import type { Role } from "../../../../shared/auth/roles.js";
import type { Order, OrderStatus } from "../../domain/order.domain.js";
import type { SlotWithSubscription } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export interface SlotActor {
    readonly userId: string;
    readonly role: Role;
}

async function loadPaidSlot(service: OrdersService, orderId: string): Promise<SlotWithSubscription> {
    const slot = await service.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null || slot.subscription.status !== "Success") throw new OrderNotFoundError();
    return slot;
}

async function moveSlot(
    service: OrdersService,
    slot: SlotWithSubscription,
    change: {
        readonly from: OrderStatus;
        readonly to: OrderStatus;
        readonly actorId: string;
        readonly refusal: string;
    },
    extra: { readonly adminNote?: string | undefined; readonly skipReason?: string | undefined } = {},
): Promise<Order> {
    const [changed] = await service.ordersRepository.transitionSlots({
        orderIds: [slot.order.id],
        from: [change.from],
        to: change.to,
        actorId: change.actorId,
        ...extra,
    });
    if (changed === undefined) throw new InvalidStateError(change.refusal);
    await service.publishSlotChanges([changed], new Map([[slot.subscription.id, slot.subscription]]));
    const [order] = await service.presentOrders([changed.order]);
    return order!;
}

export async function completeDelivery(this: OrdersService, actor: SlotActor, orderId: string): Promise<Order> {
    const slot = await loadPaidSlot(this, orderId);
    if (actor.role === "COURIER" && slot.order.courierId !== actor.userId) throw new OrderNotFoundError();
    const refusal = "slot is not out for delivery";
    if (slot.order.status !== "Diantar") throw new InvalidStateError(refusal);
    return moveSlot(this, slot, { from: "Diantar", to: "Selesai", actorId: actor.userId, refusal });
}

export async function completePickup(this: OrdersService, adminId: string, orderId: string): Promise<Order> {
    const slot = await loadPaidSlot(this, orderId);
    const refusal = "slot is not ready for pick-up";
    if (slot.order.status !== "Siap Diambil") throw new InvalidStateError(refusal);
    return moveSlot(this, slot, { from: "Siap Diambil", to: "Selesai", actorId: adminId, refusal });
}
