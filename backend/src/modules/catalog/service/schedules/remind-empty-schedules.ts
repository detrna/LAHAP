import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import {
    buildMenuReminder,
    findPackagesWithoutPublishedSchedules,
    reminderWindow,
} from "../../domain/empty-schedule-window.js";
import type { CatalogService } from "../catalog.service.js";

export interface EmptyScheduleReminder {
    readonly from: string;
    readonly to: string;
    readonly emptyPackageIds: readonly string[];
}

export async function remindEmptySchedules(this: CatalogService): Promise<EmptyScheduleReminder> {
    const now = this.clock.now();
    const window = reminderWindow(now.toPlainDate());
    const result = (emptyPackageIds: readonly string[]): EmptyScheduleReminder => ({
        from: window.from.toString(),
        to: window.to.toString(),
        emptyPackageIds,
    });

    const packages = await this.catalogRepository.findAvailablePackages(toDbTimestamp(now));
    if (packages.length === 0) return result([]);

    const schedules = await this.catalogRepository.findSchedules({ from: window.from, to: window.to });
    const emptyPackages = findPackagesWithoutPublishedSchedules(packages, schedules);
    if (emptyPackages.length === 0) return result([]);

    await this.adminNotifier.notifyAdmins(buildMenuReminder(window, emptyPackages));
    return result(emptyPackages.map(item => item.packageId));
}
