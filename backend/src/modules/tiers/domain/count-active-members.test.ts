import { describe, expect, it } from "vitest";
import { countActiveMembers } from "./count-active-members.js";

const BIASA = { id: "biasa", requiredSubscriptionDays: 0, durationDays: 30 };
const SILVER = { id: "silver", requiredSubscriptionDays: 30, durationDays: 30 };
const GOLD = { id: "gold", requiredSubscriptionDays: 60, durationDays: 30 };
const TIERS = [BIASA, SILVER, GOLD];

const at = (value: string) => Temporal.PlainDateTime.from(value);
const NOW = at("2026-11-10T00:00:00");

describe("countActiveMembers (unit)", () => {
    it("counts a membership on its stored tier while the window runs", () => {
        const windows = [
            { tierId: "gold", startedAt: at("2026-11-01T00:00:00"), expiresAt: at("2026-12-01T00:00:00") },
        ];

        expect(countActiveMembers(windows, TIERS, NOW)).toEqual(new Map([["gold", 1]]));
    });

    it("counts a lapsed Gold member under Silver", () => {
        const windows = [
            { tierId: "gold", startedAt: at("2026-10-01T00:00:00"), expiresAt: at("2026-11-05T00:00:00") },
        ];

        expect(countActiveMembers(windows, TIERS, NOW)).toEqual(new Map([["silver", 1]]));
    });

    it("does not count a member whose lowest window has passed", () => {
        const windows = [
            { tierId: "biasa", startedAt: at("2026-09-01T00:00:00"), expiresAt: at("2026-10-01T00:00:00") },
        ];

        expect(countActiveMembers(windows, TIERS, NOW).size).toBe(0);
    });

    it("sums several members and ignores memberships of unknown tiers", () => {
        const window = { startedAt: at("2026-11-01T00:00:00"), expiresAt: at("2026-12-01T00:00:00") };
        const windows = [
            { tierId: "silver", ...window },
            { tierId: "silver", ...window },
            { tierId: "gone", ...window },
        ];

        expect(countActiveMembers(windows, TIERS, NOW)).toEqual(new Map([["silver", 2]]));
    });
});
