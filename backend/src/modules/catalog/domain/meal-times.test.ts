import { describe, expect, it } from "vitest";
import { findRemovedMealTimes, sortMealTimes } from "./meal-times.js";

const times = (...values: string[]) => values.map(value => Temporal.PlainTime.from(value));
const asText = (values: readonly Temporal.PlainTime[]) =>
    values.map(value => value.toString({ smallestUnit: "minute" }));

describe("sortMealTimes", () => {
    it("sorts ascending without touching the input", () => {
        const input = times("18:30", "07:00", "12:00");

        expect(asText(sortMealTimes(input))).toEqual(["07:00", "12:00", "18:30"]);
        expect(asText(input)).toEqual(["18:30", "07:00", "12:00"]);
    });
});

describe("findRemovedMealTimes", () => {
    it("returns the current times missing from the next list", () => {
        expect(asText(findRemovedMealTimes(times("07:00", "12:00", "18:30"), times("12:00", "19:00")))).toEqual([
            "07:00",
            "18:30",
        ]);
    });

    it("compares at minute precision", () => {
        expect(findRemovedMealTimes(times("07:00:30"), times("07:00"))).toEqual([]);
    });

    it("returns nothing when no time was dropped", () => {
        expect(findRemovedMealTimes(times("07:00"), times("07:00", "12:00"))).toEqual([]);
    });
});
