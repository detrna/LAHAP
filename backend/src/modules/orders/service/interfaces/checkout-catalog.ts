import type { Menu } from "../../../catalog/domain/menu.domain.js";
import type { Package } from "../../../catalog/domain/package.domain.js";
import type { MenuSchedule, ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";

export interface ScheduleQuery {
    readonly ids?: readonly string[] | undefined;
    readonly packageId?: string | undefined;
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly isPublished?: boolean | undefined;
}

export interface CheckoutCatalog {
    getPackagesByIds(ids: readonly string[]): Promise<readonly Package[]>;
    findSchedules(query: ScheduleQuery): Promise<readonly ScheduleSummary[]>;
    getMenusByIds(ids: readonly string[]): Promise<readonly Menu[]>;
    getSchedulesByIds(ids: readonly string[]): Promise<readonly MenuSchedule[]>;
}
