import { ValidationError } from "../../../shared/errors/validation-error.js";
import { endOfMonth, isFirstOfMonth, isMonday } from "../../../shared/time/calendar.js";
import { isSameClockTime, type ClockTime } from "../../../shared/utils/meal-time/meal-time.js";

const DAYS_PER_WEEK = 7;

export type RangePeriod = "Mingguan" | "Bulanan";

export interface PeriodRange {
    readonly from: Temporal.PlainDate;
    readonly to: Temporal.PlainDate;
}

export interface SlotCandidate {
    readonly id: string;
    readonly packageId: string;
    readonly date: string;
    readonly deliveryTime: { readonly time: string };
    readonly isPublished: boolean;
}

export interface OrderableContext {
    readonly packageId: string;
    readonly today: Temporal.PlainDate;
}

function invalidPeriodStart(message: string): ValidationError {
    return new ValidationError([{ target: "body", path: "periodStart", message, code: "invalid_value" }]);
}

export function periodRange(period: RangePeriod, periodStart: Temporal.PlainDate): PeriodRange {
    if (period === "Mingguan") {
        if (!isMonday(periodStart)) throw invalidPeriodStart("must be a monday for a weekly order");
        return { from: periodStart, to: periodStart.add({ days: DAYS_PER_WEEK - 1 }) };
    }
    if (!isFirstOfMonth(periodStart)) throw invalidPeriodStart("must be the first day of a month for a monthly order");
    return { from: periodStart, to: endOfMonth(periodStart) };
}

export function findUnofferedTimes<T extends string | ClockTime>(
    requested: readonly T[],
    offered: readonly (string | ClockTime)[],
): readonly T[] {
    return requested.filter(time => !offered.some(option => isSameClockTime(option, time)));
}

export function isOrderable(slot: SlotCandidate, context: OrderableContext): boolean {
    return (
        slot.isPublished &&
        slot.packageId === context.packageId &&
        Temporal.PlainDate.compare(Temporal.PlainDate.from(slot.date), context.today) > 0
    );
}

export function compareSlots(a: SlotCandidate, b: SlotCandidate): number {
    return a.date.localeCompare(b.date) || a.deliveryTime.time.localeCompare(b.deliveryTime.time);
}

export function selectPeriodSlots<T extends SlotCandidate>(
    candidates: readonly T[],
    selection: OrderableContext & {
        readonly range: PeriodRange;
        readonly deliveryTimes: readonly (string | ClockTime)[];
    },
): readonly T[] {
    const { range, deliveryTimes } = selection;
    return candidates
        .filter(slot => {
            const date = Temporal.PlainDate.from(slot.date);
            return (
                isOrderable(slot, selection) &&
                Temporal.PlainDate.compare(date, range.from) >= 0 &&
                Temporal.PlainDate.compare(date, range.to) <= 0 &&
                deliveryTimes.some(time => isSameClockTime(time, slot.deliveryTime.time))
            );
        })
        .sort(compareSlots);
}
