import type { BulkUpdateResult } from "../../../../shared/response/batch-result.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import { foodReadyStatus } from "../../domain/slot-status.js";
import type { TransitionedSlot } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export type FoodReadyTarget =
    | { readonly menuScheduleId: string; readonly usesAlternativeMenu?: boolean | undefined }
    | { readonly orderIds: readonly string[] };

export async function markFoodReady(
    this: OrdersService,
    actorId: string,
    target: FoodReadyTarget,
): Promise<BulkUpdateResult> {
    const slots = await this.ordersRepository.findSlots({
        ...("orderIds" in target
            ? { orderIds: target.orderIds }
            : { menuScheduleIds: [target.menuScheduleId], usesAlternativeMenu: target.usesAlternativeMenu }),
        statuses: ["Disiapkan"],
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });

    const changed: TransitionedSlot[] = [];
    for (const isDelivery of [true, false]) {
        const orderIds = slots.filter(slot => slot.order.isDelivery === isDelivery).map(slot => slot.order.id);
        changed.push(
            ...(await this.ordersRepository.transitionSlots({
                orderIds,
                from: ["Disiapkan"],
                to: foodReadyStatus(isDelivery),
                actorId,
            })),
        );
    }

    await this.publishSlotChanges(changed, new Map(slots.map(slot => [slot.subscription.id, slot.subscription])));
    return { updatedCount: changed.length };
}
