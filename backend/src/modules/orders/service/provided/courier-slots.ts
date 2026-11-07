import { COOKED_SLOT_STATUSES } from "../../domain/slot-status.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { OrderStatus } from "../../domain/order.domain.js";
import type { OrdersService } from "../orders.service.js";

export interface CourierSlotQuery {
    readonly courierId: string;
    readonly scheduleIds: readonly string[];
}

export interface CourierSlotRow {
    readonly orderId: string;
    readonly status: OrderStatus;
    readonly menuScheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly userId: string;
    readonly recipientName: string;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly notes: string | null;
}

export async function listCourierSlots(
    this: OrdersService,
    query: CourierSlotQuery,
): Promise<readonly CourierSlotRow[]> {
    if (query.scheduleIds.length === 0) return [];
    const slots = await this.ordersRepository.findSlots({
        menuScheduleIds: [...new Set(query.scheduleIds)],
        courierId: query.courierId,
        isDelivery: true,
        statuses: COOKED_SLOT_STATUSES,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    return slots.map(({ order, subscription }) => ({
        orderId: order.id,
        status: order.status,
        menuScheduleId: order.menuScheduleId,
        usesAlternativeMenu: order.usesAlternativeMenu,
        userId: subscription.userId,
        recipientName: subscription.recipientName,
        deliveryAddress: subscription.deliveryAddress,
        deliveryLatitude: subscription.deliveryLatitude,
        deliveryLongitude: subscription.deliveryLongitude,
        notes: subscription.notes,
    }));
}
