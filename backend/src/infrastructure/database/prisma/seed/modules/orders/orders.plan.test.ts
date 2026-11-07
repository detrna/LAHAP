import { describe, expect, it } from "vitest";
import { isMonday, isFirstOfMonth } from "../../../../../../shared/time/calendar.js";
import { CHURN_AFTER_DAYS } from "../../../../../../shared/utils/churn/churn.js";
import { planOrderDates } from "./orders.plan.js";

function* everyDayOf(from: string, days: number) {
    let date = Temporal.PlainDate.from(from);
    for (let i = 0; i < days; i++) {
        yield date;
        date = date.add({ days: 1 });
    }
}

describe("planOrderDates (unit)", () => {
    it("lays out the demo story for a typical day", () => {
        const plan = planOrderDates(Temporal.PlainDate.from("2026-11-10"));

        expect(plan.churned.checkoutDay.toString()).toBe("2026-10-06");
        expect(plan.churned.serviceDays.map(day => day.toString())).toEqual(["2026-10-07", "2026-10-08", "2026-10-09"]);
        expect(plan.monthly.periodStart.toString()).toBe("2026-11-01");
        expect(plan.monthly.checkoutDay.toString()).toBe("2026-10-31");
        expect(plan.monthly.pastServiceDays.map(day => day.toString())).toEqual(
            Array.from({ length: 9 }, (_, i) => `2026-11-0${i + 1}`),
        );
        expect(plan.delivery.checkoutDay.toString()).toBe("2026-11-09");
        expect(plan.delivery.today.toString()).toBe("2026-11-10");
        expect(plan.delivery.tomorrow.toString()).toBe("2026-11-11");
        expect(plan.weekly.periodStart.toString()).toBe("2026-11-16");
        expect(plan.cancelled.serviceDay.toString()).toBe("2026-11-13");
    });

    it("keeps the story in order and checkout-able on any day of the year", () => {
        for (const today of everyDayOf("2026-01-01", 800)) {
            const plan = planOrderDates(today);

            expect(Temporal.PlainDate.compare(plan.churned.checkoutDay, plan.churned.serviceDays[0]!)).toBeLessThan(0);
            expect(plan.churned.serviceDays.at(-1)!.until(today, { largestUnit: "days" }).days).toBeGreaterThan(
                CHURN_AFTER_DAYS,
            );
            expect(Temporal.PlainDate.compare(plan.churned.serviceDays.at(-1)!, plan.monthly.checkoutDay)).toBeLessThan(
                0,
            );

            expect(isFirstOfMonth(plan.monthly.periodStart)).toBe(true);
            expect(Temporal.PlainDate.compare(plan.monthly.periodStart, today)).toBeLessThanOrEqual(0);
            expect(plan.monthly.checkoutDay.add({ days: 1 }).equals(plan.monthly.periodStart)).toBe(true);
            expect(plan.monthly.pastServiceDays.at(-1)?.add({ days: 1 }).equals(today) ?? true).toBe(true);
            expect(Temporal.PlainDate.compare(plan.monthly.checkoutDay, plan.delivery.checkoutDay)).toBeLessThanOrEqual(
                0,
            );

            expect(plan.delivery.checkoutDay.add({ days: 1 }).equals(today)).toBe(true);
            expect(plan.delivery.today.equals(today)).toBe(true);
            expect(isMonday(plan.weekly.periodStart)).toBe(true);
            expect(Temporal.PlainDate.compare(plan.weekly.periodStart, today)).toBeGreaterThan(0);
            expect(plan.cancelled.serviceDay.since(today, { largestUnit: "days" }).days).toBe(3);
        }
    });
});
