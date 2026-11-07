import { describe, expect, it } from "vitest";
import { evaluatePromo, type PromoCandidate, type PromoCheckContext } from "./promo-check.js";

const NOW = Temporal.PlainDateTime.from("2026-11-06T03:00:00");
const CANDIDATE: PromoCandidate = {
    id: "promo-1",
    code: "MERDEKA",
    discountType: "Persen",
    discountValue: 10,
    allowStackWithTier: true,
    minPurchase: 50000,
    validUntil: NOW.add({ days: 1 }),
    quota: 2,
    isActive: true,
};
const CONTEXT: PromoCheckContext = { usedCount: 1, userUseCount: 0, foodSubtotal: 50000, now: NOW };

describe("evaluatePromo", () => {
    it("accepts a usable code and returns what the discount needs", () => {
        expect(evaluatePromo(CANDIDATE, CONTEXT)).toEqual({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "MERDEKA",
                discountType: "Persen",
                discountValue: 10,
                allowStackWithTier: true,
                quota: 2,
            },
        });
    });

    it.each([
        ["INACTIVE", { ...CANDIDATE, isActive: false, quota: 0 }, CONTEXT],
        ["EXPIRED", { ...CANDIDATE, validUntil: NOW, quota: 0 }, CONTEXT],
        ["QUOTA_EXHAUSTED", CANDIDATE, { ...CONTEXT, usedCount: 2, userUseCount: 1 }],
        ["QUOTA_EXHAUSTED", { ...CANDIDATE, quota: 0 }, { ...CONTEXT, usedCount: 0 }],
        ["ALREADY_USED", CANDIDATE, { ...CONTEXT, userUseCount: 1, foodSubtotal: 0 }],
        ["MIN_PURCHASE_NOT_MET", CANDIDATE, { ...CONTEXT, foodSubtotal: 49999.99 }],
    ] as const)("rejects with %s, the first failing check", (reason, candidate, context) => {
        expect(evaluatePromo(candidate, context)).toEqual({ valid: false, code: "MERDEKA", reason });
    });

    it("accepts a code until the moment before validUntil", () => {
        const candidate = { ...CANDIDATE, validUntil: NOW.add({ seconds: 1 }) };
        expect(evaluatePromo(candidate, CONTEXT).valid).toBe(true);
    });

    it("skips the minimum purchase when there is no subtotal yet, but keeps every other rule", () => {
        const { foodSubtotal: _, ...withoutSubtotal } = CONTEXT;

        expect(evaluatePromo(CANDIDATE, withoutSubtotal)).toMatchObject({ valid: true });
        expect(evaluatePromo(CANDIDATE, { ...withoutSubtotal, usedCount: 2 })).toMatchObject({
            reason: "QUOTA_EXHAUSTED",
        });
        expect(evaluatePromo(CANDIDATE, { ...withoutSubtotal, userUseCount: 1 })).toMatchObject({
            reason: "ALREADY_USED",
        });
    });
});
