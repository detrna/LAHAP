import type { Role } from "../../../shared/auth/roles.js";
import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { DeliveryObstacle } from "../../delivery/domain/delivery-obstacle.domain.js";
import type { Announcement } from "../../notifications/domain/announcement.domain.js";
import type { Notification } from "../../notifications/domain/notification.domain.js";
import type { OrderStatus } from "../../orders/domain/order.domain.js";

export interface SlotStatusEvent {
    readonly event: "slot.status";
    readonly data: {
        readonly orderId: string;
        readonly subscriptionId: string;
        readonly fromStatus: OrderStatus | null;
        readonly toStatus: OrderStatus;
        readonly changedAt: string;
    };
}

export interface SlotObstacleEvent {
    readonly event: "slot.obstacle";
    readonly data: DeliveryObstacle;
}

export interface SlotMenuEvent {
    readonly event: "slot.menu";
    readonly data: {
        readonly orderId: string;
        readonly usesAlternativeMenu: boolean;
        readonly menu: Menu;
    };
}

export interface NotificationEvent {
    readonly event: "notification";
    readonly data: Notification;
}

export interface AnnouncementEvent {
    readonly event: "announcement";
    readonly data: Announcement;
}

export const REALTIME_EVENTS = ["slot.status", "slot.obstacle", "slot.menu", "notification", "announcement"] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

export type RealtimeEvent = SlotStatusEvent | SlotObstacleEvent | SlotMenuEvent | NotificationEvent | AnnouncementEvent;

export interface RealtimeAudience {
    readonly userIds?: readonly string[] | undefined;
    readonly roles?: readonly Role[] | undefined;
}
