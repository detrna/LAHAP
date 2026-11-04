import type { Announcement } from "../../domain/announcement.domain.js";
import type { Notification, BroadcastResult } from "../../domain/notification.domain.js";

export function buildNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000001",
        title: "test title",
        body: "test body",
        isRead: false,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildBroadcastResult(overrides: Partial<BroadcastResult> = {}): BroadcastResult {
    return { announcement: null, notification: null, recipientCount: 0, ...overrides };
}

export function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        title: "test title",
        body: "test body",
        scope: "GLOBAL",
        packageId: null,
        menuScheduleId: null,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}
