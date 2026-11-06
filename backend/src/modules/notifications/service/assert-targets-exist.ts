import { AnnouncementTargetNotFoundError } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";

export interface AnnouncementTargetIds {
    readonly packageId?: string | null | undefined;
    readonly menuScheduleId?: string | null | undefined;
}

export async function assertTargetsExist(this: NotificationsService, ids: AnnouncementTargetIds): Promise<void> {
    if (typeof ids.packageId === "string") {
        const [missing] = await this.targets.findMissingPackageIds([ids.packageId]);
        if (missing !== undefined) throw new AnnouncementTargetNotFoundError("package", missing);
    }
    if (typeof ids.menuScheduleId === "string") {
        const [missing] = await this.targets.findMissingScheduleIds([ids.menuScheduleId]);
        if (missing !== undefined) throw new AnnouncementTargetNotFoundError("schedule", missing);
    }
}
