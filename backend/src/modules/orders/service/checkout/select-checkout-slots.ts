import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { formatClockTime } from "../../../../shared/utils/meal-time/meal-time.js";
import type { Package } from "../../../catalog/domain/package.domain.js";
import type { ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";
import {
    compareSlots,
    findUnofferedTimes,
    isOrderable,
    periodRange,
    selectPeriodSlots,
} from "../../domain/period-slots.js";
import type { OrdersService } from "../orders.service.js";
import type { CheckoutSelection } from "./checkout-input.js";

async function selectChosenSlots(
    service: OrdersService,
    pkg: Package,
    ids: readonly string[],
    today: Temporal.PlainDate,
): Promise<readonly ScheduleSummary[]> {
    const found = await service.catalog.findSchedules({ ids });
    if (found.length !== new Set(ids).size) throw new InvalidStateError("slot is not available");
    for (const slot of found) {
        if (!slot.isPublished || slot.packageId !== pkg.id) throw new InvalidStateError("slot is not available");
        if (!isOrderable(slot, { packageId: pkg.id, today })) throw new InvalidStateError("cut-off has passed");
    }
    return [...found].sort(compareSlots);
}

export async function selectCheckoutSlots(
    this: OrdersService,
    pkg: Package,
    selection: CheckoutSelection,
    today: Temporal.PlainDate,
): Promise<readonly ScheduleSummary[]> {
    if (selection.period === "Harian") return selectChosenSlots(this, pkg, selection.menuScheduleIds, today);

    const range = periodRange(selection.period, selection.periodStart);
    const [unoffered] = findUnofferedTimes(
        selection.deliveryTimes,
        pkg.deliveryTimes.map(option => option.time),
    );
    if (unoffered !== undefined) {
        throw new InvalidStateError(`package does not offer delivery time ${formatClockTime(unoffered)}`);
    }

    const tomorrow = today.add({ days: 1 });
    const from = Temporal.PlainDate.compare(range.from, tomorrow) > 0 ? range.from : tomorrow;
    if (Temporal.PlainDate.compare(from, range.to) > 0) return [];

    const candidates = await this.catalog.findSchedules({ packageId: pkg.id, from, to: range.to, isPublished: true });
    return selectPeriodSlots(candidates, {
        packageId: pkg.id,
        today,
        range,
        deliveryTimes: selection.deliveryTimes,
    });
}
