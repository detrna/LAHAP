import { buildMenu } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildDeliveryObstacle } from "../../../delivery/test-utils/factory/delivery.factory.js";
import {
    buildAnnouncement,
    buildNotification,
} from "../../../notifications/test-utils/factory/notifications.factory.js";
import type {
    SlotStatusEvent,
    SlotObstacleEvent,
    SlotMenuEvent,
    NotificationEvent,
    AnnouncementEvent,
} from "../../domain/realtime-event.domain.js";

export function buildSlotStatusEvent(overrides: Partial<SlotStatusEvent> = {}): SlotStatusEvent {
    return {
        event: "slot.status",
        data: {
            orderId: "00000000-0000-4000-8000-000000000001",
            subscriptionId: "00000000-0000-4000-8000-000000000001",
            fromStatus: null,
            toStatus: "Terjadwal",
            changedAt: "2026-11-03T00:00:00.000Z",
        },
        ...overrides,
    };
}

export function buildSlotObstacleEvent(overrides: Partial<SlotObstacleEvent> = {}): SlotObstacleEvent {
    return { event: "slot.obstacle", data: buildDeliveryObstacle(), ...overrides };
}

export function buildSlotMenuEvent(overrides: Partial<SlotMenuEvent> = {}): SlotMenuEvent {
    return {
        event: "slot.menu",
        data: { orderId: "00000000-0000-4000-8000-000000000001", usesAlternativeMenu: false, menu: buildMenu() },
        ...overrides,
    };
}

export function buildNotificationEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
    return { event: "notification", data: buildNotification(), ...overrides };
}

export function buildAnnouncementEvent(overrides: Partial<AnnouncementEvent> = {}): AnnouncementEvent {
    return { event: "announcement", data: buildAnnouncement(), ...overrides };
}
