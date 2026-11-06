import { BUSINESS_TIME_ZONE } from "../../../shared/time/time-zone.js";

export function isDueForPreparation(
    serviceDate: Temporal.PlainDate,
    deliveryTime: Temporal.PlainTime,
    now: Temporal.ZonedDateTime,
    leadMinutes: number,
): boolean {
    const mealAt = serviceDate.toZonedDateTime({ timeZone: BUSINESS_TIME_ZONE, plainTime: deliveryTime });
    return Temporal.ZonedDateTime.compare(now, mealAt.subtract({ minutes: leadMinutes })) >= 0;
}

export function preparationHorizon(now: Temporal.ZonedDateTime, leadMinutes: number): Temporal.PlainDate {
    return now.withTimeZone(BUSINESS_TIME_ZONE).add({ minutes: leadMinutes }).toPlainDate();
}
