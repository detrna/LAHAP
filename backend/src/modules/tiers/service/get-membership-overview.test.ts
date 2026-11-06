import { describe, expect, it } from "vitest";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const BIASA = buildTierRecord({ id: "biasa", name: "Biasa", requiredSubscriptionDays: 0, discountPercent: 0 });
const SILVER = buildTierRecord({ id: "silver", name: "Silver", requiredSubscriptionDays: 30, discountPercent: 5 });
const GOLD = buildTierRecord({ id: "gold", name: "Gold", requiredSubscriptionDays: 60, discountPercent: 10 });

function setup(days: number) {
    const context = setupTiersService();
    context.repository.listAllTiers.mockResolvedValue([BIASA, SILVER, GOLD]);
    context.orderStats.countPaidServiceDays.mockResolvedValue(days);
    return context;
}

describe("TiersService.getMembershipOverview (unit)", () => {
    it("shows progress mid-way: the membership, days left and the next tier", async () => {
        const { orderStats, repository, service } = setup(40);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "silver", tier: SILVER }));

        const overview = await service.getMembershipOverview("user-1");

        expect(overview).toMatchObject({
            membership: { tierId: "silver", isActive: true },
            subscriptionDays: 40,
            daysRemaining: 28,
            nextTier: { id: "gold", name: "Gold" },
            daysToNextTier: 20,
        });
        expect(orderStats.countPaidServiceDays).toHaveBeenCalledWith("user-1");
    });

    it("has no next tier at the top", async () => {
        const { repository, service } = setup(100);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "gold", tier: GOLD }));

        expect(await service.getMembershipOverview("user-1")).toMatchObject({
            membership: { tierId: "gold" },
            subscriptionDays: 100,
            nextTier: null,
            daysToNextTier: null,
        });
    });

    it("works without a membership", async () => {
        const { service } = setup(0);

        expect(await service.getMembershipOverview("user-1")).toEqual({
            membership: null,
            subscriptionDays: 0,
            daysRemaining: null,
            nextTier: expect.objectContaining({ id: "silver" }),
            daysToNextTier: 30,
        });
    });

    it("reports the stepped-down tier and 0 days once the window has passed", async () => {
        const { repository, service } = setup(60);
        repository.findMembershipByUserId.mockResolvedValue(
            buildMembershipRecord({
                tierId: "silver",
                tier: SILVER,
                startedAt: Temporal.PlainDateTime.from("2026-08-01T01:00:00"),
                expiresAt: Temporal.PlainDateTime.from("2026-09-01T01:00:00"),
            }),
        );

        expect(await service.getMembershipOverview("user-1")).toMatchObject({
            membership: { tierId: "biasa", isActive: false },
            daysRemaining: 0,
        });
    });
});
