import { describe, expect, it } from "vitest";
import { decimalSchema } from "./decimal.js";

describe("decimalSchema", () => {
    const radius = decimalSchema({ scale: 2, min: 0, max: 999.99 });

    it("rounds half-up to the scale", () => {
        expect(radius.parse(1.005)).toBe(1.01);
        expect(radius.parse(2.5)).toBe(2.5);
    });

    it("accepts max at the boundary, also after rounding down to it, and rejects above", () => {
        expect(radius.parse(999.99)).toBe(999.99);
        expect(radius.parse(999.994)).toBe(999.99);
        expect(radius.safeParse(999.995).success).toBe(false);
        expect(radius.safeParse(1000).success).toBe(false);
    });

    it("accepts min inclusively by default", () => {
        expect(radius.parse(0)).toBe(0);
        expect(radius.safeParse(-0.01).success).toBe(false);
    });

    it("rejects min itself when exclusiveMin is set", () => {
        const price = decimalSchema({ scale: 2, min: 0, exclusiveMin: true });

        expect(price.safeParse(0).success).toBe(false);
        expect(price.safeParse(0.004).success).toBe(false);
        expect(price.parse(0.01)).toBe(0.01);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, "5000"])("rejects %j", value => {
        expect(decimalSchema({ scale: 2 }).safeParse(value).success).toBe(false);
    });
});
