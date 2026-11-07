import { describe, expect, it } from "vitest";
import { formatDaysSince } from "./days-since.js";

describe("formatDaysSince (unit)", () => {
    it.each([
        [15, "15 hari"],
        [1, "1 hari"],
        [120, "120 hari"],
    ])("writes %i days as %j", (days, expected) => {
        expect(formatDaysSince(days)).toBe(expected);
    });
});
