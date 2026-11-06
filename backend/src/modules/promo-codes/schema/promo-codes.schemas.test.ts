import { describe, expect, it } from "vitest";
import { promoCodeCreateSchema, promoCodeListQuerySchema, promoCodeUpdateSchema } from "./promo-codes.schemas.js";

const VALID = { discountType: "Persen", discountValue: 20, quota: 10 };

describe("promoCodeCreateSchema (unit)", () => {
    it("accepts the required fields", () => {
        expect(promoCodeCreateSchema.parse(VALID)).toEqual(VALID);
    });

    it("trims and uppercases the code", () => {
        expect(promoCodeCreateSchema.parse({ ...VALID, code: "  merdeka-17 " }).code).toBe("MERDEKA-17");
    });

    it.each(["HEMAT 20", "HEMAT.20", "", "   ", "A".repeat(51), "KODE!"])("rejects the code %j", code => {
        expect(promoCodeCreateSchema.safeParse({ ...VALID, code }).success).toBe(false);
    });

    it("rounds money to 2 decimals", () => {
        const parsed = promoCodeCreateSchema.parse({
            ...VALID,
            discountType: "Nominal",
            discountValue: 15000.005,
            minPurchase: 10000.125,
        });

        expect(parsed.discountValue).toBe(15000.01);
        expect(parsed.minPurchase).toBe(10000.13);
    });

    it("turns validUntil with an offset into a UTC timestamp", () => {
        expect(promoCodeCreateSchema.parse({ ...VALID, validUntil: "2026-12-01T10:00:00+07:00" }).validUntil).toEqual(
            Temporal.PlainDateTime.from("2026-12-01T03:00:00"),
        );
    });

    it.each([
        ["a validUntil without an offset", { validUntil: "2026-12-01T10:00:00" }],
        ["an unknown discount type", { discountType: "Percent" }],
        ["a zero discount", { discountValue: 0 }],
        ["a negative discount", { discountValue: -1 }],
        ["a discount above the column", { discountValue: 10000000000 }],
        ["a negative minimum purchase", { minPurchase: -1 }],
        ["a negative quota", { quota: -1 }],
        ["a fractional quota", { quota: 1.5 }],
        ["a quota above the column", { quota: 2147483648 }],
    ])("rejects %s", (_, override) => {
        expect(promoCodeCreateSchema.safeParse({ ...VALID, ...override }).success).toBe(false);
    });

    it("accepts a quota of 0", () => {
        expect(promoCodeCreateSchema.parse({ ...VALID, quota: 0 }).quota).toBe(0);
    });

    it("rejects a missing required field", () => {
        expect(promoCodeCreateSchema.safeParse({ discountType: "Persen", quota: 1 }).success).toBe(false);
    });
});

describe("promoCodeUpdateSchema (unit)", () => {
    it("accepts one field", () => {
        expect(promoCodeUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false });
    });

    it("normalizes the code", () => {
        expect(promoCodeUpdateSchema.parse({ code: " new_1 " })).toEqual({ code: "NEW_1" });
    });

    it("rejects an empty body", () => {
        expect(promoCodeUpdateSchema.safeParse({}).success).toBe(false);
    });
});

describe("promoCodeListQuerySchema (unit)", () => {
    it("reads the search and the isActive filter", () => {
        expect(promoCodeListQuerySchema.parse({ search: " mer ", isActive: "false", page: "2", limit: "5" })).toEqual({
            search: "mer",
            isActive: false,
            page: 2,
            limit: 5,
        });
    });

    it("treats an empty search as no filter and rejects a bad boolean", () => {
        expect(promoCodeListQuerySchema.parse({ search: "" }).search).toBeUndefined();
        expect(promoCodeListQuerySchema.safeParse({ isActive: "yes" }).success).toBe(false);
    });
});
