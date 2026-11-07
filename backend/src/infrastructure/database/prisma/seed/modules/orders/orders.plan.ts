import { nextMonday, startOfMonth } from "../../../../../../shared/time/calendar.js";

const CHURNED_CHECKOUT_DAYS_AGO = 35;
const CHURNED_SERVICE_DAYS = 3;
const CANCELLED_DAYS_AHEAD = 3;

export interface OrderDatesPlan {
    readonly churned: {
        readonly checkoutDay: Temporal.PlainDate;
        readonly serviceDays: readonly Temporal.PlainDate[];
    };
    readonly monthly: {
        readonly checkoutDay: Temporal.PlainDate;
        readonly periodStart: Temporal.PlainDate;
        readonly pastServiceDays: readonly Temporal.PlainDate[];
    };
    readonly delivery: {
        readonly checkoutDay: Temporal.PlainDate;
        readonly today: Temporal.PlainDate;
        readonly tomorrow: Temporal.PlainDate;
    };
    readonly weekly: { readonly periodStart: Temporal.PlainDate };
    readonly cancelled: { readonly serviceDay: Temporal.PlainDate };
}

export function planOrderDates(today: Temporal.PlainDate): OrderDatesPlan {
    const periodStart = startOfMonth(today);
    const pastServiceDays: Temporal.PlainDate[] = [];
    for (let day = periodStart; Temporal.PlainDate.compare(day, today) < 0; day = day.add({ days: 1 })) {
        pastServiceDays.push(day);
    }

    return {
        churned: {
            checkoutDay: today.subtract({ days: CHURNED_CHECKOUT_DAYS_AGO }),
            serviceDays: Array.from({ length: CHURNED_SERVICE_DAYS }, (_, index) =>
                today.subtract({ days: CHURNED_CHECKOUT_DAYS_AGO - 1 - index }),
            ),
        },
        monthly: { checkoutDay: periodStart.subtract({ days: 1 }), periodStart, pastServiceDays },
        delivery: {
            checkoutDay: today.subtract({ days: 1 }),
            today,
            tomorrow: today.add({ days: 1 }),
        },
        weekly: { periodStart: nextMonday(today) },
        cancelled: { serviceDay: today.add({ days: CANCELLED_DAYS_AHEAD }) },
    };
}
