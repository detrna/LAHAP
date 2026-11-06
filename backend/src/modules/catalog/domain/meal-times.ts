import { isSameClockTime } from "../../../shared/utils/meal-time/meal-time.js";

export const MEAL_TIME_IN_USE_MESSAGE = "meal time is still used by schedules with orders";

export function sortMealTimes(times: readonly Temporal.PlainTime[]): Temporal.PlainTime[] {
    return [...times].sort((a, b) => Temporal.PlainTime.compare(a, b));
}

export function findRemovedMealTimes(
    current: readonly Temporal.PlainTime[],
    next: readonly Temporal.PlainTime[],
): Temporal.PlainTime[] {
    return current.filter(time => !next.some(candidate => isSameClockTime(candidate, time)));
}
