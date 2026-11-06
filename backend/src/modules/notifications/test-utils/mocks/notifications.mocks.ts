import { vi } from "vitest";
import type { AnnouncementAudience } from "../../service/interfaces/announcement-audience.js";
import type { AnnouncementTargets } from "../../service/interfaces/announcement-targets.js";
import type { NotificationsRepository } from "../../service/interfaces/notifications.repository.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { RecipientDirectory } from "../../service/interfaces/recipient-directory.js";
import type { NotificationsService } from "../../service/notifications.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedNotificationsService = Mocked<
    Pick<
        NotificationsService,
        | "listMyNotifications"
        | "markNotificationRead"
        | "markAllNotificationsRead"
        | "listMyAnnouncements"
        | "broadcast"
        | "listAnnouncements"
        | "getAnnouncement"
        | "updateAnnouncement"
        | "deleteAnnouncement"
    >
>;

export function createMockNotificationsRepository(): Mocked<NotificationsRepository> {
    return {
        listNotificationsForUser: vi.fn(async () => ({ items: [], total: 0 })),
        countUnreadNotifications: vi.fn(async () => 0),
        markNotificationRead: vi.fn(async () => null),
        markAllNotificationsRead: vi.fn(async () => 0),
        createNotification: vi.fn(),
        createNotifications: vi.fn(async () => []),
        createAnnouncement: vi.fn(),
        findAnnouncementById: vi.fn(async () => null),
        listAnnouncements: vi.fn(async () => ({ items: [], total: 0 })),
        listAnnouncementsForAudience: vi.fn(async () => ({ items: [], total: 0 })),
        updateAnnouncement: vi.fn(async () => null),
        deleteAnnouncement: vi.fn(async () => false),
    } as Mocked<NotificationsRepository>;
}

export function createMockRealtimePublisher(): Mocked<RealtimePublisher> {
    return { publish: vi.fn(async () => undefined) } as Mocked<RealtimePublisher>;
}

export function createMockRecipientDirectory(): Mocked<RecipientDirectory> {
    return {
        listActiveUserIds: vi.fn(async () => []),
        countActiveUsers: vi.fn(async () => 0),
        filterActiveUserIds: vi.fn(async (ids: readonly string[]) => ids),
    } as Mocked<RecipientDirectory>;
}

export function createMockAnnouncementTargets(): Mocked<AnnouncementTargets> {
    return {
        findMissingPackageIds: vi.fn(async () => []),
        findMissingScheduleIds: vi.fn(async () => []),
    } as Mocked<AnnouncementTargets>;
}

export function createMockAnnouncementAudience(): Mocked<AnnouncementAudience> {
    return {
        findCustomerIdsForPackage: vi.fn(async () => []),
        findCustomerIdsForSchedule: vi.fn(async () => []),
        findAnnouncementTargetsOf: vi.fn(async () => ({ packageIds: [], scheduleIds: [] })),
    } as Mocked<AnnouncementAudience>;
}

export function createMockNotificationsService(): MockedNotificationsService {
    return {
        listMyNotifications: vi.fn(),
        markNotificationRead: vi.fn(),
        markAllNotificationsRead: vi.fn(),
        listMyAnnouncements: vi.fn(),
        broadcast: vi.fn(),
        listAnnouncements: vi.fn(),
        getAnnouncement: vi.fn(),
        updateAnnouncement: vi.fn(),
        deleteAnnouncement: vi.fn(),
    } as MockedNotificationsService;
}
