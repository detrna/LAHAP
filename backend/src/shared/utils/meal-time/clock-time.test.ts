import { describe, expect, it } from "vitest";
import { clockTimeSchema, InvalidMealTimeError, isSameClockTime, toDbTime } from "./meal-time.js";

describe("clockTimeSchema", () => {
    it.each(["07:00", "00:00", "23:59"])("accepts %s as a minute-precision PlainTime", value => {
        const time = clockTimeSchema.parse(value);

        expect(time).toBeInstanceOf(Temporal.PlainTime);
        expect(time.toString({ smallestUnit: "minute" })).toBe(value);
        expect(time.second).toBe(0);
    });

    it.each(["7:00", "24:00", "07:60", "07:00:30", "07.00", "", " 07:00"])("rejects %j", value => {
        expect(clockTimeSchema.safeParse(value).success).toBe(false);
    });
});

describe("toDbTime", () => {
    it("drops seconds from strings and PlainTime values", () => {
        expect(toDbTime("18:30:45").toString()).toBe("18:30:00");
        expect(toDbTime(Temporal.PlainTime.from("07:05:59.5")).toString()).toBe("07:05:00");
    });

    it("throws InvalidMealTimeError for an invalid time", () => {
        expect(() => toDbTime("25:00")).toThrow(InvalidMealTimeError);
    });
});

describe("isSameClockTime", () => {
    it("compares at minute precision", () => {
        expect(isSameClockTime("07:00", "07:00:00")).toBe(true);
        expect(isSameClockTime(Temporal.PlainTime.from("07:00:30"), "07:00")).toBe(true);
        expect(isSameClockTime("07:00", "07:01")).toBe(false);
    });
});
