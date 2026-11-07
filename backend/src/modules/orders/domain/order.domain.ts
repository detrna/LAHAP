import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { MenuSchedule } from "../../catalog/domain/schedule.domain.js";
import type { DeliveryObstacle } from "../../delivery/domain/delivery-obstacle.domain.js";
import type { UserSummary } from "../../users/domain/user.domain.js";
import type { Subscription } from "./subscription.domain.js";

export const ORDER_STATUSES = ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai", "Dilewati"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderStatusHistory {
    readonly id: string;
    readonly orderId: string;
    readonly fromStatus: OrderStatus | null;
    readonly toStatus: OrderStatus;
    readonly changedById: string | null;
    readonly changedBy?: UserSummary | null | undefined;
    readonly adminNote: string | null;
    readonly changedAt: string;
}

export interface Order {
    readonly id: string;
    readonly subscriptionId: string;
    readonly menuScheduleId: string;
    readonly courierId: string | null;
    readonly status: OrderStatus;
    readonly usesAlternativeMenu: boolean;
    readonly skipReason: string | null;
    readonly isDelivery: boolean;
    readonly deliveryFee: number;
    readonly completedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly menuSchedule?: MenuSchedule | undefined;
    readonly menu?: Menu | undefined;
    readonly subscription?: Subscription | undefined;
    readonly courier?: UserSummary | null | undefined;
    readonly statusHistory?: readonly OrderStatusHistory[] | undefined;
    readonly obstacles?: readonly DeliveryObstacle[] | undefined;
}

export interface SkipDayResult {
    readonly skippedCount: number;
    readonly orders: readonly Order[];
}

export interface CourierScheduleEntry {
    readonly date: string;
    readonly deliveryTime: MealTimeView;
    readonly courier: UserSummary | null;
    readonly deliveryCount: number;
    readonly unassignedCount: number;
}
