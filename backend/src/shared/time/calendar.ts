const MONDAY = 1;
const DAYS_PER_WEEK = 7;

export function startOfWeek(date: Temporal.PlainDate): Temporal.PlainDate {
    return date.subtract({ days: date.dayOfWeek - MONDAY });
}

export function nextMonday(date: Temporal.PlainDate): Temporal.PlainDate {
    return startOfWeek(date).add({ days: DAYS_PER_WEEK });
}

export function startOfMonth(date: Temporal.PlainDate): Temporal.PlainDate {
    return date.with({ day: 1 });
}

export function endOfMonth(date: Temporal.PlainDate): Temporal.PlainDate {
    return date.with({ day: date.daysInMonth });
}

export function daysBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): number {
    return from.until(to, { largestUnit: "days" }).days;
}

export function isMonday(date: Temporal.PlainDate): boolean {
    return date.dayOfWeek === MONDAY;
}

export function isFirstOfMonth(date: Temporal.PlainDate): boolean {
    return date.day === 1;
}
