import { describe, expect, it } from "vitest";
import type { ObstacleSlot } from "./courier-source.js";
import { canReportObstacle } from "./can-report-obstacle.js";

const slot = (overrides: Partial<ObstacleSlot> = {}): ObstacleSlot => ({
    userId: "u-1",
    courierId: "c-1",
    status: "Diantar",
    isDelivery: true,
    subscriptionStatus: "Success",
    menuScheduleId: "s-1",
    ...overrides,
});

describe("canReportObstacle (unit)", () => {
    describe("as a courier", () => {
        it("may write on their own slot that is out for delivery", () => {
            expect(canReportObstacle({ role: "COURIER", userId: "c-1", slot: slot() })).toEqual({ kind: "allowed" });
        });

        it("finds nothing on another courier's slot or an unassigned one", () => {
            expect(canReportObstacle({ role: "COURIER", userId: "c-2", slot: slot() })).toEqual({ kind: "not-found" });
            expect(canReportObstacle({ role: "COURIER", userId: "c-1", slot: slot({ courierId: null }) })).toEqual({
                kind: "not-found",
            });
        });

        it.each(["Terjadwal", "Disiapkan", "Selesai", "Dilewati"] as const)(
            "is refused on their own %s slot",
            status => {
                expect(canReportObstacle({ role: "COURIER", userId: "c-1", slot: slot({ status }) })).toEqual({
                    kind: "refused",
                    reason: "slot is not out for delivery",
                });
            },
        );
    });

    describe("as an admin", () => {
        it.each(["Terjadwal", "Disiapkan", "Diantar"] as const)("may write on an open %s slot", status => {
            expect(canReportObstacle({ role: "ADMIN", userId: "a-1", slot: slot({ status }) })).toEqual({
                kind: "allowed",
            });
        });

        it("may write on a slot with another courier or none", () => {
            expect(canReportObstacle({ role: "ADMIN", userId: "a-1", slot: slot({ courierId: "c-9" }) })).toEqual({
                kind: "allowed",
            });
            expect(canReportObstacle({ role: "ADMIN", userId: "a-1", slot: slot({ courierId: null }) })).toEqual({
                kind: "allowed",
            });
        });

        it.each(["Selesai", "Dilewati"] as const)("is refused on a %s slot", status => {
            expect(canReportObstacle({ role: "ADMIN", userId: "a-1", slot: slot({ status }) })).toEqual({
                kind: "refused",
                reason: "slot is already finished or skipped",
            });
        });
    });

    it.each(["COURIER", "ADMIN"] as const)("finds nothing on a pick-up slot as %s", role => {
        expect(
            canReportObstacle({ role, userId: "c-1", slot: slot({ isDelivery: false, status: "Siap Diambil" }) }),
        ).toEqual({ kind: "not-found" });
    });

    it.each(["Pending", "Expire", "Dibatalkan"] as const)("finds nothing on a %s subscription", subscriptionStatus => {
        expect(canReportObstacle({ role: "ADMIN", userId: "a-1", slot: slot({ subscriptionStatus }) })).toEqual({
            kind: "not-found",
        });
    });

    it.each(["CUSTOMER", "KITCHEN"] as const)("finds nothing for the %s role", role => {
        expect(canReportObstacle({ role, userId: "u-1", slot: slot() })).toEqual({ kind: "not-found" });
    });
});
