import { describe, expect, it } from "vitest";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const SILVER = buildTierRecord({
    id: "silver",
    name: "Silver",
    requiredSubscriptionDays: 30,
    photoKey: "tiers/s.webp",
});
const GOLD = buildTierRecord({ id: "gold", name: "Gold", requiredSubscriptionDays: 60 });

const window = {
    startedAt: Temporal.PlainDateTime.from("2026-11-01T01:00:00"),
    expiresAt: Temporal.PlainDateTime.from("2026-12-01T01:00:00"),
};

describe("TiersService.listTiers (unit)", () => {
    it("adds the effective member count, the discount total and signed badges", async () => {
        const { objectStorage, orderStats, repository, service } = setupTiersService();
        repository.listTiers.mockResolvedValue({ items: [SILVER, GOLD], total: 2 });
        repository.listAllTiers.mockResolvedValue([SILVER, GOLD]);
        repository.listMembershipWindows.mockResolvedValue([
            { tierId: "silver", ...window },
            { tierId: "silver", ...window },
            {
                tierId: "gold",
                startedAt: Temporal.PlainDateTime.from("2026-10-01T01:00:00"),
                expiresAt: Temporal.PlainDateTime.from("2026-11-02T01:00:00"),
            },
        ]);
        orderStats.sumTierDiscounts.mockResolvedValue(new Map([["silver", 12500]]));

        const page = await service.listTiers({ skip: 0, take: 10 });

        expect(page.total).toBe(2);
        expect(page.items).toMatchObject([
            {
                id: "silver",
                memberCount: 3,
                totalDiscountGiven: 12500,
                photoUrl: "https://storage.test/tiers/s.webp?signed",
            },
            { id: "gold", memberCount: 0, totalDiscountGiven: 0, photoUrl: null },
        ]);
        expect(repository.listTiers).toHaveBeenCalledWith({ skip: 0, take: 10 });
        expect(orderStats.sumTierDiscounts).toHaveBeenCalledWith(["silver", "gold"]);
        expect(objectStorage.getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("reads nothing else for an empty page", async () => {
        const { orderStats, repository, service } = setupTiersService();

        expect(await service.listTiers({ skip: 0, take: 10 })).toEqual({ items: [], total: 0 });
        expect(repository.listAllTiers).not.toHaveBeenCalled();
        expect(orderStats.sumTierDiscounts).not.toHaveBeenCalled();
    });

    it("counts 0 members and 0 discount without orders", async () => {
        const { repository, service } = setupTiersService();
        repository.listTiers.mockResolvedValue({ items: [GOLD], total: 1 });
        repository.listAllTiers.mockResolvedValue([GOLD]);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord());

        expect((await service.listTiers({ skip: 0, take: 10 })).items[0]).toMatchObject({
            memberCount: 0,
            totalDiscountGiven: 0,
        });
    });
});
