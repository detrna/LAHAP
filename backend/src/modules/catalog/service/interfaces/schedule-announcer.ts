export interface ScheduleAnnouncement {
    readonly scope: "SCHEDULE";
    readonly menuScheduleId: string;
    readonly title: string;
    readonly body: string;
}

export interface ScheduleAnnouncer {
    announce(announcement: ScheduleAnnouncement): Promise<unknown>;
}

export const noScheduleAnnouncer: ScheduleAnnouncer = {
    announce: async () => undefined,
};
