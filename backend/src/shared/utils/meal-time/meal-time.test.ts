import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";
import {
    formatClockTime,
    getMealTimeRange,
    InvalidMealTimeError,
    parseClockTime,
    toMealTimeView,
} from "./meal-time.js";

// Node 26 ships Temporal at runtime, but @types/node does not declare it yet
declare const Temporal: { readonly PlainTime: { from(time: string): { readonly hour: number; readonly minute: number } } };

describe("getMealTimeRange", () => {
    it.each([
        ["07:00", "Pagi"],
        ["12:00", "Siang"],
        ["17:00", "Malam"],
        ["18:30", "Malam"],
    ] as const)("labels the PRD example %s as %s", (time, range) => {
        expect(getMealTimeRange(time)).toBe(range);
    });

    it.each([
        ["00:00", "Pagi"],
        ["10:59", "Pagi"],
        ["11:00", "Siang"],
        ["15:59", "Siang"],
        ["16:00", "Malam"],
        ["23:59", "Malam"],
    ] as const)("puts the boundary %s in %s", (time, range) => {
        expect(getMealTimeRange(time)).toBe(range);
    });

    it("accepts a ClockTime object such as Temporal.PlainTime", () => {
        expect(getMealTimeRange({ hour: 12, minute: 15 })).toBe("Siang");
        expect(getMealTimeRange(Temporal.PlainTime.from("18:30"))).toBe("Malam");
    });
});

describe("parseClockTime", () => {
    it("parses HH:mm and drops seconds and fractions as Postgres prints them", () => {
        expect(parseClockTime("07:05")).toEqual({ hour: 7, minute: 5 });
        expect(parseClockTime("07:05:30")).toEqual({ hour: 7, minute: 5 });
        expect(parseClockTime("07:05:30.123")).toEqual({ hour: 7, minute: 5 });
        expect(parseClockTime(" 07:05 ")).toEqual({ hour: 7, minute: 5 });
    });

    it("copies only hour and minute from an object", () => {
        expect(parseClockTime(Temporal.PlainTime.from("07:05:59"))).toEqual({ hour: 7, minute: 5 });
    });

    it.each(["7:00", "24:00", "12:60", "noon", "", "12:00:00:00"])("rejects the string %j", input => {
        expect(() => parseClockTime(input)).toThrow(InvalidMealTimeError);
    });

    it.each([
        { hour: -1, minute: 0 },
        { hour: 24, minute: 0 },
        { hour: 12, minute: 60 },
        { hour: 12.5, minute: 0 },
        { hour: Number.NaN, minute: 0 },
    ])("rejects the object %o", input => {
        expect(() => parseClockTime(input)).toThrow(InvalidMealTimeError);
    });

    it("throws an AppError with a 400 status and INVALID_MEAL_TIME code", () => {
        try {
            parseClockTime("25:00");
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error).toMatchObject({ statusCode: 400, code: "INVALID_MEAL_TIME", value: "25:00" });
        }
    });
});

describe("formatClockTime", () => {
    it("zero-pads to HH:mm", () => {
        expect(formatClockTime({ hour: 7, minute: 5 })).toBe("07:05");
        expect(formatClockTime("18:30:00")).toBe("18:30");
    });
});

describe("toMealTimeView", () => {
    it("returns the time with its derived range", () => {
        expect(toMealTimeView("07:00")).toEqual({ time: "07:00", range: "Pagi" });
        expect(toMealTimeView(Temporal.PlainTime.from("18:30:00"))).toEqual({ time: "18:30", range: "Malam" });
    });
});
