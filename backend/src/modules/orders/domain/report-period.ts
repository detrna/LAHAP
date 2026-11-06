import { endOfMonth, startOfMonth, startOfWeek } from "../../../shared/time/calendar.js";

export const REPORT_PERIODS = ["today", "week", "month"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

const DAYS_PER_WEEK = 7;

export function reportPeriodRange(
    period: ReportPeriod,
    today: Temporal.PlainDate,
): { readonly from: Temporal.PlainDate; readonly to: Temporal.PlainDate } {
    switch (period) {
        case "today":
            return { from: today, to: today };
        case "week": {
            const from = startOfWeek(today);
            return { from, to: from.add({ days: DAYS_PER_WEEK - 1 }) };
        }
        case "month":
            return { from: startOfMonth(today), to: endOfMonth(today) };
    }
}
