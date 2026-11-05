import { describe, expect, it } from "vitest";
import { fromNumeric, fromNumericOrNull, toNumeric, toNumericOrNull } from "./numeric.js";

describe("fromNumeric", () => {
    it.each([
        ["5000.00", 5000],
        ["-7.93930000", -7.9393],
        ["0", 0],
    ])("reads %j as %d", (value, expected) => {
        expect(fromNumeric(value)).toBe(expected);
    });

    it.each(["", "abc", "NaN"])("refuses %j", value => {
        expect(() => fromNumeric(value)).toThrow(RangeError);
    });

    it("passes null through", () => {
        expect(fromNumericOrNull(null)).toBeNull();
        expect(fromNumericOrNull("1.50")).toBe(1.5);
    });
});

describe("toNumeric", () => {
    it.each([
        [5000, 2, "5000.00"],
        [0.125, 2, "0.13"],
        [1.005, 2, "1.01"],
        [-7.939312345, 8, "-7.93931235"],
        [112.6094, 8, "112.60940000"],
        [-0.004, 2, "0.00"],
    ])("writes %d at scale %d as %j", (value, scale, expected) => {
        expect(toNumeric(value, scale)).toBe(expected);
    });

    it("passes null through", () => {
        expect(toNumericOrNull(null, 2)).toBeNull();
        expect(toNumericOrNull(15000, 2)).toBe("15000.00");
    });
});
