export const CHURN_AFTER_DAYS = 14;

export function churnCutoffDate(today: Temporal.PlainDate): Temporal.PlainDate {
    return today.subtract({ days: CHURN_AFTER_DAYS });
}

export function isChurned(lastSuccessEndDate: Temporal.PlainDate | null, today: Temporal.PlainDate): boolean {
    return lastSuccessEndDate !== null && Temporal.PlainDate.compare(lastSuccessEndDate, churnCutoffDate(today)) < 0;
}
