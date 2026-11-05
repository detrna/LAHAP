import { describe, expect, it } from "vitest";
import { roundHalfUp } from "./decimal.js";

describe("roundHalfUp", () => {
    it.each([
        [0.125, 2, 0.13],
        [1.005, 2, 1.01],
        [2.675, 2, 2.68],
        [-0.125, 2, -0.13],
        [5000, 2, 5000],
        [-7.939312345, 8, -7.93931235],
        [12.5, 0, 13],
        [-0.004, 2, 0],
    ])("rounds %d to %d decimals as %d", (value, scale, expected) => {
        expect(roundHalfUp(value, scale)).toBe(expected);
    });

    it("never returns negative zero", () => {
        expect(Object.is(roundHalfUp(-0.001, 2), -0)).toBe(false);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY])("refuses %d", value => {
        expect(() => roundHalfUp(value, 2)).toThrow(RangeError);
    });

    it("refuses a negative or fractional scale", () => {
        expect(() => roundHalfUp(1, -1)).toThrow(RangeError);
        expect(() => roundHalfUp(1, 1.5)).toThrow(RangeError);
    });
});
