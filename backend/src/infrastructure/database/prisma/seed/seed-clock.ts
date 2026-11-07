import type { Clock } from "../../../../shared/ports/clock/clock.js";
import { BUSINESS_TIME_ZONE } from "../../../../shared/time/time-zone.js";

export class SeedClock implements Clock {
    private current: Temporal.ZonedDateTime;

    constructor(start: Temporal.ZonedDateTime) {
        this.current = start.withTimeZone(BUSINESS_TIME_ZONE);
    }

    now(): Temporal.ZonedDateTime {
        return this.current;
    }

    set(at: Temporal.ZonedDateTime): void {
        if (Temporal.ZonedDateTime.compare(at, this.current) < 0) throw new Error("seed clock cannot move backwards");
        this.current = at.withTimeZone(BUSINESS_TIME_ZONE);
    }

    advanceTo(at: Temporal.ZonedDateTime): void {
        if (Temporal.ZonedDateTime.compare(at, this.current) > 0) this.set(at);
    }
}
