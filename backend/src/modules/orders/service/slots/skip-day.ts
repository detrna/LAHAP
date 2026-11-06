import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import type { SkipDayResult } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import { isSkippable } from "../../domain/slot-status.js";
import type { OrdersService } from "../orders.service.js";

const SKIPPABLE_STATUSES = ["Terjadwal", "Disiapkan"] as const;

export interface SkipDayInput {
    readonly date: Temporal.PlainDate;
    readonly subscriptionId?: string | undefined;
    readonly skipReason: string | null;
}

export async function skipDay(this: OrdersService, userId: string, input: SkipDayInput): Promise<SkipDayResult> {
    if (input.subscriptionId !== undefined) {
        const subscription = await this.ordersRepository.findSubscriptionById(input.subscriptionId);
        if (subscription === null || subscription.userId !== userId) throw new OrderNotFoundError();
    }
    const slots = await this.ordersRepository.findCustomerSlots({
        userId,
        date: input.date,
        subscriptionId: input.subscriptionId,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    const skippable = slots.filter(slot => isSkippable(slot.order.status));
    const changed = await this.ordersRepository.transitionSlots({
        orderIds: skippable.map(slot => slot.order.id),
        from: SKIPPABLE_STATUSES,
        to: "Dilewati",
        actorId: userId,
        skipReason: input.skipReason,
    });

    await this.publishSlotChanges(changed, new Map(slots.map(slot => [slot.subscription.id, slot.subscription])));
    const orders = await this.presentOrders(changed.map(change => change.order));
    return { skippedCount: changed.length, orders };
}
