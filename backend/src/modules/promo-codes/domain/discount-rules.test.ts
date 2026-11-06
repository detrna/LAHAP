import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { assertDiscountValue, assertValidUntilInFuture } from "./discount-rules.js";

const issuesOf = (action: () => void) => {
    try {
        action();
    } catch (error) {
        return (error as ValidationError).issues;
    }
    return null;
};

describe("assertDiscountValue (unit)", () => {
    it.each([
        ["Persen", 0.01],
        ["Persen", 100],
        ["Nominal", 1],
        ["Nominal", 9999999999.99],
    ] as const)("accepts %s %s", (type, value) => {
        expect(() => assertDiscountValue(type, value)).not.toThrow();
    });

    it("rejects a percent above 100 on the discountValue path", () => {
        expect(issuesOf(() => assertDiscountValue("Persen", 100.01))).toEqual([
            expect.objectContaining({ target: "body", path: "discountValue", code: "too_big" }),
        ]);
    });

    it.each([
        ["Persen", 0],
        ["Nominal", 0],
        ["Nominal", -5],
    ] as const)("rejects %s %s as not above 0", (type, value) => {
        expect(issuesOf(() => assertDiscountValue(type, value))).toEqual([
            expect.objectContaining({ path: "discountValue", code: "too_small" }),
        ]);
    });

    it("lets a large nominal value through", () => {
        expect(() => assertDiscountValue("Nominal", 150)).not.toThrow();
    });
});

describe("assertValidUntilInFuture (unit)", () => {
    const now = Temporal.PlainDateTime.from("2026-11-06T08:00:00");

    it("accepts a later time", () => {
        expect(() => assertValidUntilInFuture(Temporal.PlainDateTime.from("2026-11-06T08:00:01"), now)).not.toThrow();
    });

    it.each(["2026-11-06T08:00:00", "2026-11-05T08:00:00"])("rejects %s", value => {
        expect(issuesOf(() => assertValidUntilInFuture(Temporal.PlainDateTime.from(value), now))).toEqual([
            expect.objectContaining({ target: "body", path: "validUntil" }),
        ]);
    });
});
