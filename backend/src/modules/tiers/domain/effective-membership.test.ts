import { describe, expect, it } from "vitest";
import { effectiveMembership } from "./effective-membership.js";

const BIASA = { name: "Biasa", requiredSubscriptionDays: 0, durationDays: 30 };
const SILVER = { name: "Silver", requiredSubscriptionDays: 30, durationDays: 30 };
const GOLD = { name: "Gold", requiredSubscriptionDays: 60, durationDays: 30 };
const TIERS = [BIASA, SILVER, GOLD];

const at = (value: string) => Temporal.PlainDateTime.from(value);
const GOLD_WINDOW = { tier: GOLD, startedAt: at("2026-10-01T00:00:00"), expiresAt: at("2026-10-31T00:00:00") };

describe("effectiveMembership (unit)", () => {
    it("keeps the stored tier while its window runs", () => {
        const result = effectiveMembership(GOLD_WINDOW, TIERS, at("2026-10-30T23:59:59"));

        expect(result).toEqual({ ...GOLD_WINDOW, isActive: true });
    });

    it("steps down exactly at expiresAt, with a window starting at the old expiry", () => {
        const result = effectiveMembership(GOLD_WINDOW, TIERS, at("2026-10-31T00:00:00"));

        expect(result).toEqual({
            tier: SILVER,
            startedAt: at("2026-10-31T00:00:00"),
            expiresAt: at("2026-11-30T00:00:00"),
            isActive: true,
        });
    });

    it("steps down to the lowest tier after two windows", () => {
        const result = effectiveMembership(GOLD_WINDOW, TIERS, at("2026-12-01T00:00:00"));

        expect(result).toEqual({
            tier: BIASA,
            startedAt: at("2026-11-30T00:00:00"),
            expiresAt: at("2026-12-30T00:00:00"),
            isActive: true,
        });
    });

    it("is inactive on the lowest tier once its window has passed", () => {
        const result = effectiveMembership(GOLD_WINDOW, TIERS, at("2026-12-30T00:00:00"));

        expect(result).toMatchObject({ tier: BIASA, isActive: false });
        expect(result.expiresAt).toEqual(at("2026-12-30T00:00:00"));
    });

    it("stays inactive far in the future", () => {
        expect(effectiveMembership(GOLD_WINDOW, TIERS, at("2030-01-01T00:00:00"))).toMatchObject({
            tier: BIASA,
            isActive: false,
        });
    });

    it("is inactive when the stored tier is already the lowest", () => {
        const stored = { tier: BIASA, startedAt: at("2026-10-01T00:00:00"), expiresAt: at("2026-10-31T00:00:00") };

        expect(effectiveMembership(stored, TIERS, at("2026-11-01T00:00:00"))).toEqual({ ...stored, isActive: false });
    });

    it("uses each lower tier's own duration", () => {
        const longBiasa = { ...BIASA, durationDays: 90 };
        const shortSilver = { ...SILVER, durationDays: 10 };
        const tiers = [longBiasa, shortSilver, GOLD];

        expect(effectiveMembership(GOLD_WINDOW, tiers, at("2026-11-12T00:00:00"))).toEqual({
            tier: longBiasa,
            startedAt: at("2026-11-10T00:00:00"),
            expiresAt: at("2027-02-08T00:00:00"),
            isActive: true,
        });
    });
});
