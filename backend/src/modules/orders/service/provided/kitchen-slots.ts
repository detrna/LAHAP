import { COOKED_SLOT_STATUSES } from "../../domain/slot-status.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { OrdersService } from "../orders.service.js";

export interface KitchenSlotRow {
    readonly orderId: string;
    readonly menuScheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly userId: string;
    readonly recipientName: string;
    readonly isDelivery: boolean;
    readonly notes: string | null;
}

export async function listKitchenSlots(
    this: OrdersService,
    scheduleIds: readonly string[],
): Promise<readonly KitchenSlotRow[]> {
    if (scheduleIds.length === 0) return [];
    const slots = await this.ordersRepository.findSlots({
        menuScheduleIds: [...new Set(scheduleIds)],
        statuses: COOKED_SLOT_STATUSES,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    return slots.map(({ order, subscription }) => ({
        orderId: order.id,
        menuScheduleId: order.menuScheduleId,
        usesAlternativeMenu: order.usesAlternativeMenu,
        userId: subscription.userId,
        recipientName: subscription.recipientName,
        isDelivery: order.isDelivery,
        notes: subscription.notes,
    }));
}
