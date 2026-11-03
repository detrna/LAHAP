import type { Clock } from "../../../../src/shared/ports/clock/clock.js";
import { BUSINESS_TIME_ZONE } from "../../../../src/shared/time/time-zone.js";

export const DEFAULT_FIXED_NOW = "2026-11-03T08:00:00+07:00[Asia/Jakarta]";

export interface FixedClock extends Clock {
    set(at: string | Temporal.ZonedDateTime): void;
    advance(duration: Temporal.DurationLike): void;
}

const toZoned = (at: string | Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    (typeof at === "string" ? Temporal.ZonedDateTime.from(at) : at).withTimeZone(BUSINESS_TIME_ZONE);

export function createFixedClock(at: string | Temporal.ZonedDateTime = DEFAULT_FIXED_NOW): FixedClock {
    let current = toZoned(at);
    return {
        now: () => current,
        set: next => {
            current = toZoned(next);
        },
        advance: duration => {
            current = current.add(duration);
        },
    };
}
