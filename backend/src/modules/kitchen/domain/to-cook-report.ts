import { toMealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import { buildSpecialCategory } from "./special-category.js";
import { buildToCookIngredients } from "./to-cook-ingredients.js";
import { buildToCookMenus } from "./to-cook-menus.js";
import type { ServedSlot, ToCookLookups } from "./to-cook-source.js";
import type { ToCookReport } from "./to-cook.domain.js";

export interface ToCookReportsInput {
    readonly from: Temporal.PlainDate;
    readonly to: Temporal.PlainDate;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly served: readonly ServedSlot[];
    readonly lookups: ToCookLookups;
}

export function buildToCookReports({
    from,
    to,
    deliveryTime,
    served,
    lookups,
}: ToCookReportsInput): readonly ToCookReport[] {
    const servedByDate = Map.groupBy(served, item => item.schedule.date);
    const deliveryTimeView = deliveryTime === undefined ? null : toMealTimeView(deliveryTime);

    const reports: ToCookReport[] = [];
    for (let date = from; Temporal.PlainDate.compare(date, to) <= 0; date = date.add({ days: 1 })) {
        const day = servedByDate.get(date.toString()) ?? [];
        reports.push({
            date: date.toString(),
            deliveryTime: deliveryTimeView,
            menus: buildToCookMenus(day, lookups),
            ingredients: buildToCookIngredients(day, lookups.menus),
            specialCategory: buildSpecialCategory(day, lookups),
        });
    }
    return reports;
}
