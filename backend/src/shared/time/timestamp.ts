import { BUSINESS_TIME_ZONE } from "./time-zone.js";

const STORAGE_TIME_ZONE = "UTC";

export function toIsoTimestamp(value: Temporal.PlainDateTime): string {
    return value
        .toZonedDateTime(STORAGE_TIME_ZONE)
        .withTimeZone(BUSINESS_TIME_ZONE)
        .toString({ timeZoneName: "never", fractionalSecondDigits: 3, roundingMode: "trunc" });
}

export function toDbTimestamp(value: Temporal.ZonedDateTime): Temporal.PlainDateTime {
    return value.withTimeZone(STORAGE_TIME_ZONE).toPlainDateTime();
}
