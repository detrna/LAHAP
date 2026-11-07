import type { OrderStatus } from "../../orders/domain/order.domain.js";
import type { SubscriptionStatus } from "../../orders/domain/subscription.domain.js";

export interface CourierSlot {
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

export interface ObstacleSlot {
    readonly userId: string;
    readonly courierId: string | null;
    readonly status: OrderStatus;
    readonly isDelivery: boolean;
    readonly subscriptionStatus: SubscriptionStatus;
    readonly menuScheduleId: string;
}
