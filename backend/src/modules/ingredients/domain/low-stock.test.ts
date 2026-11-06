import { describe, expect, it } from "vitest";
import { isLowStock } from "./low-stock.js";

describe("isLowStock", () => {
    it("is low below the threshold", () => {
        expect(isLowStock(4, 10)).toBe(true);
    });

    it("is low exactly at the threshold", () => {
        expect(isLowStock(10, 10)).toBe(true);
    });

    it("is not low above the threshold", () => {
        expect(isLowStock(10.01, 10)).toBe(false);
    });

    it("is low when both are zero", () => {
        expect(isLowStock(0, 0)).toBe(true);
    });
});
