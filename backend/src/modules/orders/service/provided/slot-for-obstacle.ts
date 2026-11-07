import type { OrderStatus } from "../../domain/order.domain.js";
import type { SubscriptionStatus } from "../../domain/subscription.domain.js";
import type { OrdersService } from "../orders.service.js";

export interface ObstacleSlot {
    readonly userId: string;
    readonly courierId: string | null;
    readonly status: OrderStatus;
    readonly isDelivery: boolean;
    readonly subscriptionStatus: SubscriptionStatus;
    readonly menuScheduleId: string;
}

export async function getSlotForObstacle(this: OrdersService, orderId: string): Promise<ObstacleSlot | null> {
    const slot = await this.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null) return null;
    return {
        userId: slot.subscription.userId,
        courierId: slot.order.courierId,
        status: slot.order.status,
        isDelivery: slot.order.isDelivery,
        subscriptionStatus: slot.subscription.status,
        menuScheduleId: slot.order.menuScheduleId,
    };
}
