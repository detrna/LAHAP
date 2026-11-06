import { daysBetween } from "../../../shared/time/calendar.js";
import { BUSINESS_TIME_ZONE } from "../../../shared/time/time-zone.js";

export function daysRemaining(expiresAt: Temporal.PlainDateTime, now: Temporal.ZonedDateTime): number {
    const expiryDate = expiresAt.toZonedDateTime("UTC").withTimeZone(BUSINESS_TIME_ZONE).toPlainDate();
    const today = now.withTimeZone(BUSINESS_TIME_ZONE).toPlainDate();
    return Math.max(0, daysBetween(today, expiryDate));
}
