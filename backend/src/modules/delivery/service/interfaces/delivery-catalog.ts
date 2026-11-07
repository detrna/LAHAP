import type { Menu } from "../../../catalog/domain/menu.domain.js";
import type { Package } from "../../../catalog/domain/package.domain.js";
import type { ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";

export interface DeliveryScheduleFilter {
    readonly ids?: readonly string[] | undefined;
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
}

export interface DeliveryCatalog {
    findSchedules(filter: DeliveryScheduleFilter): Promise<readonly ScheduleSummary[]>;
    getMenusByIds(ids: readonly string[]): Promise<readonly Menu[]>;
    getPackagesByIds(ids: readonly string[]): Promise<readonly Package[]>;
}
