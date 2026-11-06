import { describe, expect, it } from "vitest";
import { tierCreateSchema, tierUpdateSchema } from "./tiers.schemas.js";

const VALID = { name: "Platinum", requiredSubscriptionDays: 90, discountPercent: 15 };

describe("tierCreateSchema (unit)", () => {
    it("accepts the required fields and trims the name", () => {
        expect(tierCreateSchema.parse({ ...VALID, name: "  Platinum  " })).toEqual(VALID);
    });

    it("accepts every optional field, with null clearing description and photo", () => {
        const body = { ...VALID, description: null, durationDays: 3650, photoKey: null };

        expect(tierCreateSchema.parse(body)).toEqual(body);
        expect(tierCreateSchema.parse({ ...VALID, photoKey: "tiers/2026/11/a.webp" }).photoKey).toBe(
            "tiers/2026/11/a.webp",
        );
    });

    it("rounds the discount to 2 decimals", () => {
        expect(tierCreateSchema.parse({ ...VALID, discountPercent: 12.345 }).discountPercent).toBe(12.35);
    });

    it.each([
        ["a discount above 100", { discountPercent: 101 }],
        ["a negative discount", { discountPercent: -1 }],
        ["0 duration days", { durationDays: 0 }],
        ["more than 3650 duration days", { durationDays: 3651 }],
        ["a negative threshold", { requiredSubscriptionDays: -1 }],
        ["a fractional threshold", { requiredSubscriptionDays: 1.5 }],
        ["a threshold above the column", { requiredSubscriptionDays: 2147483648 }],
        ["an empty name", { name: "   " }],
        ["a name over 50 characters", { name: "x".repeat(51) }],
        ["a photo key outside tiers/", { photoKey: "menus/2026/11/a.webp" }],
    ])("rejects %s", (_, override) => {
        expect(tierCreateSchema.safeParse({ ...VALID, ...override }).success).toBe(false);
    });

    it("rejects a missing required field", () => {
        expect(tierCreateSchema.safeParse({ name: "Platinum", discountPercent: 15 }).success).toBe(false);
    });
});

describe("tierUpdateSchema (unit)", () => {
    it("accepts one field", () => {
        expect(tierUpdateSchema.parse({ discountPercent: 12 })).toEqual({ discountPercent: 12 });
    });

    it("rejects an empty body", () => {
        expect(tierUpdateSchema.safeParse({}).success).toBe(false);
    });

    it("applies the same limits as create", () => {
        expect(tierUpdateSchema.safeParse({ durationDays: 3651 }).success).toBe(false);
        expect(tierUpdateSchema.safeParse({ photoKey: "menus/a.webp" }).success).toBe(false);
        expect(tierUpdateSchema.parse({ photoKey: null })).toEqual({ photoKey: null });
    });
});
