import { describe, expect, it } from "vitest";
import {
    daysBetween,
    endOfMonth,
    isFirstOfMonth,
    isMonday,
    nextMonday,
    startOfMonth,
    startOfWeek,
} from "./calendar.js";

const date = (iso: string) => Temporal.PlainDate.from(iso);

describe("calendar", () => {
    it("startOfWeek gives the Monday of the same week", () => {
        expect(startOfWeek(date("2026-11-08")).toString()).toBe("2026-11-02");
        expect(startOfWeek(date("2026-11-04")).toString()).toBe("2026-11-02");
        expect(startOfWeek(date("2026-11-02")).toString()).toBe("2026-11-02");
    });

    it("nextMonday gives the following Monday, a week later for a Monday", () => {
        expect(nextMonday(date("2026-11-08")).toString()).toBe("2026-11-09");
        expect(nextMonday(date("2026-11-04")).toString()).toBe("2026-11-09");
        expect(nextMonday(date("2026-11-09")).toString()).toBe("2026-11-16");
    });

    it("startOfMonth and endOfMonth bound the month", () => {
        expect(startOfMonth(date("2026-11-17")).toString()).toBe("2026-11-01");
        expect(endOfMonth(date("2026-02-10")).toString()).toBe("2026-02-28");
        expect(endOfMonth(date("2028-02-10")).toString()).toBe("2028-02-29");
        expect(endOfMonth(date("2026-12-31")).toString()).toBe("2026-12-31");
    });

    it("daysBetween counts calendar days, negative when going back", () => {
        expect(daysBetween(date("2026-11-03"), date("2026-11-10"))).toBe(7);
        expect(daysBetween(date("2026-12-31"), date("2027-01-01"))).toBe(1);
        expect(daysBetween(date("2026-11-10"), date("2026-11-03"))).toBe(-7);
        expect(daysBetween(date("2026-11-03"), date("2026-11-03"))).toBe(0);
    });

    it("isMonday and isFirstOfMonth", () => {
        expect(isMonday(date("2026-11-09"))).toBe(true);
        expect(isMonday(date("2026-11-08"))).toBe(false);
        expect(isFirstOfMonth(date("2026-11-01"))).toBe(true);
        expect(isFirstOfMonth(date("2026-11-02"))).toBe(false);
    });
});
