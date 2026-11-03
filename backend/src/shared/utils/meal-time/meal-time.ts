import { InvalidMealTimeError } from "./errors.js";

export * from "./errors.js";

/** Derived label of a meal time ("Waktu makan" in the PRD glossary). Never stored. */
export type MealTimeRange = "Pagi" | "Siang" | "Malam";

/** A wall-clock time. `Temporal.PlainTime`, which Prisma returns for `Time` columns, satisfies this shape. */
export interface ClockTime {
    readonly hour: number;
    readonly minute: number;
}

export interface MealTimeView {
    /** Zero-padded "HH:mm". */
    readonly time: string;
    readonly range: MealTimeRange;
}

/**
 * Range boundaries in minutes since midnight, ascending. A time belongs to the last range starting at or before it:
 * Pagi 00:00–10:59, Siang 11:00–15:59, Malam 16:00–23:59 (PRD examples: 07:00 Pagi, 12:00 Siang, 17:00/18:30 Malam).
 */
export const MEAL_TIME_RANGE_STARTS: readonly { readonly range: MealTimeRange; readonly startsAt: number }[] = [
    { range: "Pagi", startsAt: 0 },
    { range: "Siang", startsAt: 11 * 60 },
    { range: "Malam", startsAt: 16 * 60 },
];

// "HH:mm", optionally with seconds and fractional seconds as Postgres / Temporal print them
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

const isValidClockTime = ({ hour, minute }: ClockTime) =>
    Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;

/** Normalizes a "HH:mm[:ss[.fff]]" string or a `ClockTime` to minute precision. Seconds are dropped. */
export function parseClockTime(input: string | ClockTime): ClockTime {
    if (typeof input === "string") {
        const match = TIME_PATTERN.exec(input.trim());
        const time = match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
        if (!time || !isValidClockTime(time)) throw new InvalidMealTimeError(input);
        return time;
    }

    if (!isValidClockTime(input)) throw new InvalidMealTimeError({ hour: input.hour, minute: input.minute });
    return { hour: input.hour, minute: input.minute };
}

export function formatClockTime(input: string | ClockTime): string {
    const { hour, minute } = parseClockTime(input);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getMealTimeRange(input: string | ClockTime): MealTimeRange {
    const { hour, minute } = parseClockTime(input);
    const minutes = hour * 60 + minute;

    let range: MealTimeRange = "Pagi";
    for (const boundary of MEAL_TIME_RANGE_STARTS) {
        if (minutes >= boundary.startsAt) range = boundary.range;
    }
    return range;
}

/** Output shape for API responses, e.g. `{ time: "07:00", range: "Pagi" }`. */
export function toMealTimeView(input: string | ClockTime): MealTimeView {
    return { time: formatClockTime(input), range: getMealTimeRange(input) };
}
