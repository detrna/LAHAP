import { BUSINESS_TIME_ZONE } from "../../../shared/time/time-zone.js";

const LAST_MOMENT = Temporal.PlainTime.from("23:59:59.999");

export function cutoffAt(startDate: Temporal.PlainDate): Temporal.ZonedDateTime {
    return startDate.subtract({ days: 1 }).toZonedDateTime({ timeZone: BUSINESS_TIME_ZONE, plainTime: LAST_MOMENT });
}

export function isBeforeCutoff(now: Temporal.ZonedDateTime, startDate: Temporal.PlainDate): boolean {
    return Temporal.PlainDate.compare(now.withTimeZone(BUSINESS_TIME_ZONE).toPlainDate(), startDate) < 0;
}
