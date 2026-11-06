export interface AnnouncementTargets {
    findMissingPackageIds(ids: readonly string[]): Promise<readonly string[]>;
    findMissingScheduleIds(ids: readonly string[]): Promise<readonly string[]>;
}
