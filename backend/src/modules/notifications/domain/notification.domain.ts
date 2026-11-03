import type { Announcement } from "./announcement.domain.js";

export interface Notification {
    readonly id: string;
    readonly userId: string;
    readonly title: string;
    readonly body: string;
    readonly isRead: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface BroadcastResult {
    readonly announcement: Announcement | null;
    readonly notification: Notification | null;
    readonly recipientCount: number;
}
