import { resolveDateRange, type DateRangeInput } from "../../../../shared/time/date-range.js";
import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";

export const PUBLIC_SCHEDULE_DEFAULT_DAYS = 31;
export const PUBLIC_SCHEDULE_MAX_DAYS = 62;

export async function listPublishedSchedules(
    this: CatalogService,
    packageId: string,
    input: DateRangeInput,
): Promise<readonly MenuSchedule[]> {
    await this.getAvailablePackage(packageId);
    const { from, to } = resolveDateRange(input, {
        defaultFrom: this.clock.now().toPlainDate(),
        defaultSpanDays: PUBLIC_SCHEDULE_DEFAULT_DAYS,
        maxDays: PUBLIC_SCHEDULE_MAX_DAYS,
    });
    const records = await this.catalogRepository.findSchedules({ packageId, from, to, isPublished: true });
    return this.presentSchedules(records, "customer");
}
