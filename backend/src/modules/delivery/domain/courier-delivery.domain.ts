import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { OrderStatus } from "../../orders/domain/order.domain.js";
import type { DeliveryObstacle } from "./delivery-obstacle.domain.js";

export interface CourierDelivery {
    readonly orderId: string;
    readonly status: OrderStatus;
    readonly date: string;
    readonly deliveryTime: MealTimeView;
    readonly recipientName: string;
    readonly phone: string;
    readonly deliveryAddress: string;
    readonly deliveryLatitude: number;
    readonly deliveryLongitude: number;
    readonly packageName: string;
    readonly menu: Menu;
    readonly usesAlternativeMenu: boolean;
    readonly notes: string | null;
    readonly isReadyForPickup: boolean;
    readonly obstacles: readonly DeliveryObstacle[];
}
