import { describe, expect, it } from "vitest";
import { lowerTier, nextTier, qualifyingTier } from "./qualifying-tier.js";

const BIASA = { name: "Biasa", requiredSubscriptionDays: 0 };
const SILVER = { name: "Silver", requiredSubscriptionDays: 30 };
const GOLD = { name: "Gold", requiredSubscriptionDays: 60 };
const TIERS = [BIASA, SILVER, GOLD];

describe("qualifyingTier (unit)", () => {
    it("gives no tier for 0 paid days, even with a 0-day tier", () => {
        expect(qualifyingTier(TIERS, 0)).toBeNull();
    });

    it.each([
        [1, BIASA],
        [29, BIASA],
        [30, SILVER],
        [59, SILVER],
        [60, GOLD],
        [200, GOLD],
    ])("picks the highest tier whose threshold is reached at %i days", (days, expected) => {
        expect(qualifyingTier(TIERS, days)).toBe(expected);
    });

    it("gives null when no tier is reached and there is no 0-day tier", () => {
        expect(qualifyingTier([SILVER, GOLD], 10)).toBeNull();
    });

    it("does not depend on the order of the list", () => {
        expect(qualifyingTier([GOLD, BIASA, SILVER], 45)).toBe(SILVER);
    });

    it("gives null for an empty list", () => {
        expect(qualifyingTier([], 100)).toBeNull();
    });
});

describe("nextTier (unit)", () => {
    it("is the lowest tier above the days", () => {
        expect(nextTier(TIERS, 10, BIASA)).toBe(SILVER);
        expect(nextTier(TIERS, 30, SILVER)).toBe(GOLD);
    });

    it("is null at the top", () => {
        expect(nextTier(TIERS, 60, GOLD)).toBeNull();
        expect(nextTier(TIERS, 500, GOLD)).toBeNull();
    });

    it("works without a membership", () => {
        expect(nextTier(TIERS, 0, null)).toBe(SILVER);
    });

    it("stays above the current tier after an admin raised a lower threshold", () => {
        const raisedSilver = { name: "Silver", requiredSubscriptionDays: 45 };
        expect(nextTier([BIASA, raisedSilver, GOLD], 40, GOLD)).toBeNull();
        expect(nextTier([BIASA, raisedSilver, GOLD], 40, raisedSilver)).toBe(GOLD);
    });
});

describe("lowerTier (unit)", () => {
    it("is the highest threshold below the given tier", () => {
        expect(lowerTier(TIERS, GOLD)).toBe(SILVER);
        expect(lowerTier(TIERS, SILVER)).toBe(BIASA);
    });

    it("is null at the lowest tier", () => {
        expect(lowerTier(TIERS, BIASA)).toBeNull();
    });
});
