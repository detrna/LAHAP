import type { AnnouncementScope } from "../../domain/announcement.domain.js";

export * from "../../domain/errors.js";

export interface NotificationRecord {
    readonly id: string;
    readonly userId: string;
    readonly title: string;
    readonly body: string;
    readonly isRead: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface AnnouncementRecord {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly scope: AnnouncementScope;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewNotificationRecord {
    readonly userId: string;
    readonly title: string;
    readonly body: string;
}

export interface NewAnnouncementRecord {
    readonly title: string;
    readonly body: string;
    readonly scope: AnnouncementScope;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
}

export interface AnnouncementChanges {
    readonly title?: string | undefined;
    readonly body?: string | undefined;
    readonly scope?: AnnouncementScope | undefined;
    readonly packageId?: string | null | undefined;
    readonly menuScheduleId?: string | null | undefined;
}

export interface NotificationListQuery {
    readonly userId: string;
    readonly isRead?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface NotificationListRecord {
    readonly items: readonly NotificationRecord[];
    readonly total: number;
}

export interface AnnouncementListQuery {
    readonly scope?: AnnouncementScope | undefined;
    readonly packageId?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface AudienceAnnouncementListQuery {
    readonly packageIds: readonly string[];
    readonly scheduleIds: readonly string[];
    readonly skip: number;
    readonly take: number;
}

export interface AnnouncementListRecord {
    readonly items: readonly AnnouncementRecord[];
    readonly total: number;
}

export interface NotificationsRepository {
    listNotificationsForUser(query: NotificationListQuery): Promise<NotificationListRecord>;
    countUnreadNotifications(userId: string): Promise<number>;
    markNotificationRead(input: { readonly id: string; readonly userId: string }): Promise<NotificationRecord | null>;
    markAllNotificationsRead(userId: string): Promise<number>;
    createNotification(record: NewNotificationRecord): Promise<NotificationRecord>;
    createNotifications(records: readonly NewNotificationRecord[]): Promise<readonly NotificationRecord[]>;
    createAnnouncement(record: NewAnnouncementRecord): Promise<AnnouncementRecord>;
    findAnnouncementById(id: string): Promise<AnnouncementRecord | null>;
    listAnnouncements(query: AnnouncementListQuery): Promise<AnnouncementListRecord>;
    listAnnouncementsForAudience(query: AudienceAnnouncementListQuery): Promise<AnnouncementListRecord>;
    updateAnnouncement(id: string, changes: AnnouncementChanges): Promise<AnnouncementRecord | null>;
    deleteAnnouncement(id: string): Promise<boolean>;
}
