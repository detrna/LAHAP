import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { ScheduleSummary } from "../../catalog/domain/schedule.domain.js";
import type { CourierDelivery } from "./courier-delivery.domain.js";
import type { CourierSlot } from "./courier-source.js";
import type { DeliveryObstacle } from "./delivery-obstacle.domain.js";
import { isReadyForPickup } from "./is-ready-for-pickup.js";

export interface CourierDeliveryParts {
    readonly slot: CourierSlot;
    readonly schedule: ScheduleSummary;
    readonly menu: Menu;
    readonly packageName: string;
    readonly phone: string;
    readonly obstacles: readonly DeliveryObstacle[];
}

export function toCourierDelivery({
    slot,
    schedule,
    menu,
    packageName,
    phone,
    obstacles,
}: CourierDeliveryParts): CourierDelivery | null {
    const { deliveryAddress, deliveryLatitude, deliveryLongitude } = slot;
    if (deliveryAddress === null || deliveryLatitude === null || deliveryLongitude === null) return null;
    return {
        orderId: slot.orderId,
        status: slot.status,
        date: schedule.date,
        deliveryTime: schedule.deliveryTime,
        recipientName: slot.recipientName,
        phone,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        packageName,
        menu,
        usesAlternativeMenu: slot.usesAlternativeMenu,
        notes: slot.notes,
        isReadyForPickup: isReadyForPickup(slot.status),
        obstacles,
    };
}
