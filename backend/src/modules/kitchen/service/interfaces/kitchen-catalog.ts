import type { Menu } from "../../../catalog/domain/menu.domain.js";
import type { Package } from "../../../catalog/domain/package.domain.js";
import type { ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";

export interface KitchenScheduleFilter {
    readonly from: Temporal.PlainDate;
    readonly to: Temporal.PlainDate;
    readonly packageId?: string | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
}

export interface KitchenCatalog {
    findSchedules(filter: KitchenScheduleFilter): Promise<readonly ScheduleSummary[]>;
    getMenusByIds(ids: readonly string[], options: { readonly audience: "staff" }): Promise<readonly Menu[]>;
    getPackagesByIds(ids: readonly string[]): Promise<readonly Package[]>;
}
