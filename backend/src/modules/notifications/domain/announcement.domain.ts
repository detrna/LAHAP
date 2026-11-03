export const ANNOUNCEMENT_SCOPES = ["GLOBAL", "PACKAGE", "SCHEDULE"] as const;
export type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPES)[number];

export interface Announcement {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly scope: AnnouncementScope;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}
