export interface SubscriptionPeriod {
    readonly scheduleId: string;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
}

export const MOVE_TO_PAST_OR_TODAY_MESSAGE = "schedule with orders can only move between future dates";
export const MOVE_OUTSIDE_PERIOD_MESSAGE = "new date is outside a subscription period";

export function isFutureMove(
    current: Temporal.PlainDate,
    next: Temporal.PlainDate,
    today: Temporal.PlainDate,
): boolean {
    return Temporal.PlainDate.compare(current, today) > 0 && Temporal.PlainDate.compare(next, today) > 0;
}

export function isInsidePeriods(date: Temporal.PlainDate, periods: readonly SubscriptionPeriod[]): boolean {
    return periods.every(
        period =>
            Temporal.PlainDate.compare(period.startDate, date) <= 0 &&
            Temporal.PlainDate.compare(date, period.endDate) <= 0,
    );
}
