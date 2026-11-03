import type { Clock } from "../../../shared/ports/clock/clock.js";
import { BUSINESS_TIME_ZONE } from "../../../shared/time/time-zone.js";

export class SystemClock implements Clock {
    constructor(readonly timeZone: string = BUSINESS_TIME_ZONE) {
        try {
            Temporal.Now.zonedDateTimeISO(timeZone);
        } catch (cause) {
            throw new Error(`invalid clock time zone: ${timeZone}`, { cause });
        }
    }

    now(): Temporal.ZonedDateTime {
        return Temporal.Now.zonedDateTimeISO(this.timeZone);
    }
}
