import { describe, expect, it } from "vitest";
import { decideMembershipChange, type QualifyingTier } from "./membership-change.js";

const NOW = Temporal.PlainDateTime.from("2026-11-03T01:00:00");
const SILVER: QualifyingTier = { id: "silver", requiredSubscriptionDays: 30, durationDays: 30 };
const GOLD: QualifyingTier = { id: "gold", requiredSubscriptionDays: 60, durationDays: 20 };

describe("decideMembershipChange (unit)", () => {
    describe("on a payment", () => {
        it("inserts a membership with a new window when there is none", () => {
            expect(decideMembershipChange({ current: null, qualifying: SILVER, renewWindow: true, now: NOW })).toEqual({
                kind: "insert",
                tierId: "silver",
                startedAt: NOW,
                expiresAt: Temporal.PlainDateTime.from("2026-12-03T01:00:00"),
            });
        });

        it("renews the window with the qualifying tier's duration", () => {
            expect(
                decideMembershipChange({ current: { tier: SILVER }, qualifying: GOLD, renewWindow: true, now: NOW }),
            ).toEqual({
                kind: "renew",
                tierId: "gold",
                startedAt: NOW,
                expiresAt: Temporal.PlainDateTime.from("2026-11-23T01:00:00"),
            });
        });

        it("restores the earned tier even when the stored one is lower", () => {
            expect(
                decideMembershipChange({ current: { tier: SILVER }, qualifying: GOLD, renewWindow: true, now: NOW }),
            ).toMatchObject({ kind: "renew", tierId: "gold" });
        });
    });

    describe("on a cancellation", () => {
        it("moves down to the qualifying tier and keeps the dates", () => {
            expect(
                decideMembershipChange({ current: { tier: GOLD }, qualifying: SILVER, renewWindow: false, now: NOW }),
            ).toEqual({ kind: "changeTier", tierId: "silver" });
        });

        it("never moves up", () => {
            expect(
                decideMembershipChange({ current: { tier: SILVER }, qualifying: GOLD, renewWindow: false, now: NOW }),
            ).toEqual({ kind: "none" });
        });

        it("does nothing when the tier is unchanged", () => {
            expect(
                decideMembershipChange({ current: { tier: GOLD }, qualifying: GOLD, renewWindow: false, now: NOW }),
            ).toEqual({ kind: "none" });
        });

        it("does nothing when there is no membership row", () => {
            expect(decideMembershipChange({ current: null, qualifying: SILVER, renewWindow: false, now: NOW })).toEqual(
                {
                    kind: "none",
                },
            );
        });
    });

    describe("with no paid days", () => {
        it("deletes an existing membership", () => {
            expect(
                decideMembershipChange({ current: { tier: GOLD }, qualifying: null, renewWindow: false, now: NOW }),
            ).toEqual({ kind: "delete" });
            expect(
                decideMembershipChange({ current: { tier: GOLD }, qualifying: null, renewWindow: true, now: NOW }),
            ).toEqual({ kind: "delete" });
        });

        it("does nothing without a membership", () => {
            expect(decideMembershipChange({ current: null, qualifying: null, renewWindow: true, now: NOW })).toEqual({
                kind: "none",
            });
        });
    });
});
