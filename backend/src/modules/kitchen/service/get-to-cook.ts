import { resolveDateRange } from "../../../shared/time/date-range.js";
import { toServedSlots } from "../domain/served-slots.js";
import { buildToCookReports } from "../domain/to-cook-report.js";
import type { ToCookReport } from "../domain/to-cook.domain.js";
import type { KitchenService } from "./kitchen.service.js";

export const TO_COOK_MAX_DAYS = 7;

export interface ToCookInput {
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly packageId?: string | undefined;
}

export async function getToCook(
    this: KitchenService,
    { deliveryTime, packageId, ...dates }: ToCookInput = {},
): Promise<readonly ToCookReport[]> {
    const { from, to } = resolveDateRange(dates, {
        defaultFrom: this.clock.now().toPlainDate(),
        defaultSpanDays: 1,
        maxDays: TO_COOK_MAX_DAYS,
    });
    const emptyLookups = { menus: new Map(), packageNames: new Map(), profiles: new Map() };
    const empty = () => buildToCookReports({ from, to, deliveryTime, served: [], lookups: emptyLookups });

    const schedules = await this.catalog.findSchedules({
        from,
        to,
        ...(packageId !== undefined ? { packageId } : {}),
        ...(deliveryTime !== undefined ? { deliveryTime } : {}),
    });
    if (schedules.length === 0) return empty();

    const slots = await this.slots.listKitchenSlots(schedules.map(schedule => schedule.id));
    const served = toServedSlots(slots, schedules);
    if (served.length === 0) return empty();

    const menuIds = new Set<string>();
    const packageIds = new Set<string>();
    for (const { schedule } of served) {
        packageIds.add(schedule.packageId);
        if (schedule.primaryMenuId !== null) menuIds.add(schedule.primaryMenuId);
        if (schedule.alternativeMenuId !== null) menuIds.add(schedule.alternativeMenuId);
    }
    const userIds = new Set(served.map(({ slot }) => slot.userId));

    const [menus, packages, profiles] = await Promise.all([
        this.catalog.getMenusByIds([...menuIds], { audience: "staff" }),
        this.catalog.getPackagesByIds([...packageIds]),
        this.customers.getAllergyProfiles([...userIds]),
    ]);

    return buildToCookReports({
        from,
        to,
        deliveryTime,
        served,
        lookups: {
            menus: new Map(menus.map(menu => [menu.id, menu])),
            packageNames: new Map(packages.map(item => [item.id, item.name])),
            profiles: new Map(profiles.map(profile => [profile.userId, profile])),
        },
    });
}
