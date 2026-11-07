import { describe, expect, it } from "vitest";
import { formatIndonesianDate } from "./indonesian-date.js";

describe("formatIndonesianDate (unit)", () => {
    it("writes the weekday, day and short month", () => {
        expect(formatIndonesianDate(Temporal.PlainDate.from("2026-11-09"), "short-weekday")).toBe("Senin, 9 Nov");
        expect(formatIndonesianDate(Temporal.PlainDate.from("2026-11-15"), "short-weekday")).toBe("Minggu, 15 Nov");
    });

    it("writes the day, full month and year", () => {
        expect(formatIndonesianDate(Temporal.PlainDate.from("2026-10-12"), "long")).toBe("12 Oktober 2026");
        expect(formatIndonesianDate(Temporal.PlainDate.from("2027-01-01"), "long")).toBe("1 Januari 2027");
    });
});
