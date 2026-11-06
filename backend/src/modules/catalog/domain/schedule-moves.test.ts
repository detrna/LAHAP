import { describe, expect, it } from "vitest";
import { isFutureMove, isInsidePeriods } from "./schedule-moves.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const TODAY = date("2026-11-10");

describe("isFutureMove (unit)", () => {
    it("allows a move when both dates are after today", () => {
        expect(isFutureMove(date("2026-11-11"), date("2026-11-12"), TODAY)).toBe(true);
    });

    it("refuses a move away from today", () => {
        expect(isFutureMove(TODAY, date("2026-11-12"), TODAY)).toBe(false);
    });

    it("refuses a move onto today", () => {
        expect(isFutureMove(date("2026-11-12"), TODAY, TODAY)).toBe(false);
    });
});

describe("isInsidePeriods (unit)", () => {
    const period = (startDate: string, endDate: string) => ({
        scheduleId: "s-1",
        startDate: date(startDate),
        endDate: date(endDate),
    });

    it("accepts a date inside every period, edges included", () => {
        const periods = [period("2026-11-09", "2026-11-15"), period("2026-11-11", "2026-11-11")];

        expect(isInsidePeriods(date("2026-11-11"), periods)).toBe(true);
    });

    it("refuses a date outside one of the periods", () => {
        const periods = [period("2026-11-09", "2026-11-15"), period("2026-11-09", "2026-11-10")];

        expect(isInsidePeriods(date("2026-11-11"), periods)).toBe(false);
    });

    it("accepts any date when there are no periods", () => {
        expect(isInsidePeriods(date("2026-12-01"), [])).toBe(true);
    });
});
