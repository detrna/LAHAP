export interface AnnouncementTargetsOfUser {
    readonly packageIds: readonly string[];
    readonly scheduleIds: readonly string[];
}

export interface AnnouncementAudience {
    findCustomerIdsForPackage(packageId: string, today: Temporal.PlainDate): Promise<readonly string[]>;
    findCustomerIdsForSchedule(scheduleId: string): Promise<readonly string[]>;
    findAnnouncementTargetsOf(userId: string, today: Temporal.PlainDate): Promise<AnnouncementTargetsOfUser>;
}

export const noAnnouncementAudience: AnnouncementAudience = {
    findCustomerIdsForPackage: async () => [],
    findCustomerIdsForSchedule: async () => [],
    findAnnouncementTargetsOf: async () => ({ packageIds: [], scheduleIds: [] }),
};
